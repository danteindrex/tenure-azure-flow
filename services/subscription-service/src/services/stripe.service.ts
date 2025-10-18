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
      const { memberId, successUrl, cancelUrl } = data;

      // Get member details
      const memberQuery = 'SELECT * FROM member WHERE id = $1';
      const memberResult = await pool.query(memberQuery, [memberId]);

      if (memberResult.rows.length === 0) {
        throw new Error('Member not found');
      }

      const member = memberResult.rows[0];

      // Check if member already has active subscription
      const existingSub = await SubscriptionModel.findByMemberId(memberId);
      if (existingSub && existingSub.status === 'active') {
        throw new Error('Member already has an active subscription');
      }

      // Create or retrieve Stripe customer
      let customer: Stripe.Customer;
      const existingCustomers = await stripe.customers.list({
        email: member.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: member.email,
          name: member.name,
          metadata: {
            memberId: memberId.toString(),
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
            memberId: memberId.toString(),
          },
        },
        success_url: successUrl || `${config.frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${config.frontendUrl}/signup?canceled=true`,
        metadata: {
          memberId: memberId.toString(),
          paymentType: 'subscription_with_setup_fee',
        },
        allow_promotion_codes: true,
      });

      logger.info(`Checkout session created for member ${memberId}`, {
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
      const memberId = parseInt(session.metadata!.memberId);
      const subscriptionId = session.subscription as string;

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update member status to Active
      const updateMemberQuery = `
        UPDATE member 
        SET status = 'Active', updated_at = NOW() 
        WHERE id = $1
      `;
      await pool.query(updateMemberQuery, [memberId]);

      // Create subscription record in database
      const subscriptionQuery = `
        INSERT INTO financial_schedules (member_id, billing_cycle, next_billing_date, amount, currency, is_active, created_at)
        VALUES ($1, 'MONTHLY', $2, $3, $4, true, NOW())
        RETURNING id
      `;
      
      const nextBillingDate = new Date(subscription.current_period_end * 1000);
      await pool.query(subscriptionQuery, [
        memberId,
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
        memberId,
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
      await pool.query(queueQuery, [memberId]);

      // Create member agreement records
      const agreementQuery = `
        INSERT INTO member_agreements (member_id, agreement_type, version_number, agreed_at_ts, created_at)
        VALUES 
          ($1, 'TERMS_CONDITIONS', '1.0', NOW(), NOW()),
          ($1, 'PAYMENT_AUTHORIZATION', '1.0', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `;
      await pool.query(agreementQuery, [memberId]);

      logger.info(`Initial payment + subscription created for member ${memberId}`, {
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
        memberid: dbSubscription.memberid,
        subscriptionid: dbSubscription.subscriptionid,
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
      const payments = await PaymentModel.findByMemberId(dbSubscription.memberid);
      const totalMonths = payments.filter(p => p.status === 'succeeded').length;
      const lifetimeTotal = await PaymentModel.getTotalPaidByMember(dbSubscription.memberid);

      // Update queue stats
      await QueueModel.updatePaymentStats(
        dbSubscription.memberid,
        totalMonths,
        lifetimeTotal,
        new Date()
      );

      logger.info(`Payment recorded for member ${dbSubscription.memberid}`, {
        paymentId: payment.paymentid,
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
      await SubscriptionModel.update(dbSubscription.subscriptionid, {
        status: subscription.status as any,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      } as any);

      // Update queue subscription status
      const isActive = ['active', 'trialing'].includes(subscription.status);
      await QueueModel.updateSubscriptionStatus(dbSubscription.memberid, isActive);

      logger.info(`Subscription updated for member ${dbSubscription.memberid}`, {
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
      await SubscriptionModel.cancelSubscription(dbSubscription.subscriptionid);

      // Update queue subscription status to inactive
      await QueueModel.updateSubscriptionStatus(dbSubscription.memberid, false);

      logger.info(`Subscription canceled for member ${dbSubscription.memberid}`);
    } catch (error) {
      logger.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(memberId: number, immediately: boolean = false): Promise<void> {
    try {
      const dbSubscription = await SubscriptionModel.findByMemberId(memberId);

      if (!dbSubscription) {
        throw new Error('No active subscription found');
      }

      if (immediately) {
        // Cancel immediately
        await stripe.subscriptions.cancel(dbSubscription.stripe_subscription_id);
      } else {
        // Cancel at period end
        await stripe.subscriptions.update(dbSubscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      }

      logger.info(`Subscription cancellation requested for member ${memberId}`, {
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
  static async reactivateSubscription(memberId: number): Promise<void> {
    try {
      const dbSubscription = await SubscriptionModel.findByMemberId(memberId);

      if (!dbSubscription) {
        throw new Error('No subscription found');
      }

      if (dbSubscription.status === 'canceled') {
        throw new Error('Cannot reactivate a canceled subscription. Please create a new subscription.');
      }

      // Update subscription to remove cancellation
      await stripe.subscriptions.update(dbSubscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      logger.info(`Subscription reactivated for member ${memberId}`);
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(memberId: number) {
    const dbSubscription = await SubscriptionModel.findByMemberId(memberId);

    if (!dbSubscription) {
      return null;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      dbSubscription.stripe_subscription_id
    );

    return {
      subscription: dbSubscription,
      stripeSubscription,
    };
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(memberId: number) {
    return PaymentModel.findByMemberId(memberId);
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
