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
        // Apple Pay and Google Pay are automatically enabled with 'card' type
        // They will show up based on user's device and browser capabilities
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
      const userId = session.metadata!.userId; // UUID string, not integer
      const subscriptionId = session.subscription as string;

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update user status to Active
      const updateUserQuery = `
        UPDATE users
        SET status = 'Active', updated_at = NOW()
        WHERE id = $1
      `;
      await pool.query(updateUserQuery, [userId]);

      // Also notify the main app about payment completion
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/onboarding/update-progress`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
          },
          body: JSON.stringify({
            step: 'payment-completed',
            userId: userId
          })
        });
      } catch (error) {
        console.warn('Failed to notify main app about payment completion:', error);
        // Don't fail the webhook if this fails
      }

      // Create subscription record in database
      const subscriptionQuery = `
        INSERT INTO user_subscriptions (
          user_id, provider, provider_subscription_id, provider_customer_id,
          status, current_period_start, current_period_end
        )
        VALUES ($1, 'stripe', $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const subscriptionResult = await pool.query(subscriptionQuery, [
        userId,
        subscription.id,
        subscription.customer,
        subscription.status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000)
      ]);

      // Create billing schedule
      const billingQuery = `
        INSERT INTO user_billing_schedules (user_id, subscription_id, billing_cycle, next_billing_date, amount, currency, is_active, created_at)
        VALUES ($1, $2, 'MONTHLY', $3, $4, $5, true, NOW())
        RETURNING id
      `;
      
      const nextBillingDate = new Date(subscription.current_period_end * 1000);
      await pool.query(billingQuery, [
        userId,
        subscriptionResult.rows[0].id,
        nextBillingDate,
        config.pricing.recurringAmount,
        config.pricing.currency.toUpperCase()
      ]);

      // Store payment method info
      const paymentMethodQuery = `
        INSERT INTO user_payment_methods (user_id, method_type, provider_payment_method_id, is_default, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;
      
      await pool.query(paymentMethodQuery, [
        userId,
        'card',
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

      // Add member to queue with payment stats
      const queueQuery = `
        INSERT INTO membership_queue (
          user_id, queue_position, joined_queue_at, is_eligible, 
          subscription_active, total_months_subscribed, lifetime_payment_total,
          last_payment_date, created_at
        )
        VALUES (
          $1, 
          (SELECT COALESCE(MAX(queue_position), 0) + 1 FROM membership_queue), 
          NOW(), 
          true, 
          true, 
          0, 
          0.00, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          subscription_active = true,
          total_months_subscribed = 0,
          lifetime_payment_total = 0.00,
          last_payment_date = NOW(),
          updated_at = NOW()
      `;
      await pool.query(queueQuery, [userId]);

      // Get the actual invoice details from Stripe
      let initialPaymentAmount = config.pricing.initialAmount;
      let paymentIntentId = null;
      let chargeId = null;
      let receiptUrl = null;
      let paymentMethodId = null;
      let paymentMethodDetails = null;

      if (subscription.latest_invoice) {
        try {
          const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
          initialPaymentAmount = invoice.amount_paid / 100; // Convert from cents
          paymentIntentId = invoice.payment_intent as string;
          chargeId = invoice.charge as string;
          receiptUrl = invoice.hosted_invoice_url || null;

          // Get payment method details
          if (paymentIntentId) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

              if (paymentIntent.payment_method) {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);

                // Store payment method details for metadata
                paymentMethodDetails = {
                  id: paymentMethod.id,
                  type: paymentMethod.type,
                  ...(paymentMethod.card && {
                    card: {
                      brand: paymentMethod.card.brand,
                      last4: paymentMethod.card.last4,
                      exp_month: paymentMethod.card.exp_month,
                      exp_year: paymentMethod.card.exp_year,
                      funding: paymentMethod.card.funding,
                      country: paymentMethod.card.country
                    }
                  })
                };

                // Check if we have this payment method stored
                const pmQuery = `SELECT id FROM user_payment_methods WHERE provider_payment_method_id = $1 AND user_id = $2`;
                const pmResult = await pool.query(pmQuery, [paymentMethod.id, userId]);

                if (pmResult.rows.length > 0) {
                  paymentMethodId = pmResult.rows[0].id;

                  // Update the existing payment method to be default and update details
                  await pool.query(`
                    UPDATE user_payment_methods
                    SET is_default = true, last_four = $2, brand = $3, expires_month = $4, expires_year = $5,
                        method_subtype = $6, metadata = $7, updated_at = NOW()
                    WHERE id = $1
                  `, [
                    paymentMethodId,
                    paymentMethod.card?.last4,
                    paymentMethod.card?.brand,
                    paymentMethod.card?.exp_month,
                    paymentMethod.card?.exp_year,
                    paymentMethod.card?.brand,
                    JSON.stringify({
                      funding: paymentMethod.card?.funding,
                      country: paymentMethod.card?.country,
                      fingerprint: paymentMethod.card?.fingerprint
                    })
                  ]);
                } else if (paymentMethod.card) {
                  // Store new payment method with proper card details
                  const insertPmQuery = `
                    INSERT INTO user_payment_methods (
                      user_id, provider, method_type, method_subtype, provider_payment_method_id,
                      last_four, brand, expires_month, expires_year, is_default, is_active, metadata
                    )
                    VALUES ($1, 'stripe', 'card', $2, $3, $4, $5, $6, $7, true, true, $8)
                    RETURNING id
                  `;
                  const pmInsertResult = await pool.query(insertPmQuery, [
                    userId,
                    paymentMethod.card.brand,
                    paymentMethod.id,
                    paymentMethod.card.last4,
                    paymentMethod.card.brand,
                    paymentMethod.card.exp_month,
                    paymentMethod.card.exp_year,
                    JSON.stringify({
                      funding: paymentMethod.card.funding,
                      country: paymentMethod.card.country,
                      fingerprint: paymentMethod.card.fingerprint
                    })
                  ]);
                  paymentMethodId = pmInsertResult.rows[0].id;
                }
              }
            } catch (pmError) {
              logger.warn('Could not retrieve payment method for initial payment:', pmError);
            }
          }
        } catch (error) {
          logger.warn('Could not retrieve invoice details, using config amount', error);
        }
      }

      // Build metadata for initial payment
      const initialPaymentMetadata = {
        checkout_session_id: session.id,
        subscription_created: true,
        initial_payment: true,
        payment_method: paymentMethodDetails,
        setup_fee: config.pricing.initialAmount - config.pricing.recurringAmount,
        monthly_amount: config.pricing.recurringAmount
      };

      // Create initial payment record with real Stripe data
      const paymentQuery = `
        INSERT INTO user_payments (
          user_id, subscription_id, payment_method_id, provider_payment_id, provider_invoice_id,
          provider_charge_id, amount, currency, payment_type, status, is_first_payment, receipt_url, metadata, payment_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'initial', 'succeeded', true, $9, $10, NOW())
        RETURNING id
      `;

      await pool.query(paymentQuery, [
        userId,
        subscriptionResult.rows[0].id,
        paymentMethodId,
        paymentIntentId,
        subscription.latest_invoice,
        chargeId,
        initialPaymentAmount,
        subscription.currency || config.pricing.currency,
        receiptUrl,
        JSON.stringify(initialPaymentMetadata)
      ]);

      // Update queue stats with actual payment data
      const updateQueueStatsQuery = `
        UPDATE membership_queue 
        SET 
          total_months_subscribed = 1,
          lifetime_payment_total = $2,
          last_payment_date = NOW(),
          updated_at = NOW()
        WHERE user_id = $1
      `;
      await pool.query(updateQueueStatsQuery, [userId, initialPaymentAmount]);

      // Create user agreement records
      const agreementQuery = `
        INSERT INTO user_agreements (user_id, agreement_type, version_number, agreed_at, created_at)
        VALUES 
          ($1, 'terms_of_service', '1.0', NOW(), NOW()),
          ($1, 'payment_authorization', '1.0', NOW(), NOW())
        ON CONFLICT (user_id, agreement_type, version_number) DO NOTHING
      `;
      await pool.query(agreementQuery, [userId]);

      logger.info(`Initial payment + subscription created for member ${userId}`, {
        subscriptionId: subscription.id,
        actualPaymentAmount: initialPaymentAmount,
        configuredInitialAmount: config.pricing.initialAmount,
        monthlyRecurring: config.pricing.recurringAmount,
        nextBilling: nextBillingDate,
        currency: subscription.currency || config.pricing.currency
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

      // Get payment method details from Stripe
      let paymentMethodId = null;
      let paymentMethodDetails = null;

      if (invoice.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);

          if (paymentIntent.payment_method) {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);

            // Store payment method details for metadata
            paymentMethodDetails = {
              id: paymentMethod.id,
              type: paymentMethod.type,
              ...(paymentMethod.card && {
                card: {
                  brand: paymentMethod.card.brand,
                  last4: paymentMethod.card.last4,
                  exp_month: paymentMethod.card.exp_month,
                  exp_year: paymentMethod.card.exp_year,
                  funding: paymentMethod.card.funding,
                  country: paymentMethod.card.country
                }
              })
            };

            // Check if we have this payment method stored in user_payment_methods table
            const pmQuery = `SELECT id FROM user_payment_methods WHERE provider_payment_method_id = $1 AND user_id = $2`;
            const pmResult = await pool.query(pmQuery, [paymentMethod.id, dbSubscription.user_id]);

            if (pmResult.rows.length > 0) {
              paymentMethodId = pmResult.rows[0].id;
            } else if (paymentMethod.card) {
              // Store new payment method
              const insertPmQuery = `
                INSERT INTO user_payment_methods (
                  user_id, provider, method_type, method_subtype, provider_payment_method_id,
                  last_four, brand, expires_month, expires_year, is_default, is_active, metadata
                )
                VALUES ($1, 'stripe', 'card', $2, $3, $4, $5, $6, $7, false, true, $8)
                RETURNING id
              `;
              const pmInsertResult = await pool.query(insertPmQuery, [
                dbSubscription.user_id,
                paymentMethod.card.brand,
                paymentMethod.id,
                paymentMethod.card.last4,
                paymentMethod.card.brand,
                paymentMethod.card.exp_month,
                paymentMethod.card.exp_year,
                JSON.stringify({
                  funding: paymentMethod.card.funding,
                  country: paymentMethod.card.country,
                  fingerprint: paymentMethod.card.fingerprint
                })
              ]);
              paymentMethodId = pmInsertResult.rows[0].id;
            }
          }
        } catch (error) {
          logger.warn('Could not retrieve payment method details:', error);
        }
      }

      // Build metadata object with invoice and payment details
      const paymentMetadata = {
        invoice_metadata: invoice.metadata || {},
        billing_reason: invoice.billing_reason,
        subscription_id: invoice.subscription,
        customer_id: invoice.customer,
        invoice_number: invoice.number || null,
        payment_method: paymentMethodDetails,
        attempt_count: invoice.attempt_count || 1
      };

      // Create payment record in user_payments table
      const paymentQuery = `
        INSERT INTO user_payments (
          user_id, subscription_id, payment_method_id, provider_payment_id, provider_invoice_id,
          provider_charge_id, amount, currency, payment_type, status, is_first_payment, receipt_url, metadata, payment_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'succeeded', $10, $11, $12, NOW())
        RETURNING id
      `;

      const paymentResult = await pool.query(paymentQuery, [
        dbSubscription.user_id,  // UUID - no parseInt needed
        dbSubscription.id,       // UUID - no parseInt needed
        paymentMethodId,         // UUID or null
        invoice.payment_intent as string,
        invoice.id,
        invoice.charge as string,
        amount,
        invoice.currency,
        isFirstPayment ? 'initial' : 'recurring',
        isFirstPayment,
        invoice.hosted_invoice_url || null,
        JSON.stringify(paymentMetadata)
      ]);

      // Calculate total months subscribed and lifetime total
      const paymentsQuery = `
        SELECT * FROM user_payments
        WHERE user_id = $1
        ORDER BY payment_date DESC
      `;
      const paymentsResult = await pool.query(paymentsQuery, [dbSubscription.user_id]);
      const payments = paymentsResult.rows;
      const totalMonths = payments.filter((p: any) => p.status === 'succeeded').length;

      const lifetimeTotalQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM user_payments
        WHERE user_id = $1 AND status = 'succeeded'
      `;
      const lifetimeTotalResult = await pool.query(lifetimeTotalQuery, [dbSubscription.user_id]);
      const lifetimeTotal = parseFloat(lifetimeTotalResult.rows[0].total);

      // Update queue stats
      const updateQueueStatsQuery = `
        UPDATE membership_queue
        SET
          total_months_subscribed = $2,
          lifetime_payment_total = $3,
          last_payment_date = $4,
          updated_at = NOW()
        WHERE user_id = $1
      `;
      await pool.query(updateQueueStatsQuery, [
        dbSubscription.user_id,
        totalMonths,
        lifetimeTotal,
        new Date()
      ]);

      logger.info(`Payment recorded for member ${dbSubscription.user_id}`, {
        paymentId: paymentResult.rows[0]?.id,
        amount,
        isFirstPayment,
        totalMonths,
        lifetimeTotal,
      });
    } catch (error) {
      logger.error('Error handling invoice payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle invoice payment failed
   */
  static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;
      const dbSubscription = await SubscriptionModel.findByStripeSubscriptionId(subscriptionId);

      if (!dbSubscription) {
        logger.warn(`Subscription not found for failed invoice ${invoice.id}`);
        return;
      }

      const isFirstPayment = invoice.metadata?.isFirstPayment === 'true' || invoice.billing_reason === 'subscription_create';
      const amount = invoice.amount_due / 100; // Convert from cents

      // Get payment method and failure details
      let paymentMethodId = null;
      let paymentMethodDetails = null;
      let failureReason = null;

      if (invoice.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);

          // Get failure details
          if (paymentIntent.last_payment_error) {
            failureReason = [
              paymentIntent.last_payment_error.code,
              paymentIntent.last_payment_error.decline_code,
              paymentIntent.last_payment_error.message
            ].filter(Boolean).join(' - ');
          }

          // Get payment method details
          if (paymentIntent.payment_method) {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);

            paymentMethodDetails = {
              id: paymentMethod.id,
              type: paymentMethod.type,
              ...(paymentMethod.card && {
                card: {
                  brand: paymentMethod.card.brand,
                  last4: paymentMethod.card.last4,
                  exp_month: paymentMethod.card.exp_month,
                  exp_year: paymentMethod.card.exp_year,
                  funding: paymentMethod.card.funding,
                  country: paymentMethod.card.country
                }
              })
            };

            // Check if we have this payment method stored
            const pmQuery = `SELECT id FROM user_payment_methods WHERE provider_payment_method_id = $1 AND user_id = $2`;
            const pmResult = await pool.query(pmQuery, [paymentMethod.id, dbSubscription.user_id]);

            if (pmResult.rows.length > 0) {
              paymentMethodId = pmResult.rows[0].id;
            }
          }
        } catch (error) {
          logger.warn('Could not retrieve payment intent for failed payment:', error);
          failureReason = 'Unable to retrieve failure details';
        }
      }

      // Build metadata for failed payment
      const paymentMetadata = {
        invoice_metadata: invoice.metadata || {},
        billing_reason: invoice.billing_reason,
        subscription_id: invoice.subscription,
        customer_id: invoice.customer,
        invoice_number: invoice.number || null,
        payment_method: paymentMethodDetails,
        attempt_count: invoice.attempt_count || 1,
        next_payment_attempt: invoice.next_payment_attempt,
        failure_details: failureReason
      };

      // Record failed payment attempt
      const paymentQuery = `
        INSERT INTO user_payments (
          user_id, subscription_id, payment_method_id, provider_payment_id, provider_invoice_id,
          provider_charge_id, amount, currency, payment_type, status, is_first_payment,
          failure_reason, metadata, payment_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'failed', $10, $11, $12, NOW())
        RETURNING id
      `;

      const paymentResult = await pool.query(paymentQuery, [
        dbSubscription.user_id,
        dbSubscription.id,
        paymentMethodId,
        invoice.payment_intent as string,
        invoice.id,
        invoice.charge as string,
        amount,
        invoice.currency,
        isFirstPayment ? 'initial' : 'recurring',
        isFirstPayment,
        failureReason,
        JSON.stringify(paymentMetadata)
      ]);

      logger.error(`Payment FAILED for member ${dbSubscription.user_id}`, {
        paymentId: paymentResult.rows[0]?.id,
        amount,
        isFirstPayment,
        failureReason,
        attemptCount: invoice.attempt_count,
        nextAttempt: invoice.next_payment_attempt
      });

      // TODO: Consider sending notification email to user about payment failure
      // TODO: If too many failures, consider suspending subscription

    } catch (error) {
      logger.error('Error handling invoice payment failed:', error);
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

      // Note: No need to manually remove from queue - the active_member_queue_view
      // automatically excludes users with inactive subscriptions
      const isActive = ['active', 'trialing'].includes(subscription.status);
      if (!isActive) {
        logger.info(`User ${dbSubscription.user_id} subscription inactive - will be automatically excluded from queue view`);
      }

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

      // Note: No need to manually remove from queue - the active_member_queue_view
      // automatically excludes users with canceled subscriptions
      logger.info(`User ${dbSubscription.user_id} subscription canceled - will be automatically excluded from queue view`);

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
