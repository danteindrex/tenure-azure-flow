import Stripe from 'stripe';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { SubscriptionModel } from '../models/subscription.model';
import { PaymentModel } from '../models/payment.model';
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '../types';
import { pool } from '../config/database';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-10-29.clover',
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

      // Note: Users can have multiple active subscriptions
      // Each subscription creates its own membership (queue entry)

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

      // Create checkout session for joining fee payment + setup payment method
      // Note: Mixed interval subscriptions cannot be created via Checkout Sessions
      // We'll collect payment for joining fee and setup payment method, then create subscription via API
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'payment',
        payment_method_types: ['card'],
        // Apple Pay and Google Pay are automatically enabled with 'card' type
        line_items: [
          // Joining fee (one-time) - $325 (includes first month $25 + first year $300)
          {
            price_data: {
              currency: config.pricing.currency,
              unit_amount: Math.round(config.pricing.initialAmount * 100), // $325
              product_data: {
                name: 'Tenure Membership Joining Fee',
                description: 'One-time joining fee - includes first month ($25) and first year ($300). Recurring: $25/month + $300/year starting next period.',
              },
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          setup_future_usage: 'off_session', // Save payment method for future charges
          metadata: {
            userId: userId.toString(),
            paymentType: 'initial_payment_with_subscription_setup',
          },
        },
        success_url: successUrl || `${config.frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${config.frontendUrl}/signup?canceled=true`,
        metadata: {
          userId: userId.toString(),
          paymentType: 'mixed_interval_subscription_setup',
          joiningFee: config.pricing.initialAmount.toString(),
          monthlyFee: config.pricing.recurringAmount.toString(),
          annualFee: config.pricing.annualAmount.toString(),
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
   * Creates mixed interval subscription after payment is collected
   */
  static async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata!.userId; // UUID string, not integer

      // Get payment intent to retrieve payment method and charge details
      const paymentIntentId = session.payment_intent as string;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge']
      });
      const paymentMethodId = paymentIntent.payment_method as string;

      // Create mixed interval subscription using API (not Checkout Session)
      // This is required because Checkout Sessions don't support mixed intervals
      // First, create or retrieve product and prices

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        currency: config.pricing.currency,
        unit_amount: Math.round(config.pricing.recurringAmount * 100), // $25
        recurring: { interval: 'month' },
        product_data: {
          name: 'Tenure Monthly Subscription',
        },
      });

      // Create annual price
      const annualPrice = await stripe.prices.create({
        currency: config.pricing.currency,
        unit_amount: Math.round(config.pricing.annualAmount * 100), // $300
        recurring: { interval: 'year' },
        product_data: {
          name: 'Tenure Annual Subscription',
        },
      });

      // Create subscription with both prices
      const subscription = await stripe.subscriptions.create({
        customer: session.customer as string,
        items: [
          { price: monthlyPrice.id },
          { price: annualPrice.id },
        ],
        default_payment_method: paymentMethodId,
        metadata: {
          userId: userId.toString(),
          subscriptionType: 'mixed_interval',
        },
        proration_behavior: 'none',
      });

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
      // Note: In Stripe API v2025+, current_period_start/end are on subscription items, not the subscription itself
      // For mixed intervals, each item has its own billing cycle. We'll use the earliest start and latest end.
      const subscriptionItems = subscription.items.data;
      const earliestPeriodStart = Math.min(...subscriptionItems.map(item => item.current_period_start));
      const latestPeriodEnd = Math.max(...subscriptionItems.map(item => item.current_period_end));

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
        new Date(earliestPeriodStart * 1000),
        new Date(latestPeriodEnd * 1000)
      ]);

      // Create billing schedules for both monthly and annual intervals
      // Populate billing dates directly from Stripe response (current_period_end on each item)
      // Get billing dates from each subscription item (monthly and annual have different cycles)

      logger.info('Subscription items for billing schedule creation:', {
        userId,
        subscriptionId: subscription.id,
        itemCount: subscriptionItems.length,
        items: subscriptionItems.map(item => ({
          id: item.id,
          priceId: item.price.id,
          interval: item.price.recurring?.interval,
          amount: item.price.unit_amount
        }))
      });

      const monthlyItem = subscriptionItems.find(item =>
        item.price.recurring?.interval === 'month'
      );
      const annualItem = subscriptionItems.find(item =>
        item.price.recurring?.interval === 'year'
      );

      logger.info('Found billing items:', {
        hasMonthly: !!monthlyItem,
        hasAnnual: !!annualItem,
        monthlyInterval: monthlyItem?.price.recurring?.interval,
        annualInterval: annualItem?.price.recurring?.interval
      });

      // Monthly billing schedule - populated from Stripe subscription item
      if (monthlyItem) {
        const monthlyBillingQuery = `
          INSERT INTO user_billing_schedules (user_id, subscription_id, billing_cycle, next_billing_date, amount, currency, is_active, created_at)
          VALUES ($1, $2, 'MONTHLY', $3, $4, $5, true, NOW())
          RETURNING id
        `;

        // Use Stripe's current_period_end directly (no calculation needed)
        const nextMonthlyBillingDate = new Date(monthlyItem.current_period_end * 1000);
        await pool.query(monthlyBillingQuery, [
          userId,
          subscriptionResult.rows[0].id,
          nextMonthlyBillingDate,
          config.pricing.recurringAmount,
          config.pricing.currency.toUpperCase()
        ]);
      }

      // Annual billing schedule - populated from Stripe subscription item
      if (annualItem) {
        const annualBillingQuery = `
          INSERT INTO user_billing_schedules (user_id, subscription_id, billing_cycle, next_billing_date, amount, currency, is_active, created_at)
          VALUES ($1, $2, 'YEARLY', $3, $4, $5, true, NOW())
          RETURNING id
        `;

        // Use Stripe's current_period_end directly (no calculation needed)
        const nextAnnualBillingDate = new Date(annualItem.current_period_end * 1000);

        await pool.query(annualBillingQuery, [
          userId,
          subscriptionResult.rows[0].id,
          nextAnnualBillingDate,
          config.pricing.annualAmount,
          config.pricing.currency.toUpperCase()
        ]);

        logger.info('Created YEARLY billing schedule', {
          userId,
          nextBillingDate: nextAnnualBillingDate.toISOString(),
          amount: config.pricing.annualAmount
        });
      } else {
        logger.error('CRITICAL: Annual item not found in subscription items!', {
          userId,
          subscriptionId: subscription.id,
          itemCount: subscriptionItems.length
        });
      }

      // Store payment method info
      const paymentMethodQuery = `
        INSERT INTO user_payment_methods (user_id, method_type, provider_payment_method_id, is_default, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;
      
      await pool.query(paymentMethodQuery, [
        userId,
        'card',
        paymentMethodId,
        true,
        JSON.stringify({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          stripe_payment_method_id: paymentMethodId,
          joining_fee: config.pricing.initialAmount,
          monthly_amount: config.pricing.recurringAmount,
          annual_amount: config.pricing.annualAmount,
          subscription_type: 'mixed_interval',
          currency: config.pricing.currency,
          status: subscription.status
        })
      ]);

      // Note: Queue position is automatically calculated by active_member_queue_view
      // based on user_subscriptions and user_payments tables. No manual queue management needed.

      // Create userMemberships record linked to this subscription
      // Each subscription gets its own membership (queue entry)
      const membershipQuery = `
        INSERT INTO user_memberships (user_id, subscription_id, join_date, tenure, verification_status, created_at, updated_at)
        VALUES ($1, $2, CURRENT_DATE, '0', 'PENDING', NOW(), NOW())
        ON CONFLICT (subscription_id) DO UPDATE SET
          updated_at = NOW()
      `;
      await pool.query(membershipQuery, [userId]);

      // Get checkout payment details (not subscription invoice - that hasn't been created yet)
      const initialPaymentAmount = config.pricing.initialAmount; // $325
      // Get receipt URL from the latest charge (expanded above)
      const latestCharge = paymentIntent.latest_charge as Stripe.Charge | null;
      const checkoutReceiptUrl = latestCharge?.receipt_url || null;

      // Build metadata for initial payment
      const initialPaymentMetadata = {
        checkout_session_id: session.id,
        subscription_created: true,
        initial_payment: true,
        joining_fee: config.pricing.initialAmount,
        includes_first_month: config.pricing.recurringAmount,
        includes_first_year: config.pricing.annualAmount,
      };

      // Get payment method ID from database (was stored earlier)
      const pmQuery = `SELECT id FROM user_payment_methods WHERE provider_payment_method_id = $1 AND user_id = $2`;
      const pmResult = await pool.query(pmQuery, [paymentMethodId, userId]);
      const dbPaymentMethodId = pmResult.rows.length > 0 ? pmResult.rows[0].id : null;

      // Create initial payment record with checkout session data
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
        dbPaymentMethodId,
        paymentIntentId,
        null, // No invoice for checkout session payment
        null, // No charge ID available
        initialPaymentAmount,
        config.pricing.currency,
        checkoutReceiptUrl,
        JSON.stringify(initialPaymentMetadata)
      ]);

      // Note: Queue stats are automatically calculated by active_member_queue_view
      // No manual updates needed - the view calculates from user_payments table

      // Create user agreement records
      const agreementQuery = `
        INSERT INTO user_agreements (user_id, agreement_type, version_number, agreed_at, created_at)
        VALUES 
          ($1, 'terms_of_service', '1.0', NOW(), NOW()),
          ($1, 'payment_authorization', '1.0', NOW(), NOW())
        ON CONFLICT (user_id, agreement_type, version_number) DO NOTHING
      `;
      await pool.query(agreementQuery, [userId]);

      logger.info(`Initial payment + mixed interval subscription created for member ${userId}`, {
        subscriptionId: subscription.id,
        initialPayment: initialPaymentAmount,
        monthlyRecurring: config.pricing.recurringAmount,
        annualRecurring: config.pricing.annualAmount,
        currency: config.pricing.currency
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
      // In Stripe API v2025+, subscription is on invoice line items, not the invoice itself
      const subscriptionLineItem = invoice.lines?.data?.find(line => line.subscription);
      if (!subscriptionLineItem || !subscriptionLineItem.subscription) {
        logger.warn(`No subscription found in invoice ${invoice.id} line items`);
        return;
      }

      const subscriptionId = subscriptionLineItem.subscription as string;
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

      // In Stripe API v2025+, payment_intent is not directly on invoice - use metadata or retrieve via charge
      // For now, we'll retrieve the payment intent ID from the default payment method on the subscription
      const subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
      const defaultPaymentMethodId = subscriptionDetails.default_payment_method as string | null;

      if (defaultPaymentMethodId) {
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);

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
        } catch (error) {
          logger.warn('Could not retrieve payment method details:', error);
        }
      }

      // Build metadata object with invoice and payment details
      const paymentMetadata = {
        invoice_metadata: invoice.metadata || {},
        billing_reason: invoice.billing_reason,
        subscription_id: subscriptionId,
        customer_id: invoice.customer,
        invoice_number: invoice.number || null,
        payment_method: paymentMethodDetails,
        attempt_count: invoice.attempt_count || 1
      };

      // Create payment record in user_payments table
      // Note: In Stripe API v2025+, payment_intent and charge are not on Invoice
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
        null,                    // provider_payment_id - not available on invoice in v2025+
        invoice.id,
        null,                    // provider_charge_id - not available on invoice in v2025+
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

      // Note: Queue stats are automatically calculated by active_member_queue_view
      // No manual updates needed - the view calculates from user_payments table

      // Update billing schedules with next billing dates from Stripe invoice line items
      // Important: Only update schedules for items that were actually billed on THIS invoice
      // In mixed intervals, monthly invoices only contain the monthly item, annual invoices only contain annual
      const invoiceLineItems = invoice.lines?.data || [];

      logger.info('Updating billing schedules from invoice line items', {
        userId: dbSubscription.user_id,
        invoiceId: invoice.id,
        lineItemCount: invoiceLineItems.length
      });

      for (const lineItem of invoiceLineItems) {
        // Only process subscription line items with recurring prices
        // Check if line item has subscription and price data (API v2025+ structure)
        // Use type assertion to access plan property which exists in runtime but not in types
        const lineItemWithPlan = lineItem as any;

        if (lineItem.subscription && lineItemWithPlan.plan?.interval) {
          const interval = lineItemWithPlan.plan.interval;
          const billingCycle = interval === 'month' ? 'MONTHLY' : interval === 'year' ? 'YEARLY' : null;

          if (billingCycle && lineItem.period?.end) {
            // Use Stripe's period.end from the invoice line item for next billing date
            const nextBillingDate = new Date(lineItem.period.end * 1000);

            const updateResult = await pool.query(
              `UPDATE user_billing_schedules
               SET next_billing_date = $1, updated_at = NOW()
               WHERE subscription_id = $2 AND billing_cycle = $3
               RETURNING id`,
              [nextBillingDate, dbSubscription.id, billingCycle]
            );

            if (updateResult.rows.length > 0) {
              logger.info(`Updated ${billingCycle} billing schedule from invoice`, {
                userId: dbSubscription.user_id,
                billingCycle,
                nextBillingDate: nextBillingDate.toISOString(),
                invoiceId: invoice.id
              });
            } else {
              logger.warn(`No billing schedule found to update for ${billingCycle}`, {
                userId: dbSubscription.user_id,
                subscriptionId: dbSubscription.id,
                billingCycle
              });
            }
          }
        }
      }

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
      // In Stripe API v2025+, subscription is on invoice line items
      const subscriptionLineItem = invoice.lines?.data?.find(line => line.subscription);
      if (!subscriptionLineItem || !subscriptionLineItem.subscription) {
        logger.warn(`No subscription found in failed invoice ${invoice.id} line items`);
        return;
      }

      const subscriptionId = subscriptionLineItem.subscription as string;
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
      let failureReason = 'Payment failed - no details available';

      // In Stripe API v2025+, retrieve payment method from subscription
      const subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
      const defaultPaymentMethodId = subscriptionDetails.default_payment_method as string | null;

      if (defaultPaymentMethodId) {
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);

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
        } catch (error) {
          logger.warn('Could not retrieve payment method for failed payment:', error);
        }
      }

      // Build metadata for failed payment
      const paymentMetadata = {
        invoice_metadata: invoice.metadata || {},
        billing_reason: invoice.billing_reason,
        subscription_id: subscriptionId,
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
        null,  // provider_payment_id - not available on invoice in v2025+
        invoice.id,
        null,  // provider_charge_id - not available on invoice in v2025+
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

      // BR-8: Immediate cancellation on first payment failure
      // Cancel the subscription immediately - user must update payment method to reactivate
      logger.warn(`Canceling subscription ${subscriptionId} due to payment failure`);

      try {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false, // Cancel immediately
          pause_collection: {
            behavior: 'mark_uncollectible' // Mark outstanding invoices as uncollectible
          }
        });

        // Update database subscription status
        await pool.query(
          `UPDATE user_subscriptions
           SET status = 'paused',
               canceled_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [dbSubscription.id]
        );

        logger.info(`Subscription ${subscriptionId} paused due to payment failure. User must update payment method.`);
      } catch (cancelError) {
        logger.error('Error pausing subscription after payment failure:', cancelError);
        // Continue execution - payment failure was already recorded
      }

      // TODO: Send notification email to user about payment failure and need to update payment method

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

      // In Stripe API v2025+, current_period_start/end are on subscription items
      const subscriptionItems = subscription.items.data;
      const earliestPeriodStart = Math.min(...subscriptionItems.map(item => item.current_period_start));
      const latestPeriodEnd = Math.max(...subscriptionItems.map(item => item.current_period_end));

      // Update subscription in database
      await SubscriptionModel.update(dbSubscription.id, {
        status: subscription.status as any,
        current_period_start: new Date(earliestPeriodStart * 1000),
        current_period_end: new Date(latestPeriodEnd * 1000),
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
        // Cancel at period end using new cancel_at enum for mixed intervals
        // Use 'max_period_end' to cancel at the latest billing period (most user-friendly)
        await stripe.subscriptions.update(dbSubscription.provider_subscription_id, {
          cancel_at: 'max_period_end' as any, // Cancel at the end of the longest billing cycle
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
      // Set cancel_at to null to remove any pending cancellation
      await stripe.subscriptions.update(dbSubscription.provider_subscription_id, {
        cancel_at: null as any, // Remove pending cancellation
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
   * Create Stripe Billing Portal Session for payment method updates
   * Users can update their payment method, view billing history, etc.
   */
  static async createBillingPortalSession(userId: string, returnUrl?: string): Promise<{ url: string }> {
    try {
      // Get user's subscription to find their Stripe customer ID
      const subscription = await pool.query(
        `SELECT provider_customer_id, status
         FROM user_subscriptions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (subscription.rows.length === 0) {
        throw new Error('No subscription found for user');
      }

      const { provider_customer_id, status } = subscription.rows[0];

      if (!provider_customer_id) {
        throw new Error('No Stripe customer ID found for subscription');
      }

      // Create billing portal session with restricted permissions
      // Only allow payment method updates - no subscription cancellation or pausing
      const session = await stripe.billingPortal.sessions.create({
        customer: provider_customer_id,
        return_url: returnUrl || `${config.frontendUrl}/dashboard`,
        flow_data: {
          type: 'payment_method_update',
        },
      });

      logger.info(`Created billing portal session for user ${userId}, customer ${provider_customer_id}`);

      return {
        url: session.url,
      };
    } catch (error) {
      logger.error('Error creating billing portal session:', error);
      throw error;
    }
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
