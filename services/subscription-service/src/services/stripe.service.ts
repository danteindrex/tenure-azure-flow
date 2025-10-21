import Stripe from 'stripe';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { SubscriptionModel } from '../models/subscription.model';
import { PaymentModel } from '../models/payment.model';
import { QueueModel } from '../models/queue.model';
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '../types';
import { pool } from '../config/database';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export class StripeService {
  /**
   * Create a Stripe Checkout Session for subscription
   */
  static async createCheckoutSession(
    data: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      const { userId, successUrl, cancelUrl } = data;

      // Get user details from normalized schema
      const userQuery = `
        SELECT u.*, p.first_name, p.last_name, c.contact_value as phone
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        LEFT JOIN user_contacts c ON u.id = c.user_id AND c.contact_type = 'phone' AND c.is_primary = true
        WHERE u.id = $1
      `;
      const userResult = await pool.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Check if user already has active subscription
      const existingSub = await SubscriptionModel.findByUserId(userId);
      if (existingSub && existingSub.status === 'active') {
        throw new Error('User already has an active subscription');
      }

      // Create or retrieve Stripe customer
      let customer: Stripe.Customer;
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
          metadata: {
            userId: userId.toString(),
          },
        });
      }

      // Create checkout session with both setup fee and subscription
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          // Setup fee (one-time)
          {
            price_data: {
              currency: config.pricing.currency,
              unit_amount: Math.round((config.pricing.initialAmount - config.pricing.recurringAmount) * 100), // $275 setup fee
              product_data: {
                name: 'Tenure Membership Setup Fee',
              },
            },
            quantity: 1,
          },
          // Monthly subscription
          {
            price_data: {
              currency: config.pricing.currency,
              unit_amount: Math.round(config.pricing.recurringAmount * 100), // $25
              recurring: {
                interval: 'month',
              },
              product_data: {
                name: 'Tenure Monthly Subscription',
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            userId: userId.toString(),
          },
        },
        success_url: successUrl || `${config.frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${config.frontendUrl}/signup?canceled=true`,
        metadata: {
          userId: userId.toString(),
          paymentType: 'subscription_with_setup_fee',
        },
        allow_promotion_codes: true,
      });

      logger.info(`Checkout session created for member ${userId}`, {
        sessionId: session.id,
        customerId: customer.id,
      });

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Handle successful checkout session (initial payment + subscription setup)
   */
  static async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = parseInt(session.metadata!.userId);
      const subscriptionId = session.subscription as string;

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update member status to Active
      const updateMemberQuery = `
        UPDATE member 
        SET status = 'Active', updated_at = NOW() 
        WHERE id = $1
      `;
      await pool.query(updateMemberQuery, [userId]);

      // Create subscription record in database
      const subscriptionQuery = `
        INSERT INTO financial_schedules (member_id, billing_cycle, next_billing_date, amount, currency, is_active, created_at)
        VALUES ($1, 'MONTHLY', $2, $3, $4, true, NOW())
        RETURNING id
      `;
      
      const nextBillingDate = new Date(subscription.current_period_end * 1000);
      await pool.query(subscriptionQuery, [
        userId,
        nextBillingDate,
        config.pricing.recurringAmount,
        config.pricing.currency.toUpperCase()
      ]);

      // Store payment method info
      const paymentMethodQuery = `
        INSERT INTO payment_methods (member_id, method_type, source_token, is_default, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;
      
      await pool.query(paymentMethodQuery, [
        userId,
        'CREDIT_CARD',
        subscription.id,
        true,
        JSON.stringify({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          initial_amount: config.pricing.initialAmount,
          recurring_amount: config.pricing.recurringAmount,
          currency: config.pricing.currency,
          status: subscription.status
        })
      ]);

      // Add member to queue
      const queueQuery = `
        INSERT INTO queue_entries (member_id, queue_position, joined_queue_at, is_eligible, created_at)
        VALUES ($1, (SELECT COALESCE(MAX(queue_position), 0) + 1 FROM queue_entries), NOW(), true, NOW())
        ON CONFLICT (member_id) DO NOTHING
      `;
      await pool.query(queueQuery, [userId]);

      // Create member agreement records
      const agreementQuery = `
        INSERT INTO member_agreements (member_id, agreement_type, version_number, agreed_at_ts, created_at)
        VALUES 
          ($1, 'TERMS_CONDITIONS', '1.0', NOW(), NOW()),
          ($1, 'PAYMENT_AUTHORIZATION', '1.0', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `;
      await pool.query(agreementQuery, [userId]);

      logger.info(`Initial payment + subscription created for member ${userId}`, {
        subscriptionId: subscription.id,
        initialPayment: config.pricing.initialAmount, // $300 (includes first month)
        monthlyRecurring: config.pricing.recurringAmount, // $25
        nextBilling: nextBillingDate,
        setupFee: config.pricing.initialAmount - config.pricing.recurringAmount, // $275
      });
    } catch (error) {
      logger.error('Error handling checkout complete:', error);
      throw error;
    }
  }

  /**
   * Handle invoice payment succeeded
   */
  static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;
      const dbSubscription = await SubscriptionModel.findByStripeSubscriptionId(subscriptionId);

      if (!dbSubscription) {
        logger.warn(`Subscription not found for invoice ${invoice.id}`);
        return;
      }

      const isFirstPayment = invoice.metadata?.isFirstPayment === 'true' || invoice.billing_reason === 'subscription_create';
      const amount = invoice.amount_paid / 100; // Convert from cents

      // Create payment record
      const payment = await PaymentModel.create({
        memberid: parseInt(dbSubscription.user_id),
        subscription_id: dbSubscription.id,
        stripe_payment_intent_id: invoice.payment_intent as string,
        stripe_invoice_id: invoice.id,
        stripe_charge_id: invoice.charge as string,
        amount: amount,
        currency: invoice.currency,
        payment_type: isFirstPayment ? 'initial' : 'recurring',
        status: 'succeeded',
        is_first_payment: isFirstPayment,
        receipt_url: invoice.hosted_invoice_url || undefined,
      });

      // Calculate total months subscribed and lifetime total
      const payments = await PaymentModel.findByMemberId(parseInt(dbSubscription.user_id));
      const totalMonths = payments.filter(p => p.status === 'succeeded').length;
      const lifetimeTotal = await PaymentModel.getTotalPaidByMember(parseInt(dbSubscription.user_id));

      // Update queue stats
      await QueueModel.updatePaymentStats(
        parseInt(dbSubscription.user_id),
        totalMonths,
        lifetimeTotal,
        new Date()
      );

      logger.info(`Payment recorded for member ${dbSubscription.user_id}`, {
        paymentId: payment.id,
        amount,
        isFirstPayment,
      });
    } catch (error) {
      logger.error('Error handling invoice payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated
   */
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const dbSubscription = await SubscriptionModel.findByStripeSubscriptionId(subscription.id);

      if (!dbSubscription) {
        logger.warn(`Subscription not found for update: ${subscription.id}`);
        return;
      }

      // Update subscription in database
      await SubscriptionModel.update(dbSubscription.id, {
        status: subscription.status as any,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      } as any);

      // Update queue subscription status
      const isActive = ['active', 'trialing'].includes(subscription.status);
      await QueueModel.updateSubscriptionStatus(parseInt(dbSubscription.user_id), isActive);

      logger.info(`Subscription updated for member ${dbSubscription.user_id}`, {
        status: subscription.status,
      });
    } catch (error) {
      logger.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted/canceled
   */
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const dbSubscription = await SubscriptionModel.findByStripeSubscriptionId(subscription.id);

      if (!dbSubscription) {
        logger.warn(`Subscription not found for deletion: ${subscription.id}`);
        return;
      }

      // Update subscription status
      await SubscriptionModel.cancelSubscription(dbSubscription.id);

      // Update queue subscription status to inactive
      await QueueModel.updateSubscriptionStatus(parseInt(dbSubscription.user_id), false);

      logger.info(`Subscription canceled for member ${dbSubscription.user_id}`);
    } catch (error) {
      logger.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(userId: number, immediately: boolean = false): Promise<void> {
    try {
      const dbSubscription = await SubscriptionModel.findByUserId(userId.toString());

      if (!dbSubscription) {
        throw new Error('No active subscription found');
      }

      if (immediately) {
        // Cancel immediately
        await stripe.subscriptions.cancel(dbSubscription.provider_subscription_id);
      } else {
        // Cancel at period end
        await stripe.subscriptions.update(dbSubscription.provider_subscription_id, {
          cancel_at_period_end: true,
        });
      }

      logger.info(`Subscription cancellation requested for member ${userId}`, {
        immediately,
      });
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate a subscription
   */
  static async reactivateSubscription(userId: number): Promise<void> {
    try {
      const dbSubscription = await SubscriptionModel.findByUserId(userId.toString());

      if (!dbSubscription) {
        throw new Error('No subscription found');
      }

      if (dbSubscription.status === 'canceled') {
        throw new Error('Cannot reactivate a canceled subscription. Please create a new subscription.');
      }

      // Update subscription to remove cancellation
      await stripe.subscriptions.update(dbSubscription.provider_subscription_id, {
        cancel_at_period_end: false,
      });

      logger.info(`Subscription reactivated for member ${userId}`);
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(userId: number) {
    const dbSubscription = await SubscriptionModel.findByUserId(userId.toString());

    if (!dbSubscription) {
      return null;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      dbSubscription.provider_subscription_id
    );

    return {
      subscription: dbSubscription,
      stripeSubscription,
    };
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(userId: number) {
    return PaymentModel.findByMemberId(userId);
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    if (!config.stripe.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  }
}
