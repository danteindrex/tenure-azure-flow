import Stripe from 'stripe';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { SubscriptionModel } from '../models/subscription.model';
import { PaymentModel } from '../models/payment.model';
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '../types';
import { pool } from '../config/database';
import { STRIPE_PRICE_IDS, validateStripePriceIds } from '../config/stripe-prices';
import { emailService } from './email.service';
import {
  USER_STATUS,
  MEMBER_STATUS,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  VERIFICATION_STATUS,
  mapStripeSubscriptionStatus,
} from '../config/status-ids';

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

      // ============================================
      // DUPLICATE PAYMENT PREVENTION
      // ============================================

      // 1. Check for ANY active subscription - users should only have ONE active subscription
      // Using subscription_status_id FK column: 1=Active, 2=Trialing
      const activeSubscriptionQuery = `
        SELECT us.id, us.provider_subscription_id, us.created_at
        FROM user_subscriptions us
        WHERE us.user_id = $1
        AND us.subscription_status_id IN ($2, $3)
        ORDER BY us.created_at DESC
        LIMIT 1
      `;
      const activeSub = await pool.query(activeSubscriptionQuery, [userId, SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING]);

      if (activeSub.rows.length > 0) {
        logger.warn(`User ${userId} already has an active subscription, preventing duplicate checkout`, {
          existingSubscriptionId: activeSub.rows[0].provider_subscription_id,
          createdAt: activeSub.rows[0].created_at
        });
        throw new Error('DUPLICATE_SUBSCRIPTION: You already have an active subscription. Please refresh the page.');
      }

      // 2. Check for recent successful payments (within last 5 minutes)
      // This catches cases where payment succeeded but subscription creation is still in progress
      // Using payment_status_id FK column: 2=Succeeded
      const recentPaymentQuery = `
        SELECT id, provider_payment_id, created_at
        FROM user_payments
        WHERE user_id = $1
        AND payment_status_id = $2
        AND payment_type = 'subscription'
        AND created_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
      `;
      const recentPayment = await pool.query(recentPaymentQuery, [userId, PAYMENT_STATUS.SUCCEEDED]);

      if (recentPayment.rows.length > 0) {
        logger.warn(`User ${userId} has a recent successful payment, preventing duplicate checkout`, {
          paymentId: recentPayment.rows[0].provider_payment_id,
          createdAt: recentPayment.rows[0].created_at
        });
        throw new Error('PAYMENT_PROCESSING: Your payment is being processed. Please wait a moment and refresh the page.');
      }

      // 3. Check Stripe directly for active subscriptions FOR THIS APP (in case webhook failed to sync)
      // IMPORTANT: Filter by our specific price IDs to avoid blocking users who have
      // subscriptions from other apps on the same Stripe account
      const existingCustomersCheck = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomersCheck.data.length > 0) {
        const stripeCustomer = existingCustomersCheck.data[0];

        // Check for active or trialing subscriptions directly in Stripe
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.id,
          status: 'active',
          limit: 10,
        });

        const trialingSubscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.id,
          status: 'trialing',
          limit: 10,
        });

        const allActiveSubscriptions = [
          ...stripeSubscriptions.data,
          ...trialingSubscriptions.data,
        ];

        // Filter subscriptions to only those belonging to THIS app (by price ID)
        const ourPriceIds = [STRIPE_PRICE_IDS.MONTHLY, STRIPE_PRICE_IDS.ANNUAL];
        const ourAppSubscriptions = allActiveSubscriptions.filter(sub => {
          // Check if any subscription item uses our price IDs
          return sub.items.data.some(item => ourPriceIds.includes(item.price.id));
        });

        if (ourAppSubscriptions.length > 0) {
          const stripeSub = ourAppSubscriptions[0];
          logger.info(`Found active subscription in Stripe for user ${userId} with our price IDs, syncing to database`, {
            stripeSubscriptionId: stripeSub.id,
            status: stripeSub.status,
            priceIds: stripeSub.items.data.map(item => item.price.id),
          });

          // Sync the subscription to our database and update membership
          await this.syncStripeSubscriptionToDatabase(userId, stripeCustomer.id, stripeSub);

          throw new Error('SUBSCRIPTION_SYNCED: You already have an active subscription. Your account has been updated. Please refresh the page.');
        } else if (allActiveSubscriptions.length > 0) {
          // User has subscriptions but not for our app - that's fine, let them proceed
          logger.info(`User ${userId} has ${allActiveSubscriptions.length} active subscriptions in Stripe, but none with our price IDs. Allowing checkout.`, {
            foundPriceIds: allActiveSubscriptions.flatMap(sub => sub.items.data.map(item => item.price.id)),
            ourPriceIds,
          });
        }
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

      // IDEMPOTENCY CHECK: Prevent duplicate subscriptions on webhook retry
      // Check if we already processed this checkout session
      const existingSubQuery = `
        SELECT us.id, us.provider_subscription_id
        FROM user_subscriptions us
        INNER JOIN user_payment_methods pm ON pm.user_id = us.user_id
        WHERE us.user_id = $1
        AND pm.metadata->>'stripe_customer_id' = $2
        AND us.created_at > NOW() - INTERVAL '10 minutes'
        LIMIT 1
      `;
      const existingSub = await pool.query(existingSubQuery, [userId, session.customer]);

      if (existingSub.rows.length > 0) {
        logger.warn(`Subscription already created for checkout session, skipping duplicate`, {
          userId,
          checkoutSessionId: session.id,
          existingSubscriptionId: existingSub.rows[0].provider_subscription_id
        });
        return; // Exit early - already processed
      }

      // Get payment intent to retrieve payment method and charge details
      const paymentIntentId = session.payment_intent as string;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge']
      });
      const paymentMethodId = paymentIntent.payment_method as string;

      // Validate that Stripe price IDs are configured
      validateStripePriceIds();

      // Create mixed interval subscription using reusable price IDs
      // IMPORTANT: We use pre-created prices instead of creating new ones for each customer
      // This prevents cluttering Stripe with duplicate prices and enables proper analytics
      const subscription = await stripe.subscriptions.create({
        customer: session.customer as string,
        items: [
          { price: STRIPE_PRICE_IDS.MONTHLY },  // Reusable monthly price ID
          { price: STRIPE_PRICE_IDS.ANNUAL },   // Reusable annual price ID
        ],
        default_payment_method: paymentMethodId,
        // CRITICAL: Enable flexible billing mode for mixed intervals (REQUIRED for API 2025-06-30.basil+)
        // This allows monthly and yearly items on the same subscription
        billing_mode: { type: 'flexible' } as any,
        collection_method: 'charge_automatically',
        metadata: {
          userId: userId.toString(),
          subscriptionType: 'mixed_interval',
        },
        proration_behavior: 'none',
        // Expand subscription items to get billing period information
        expand: ['latest_invoice', 'latest_invoice.payment_intent'],
      });

      // Update user status to Onboarded (using user_status_id FK column)
      const updateUserQuery = `
        UPDATE users
        SET user_status_id = $1, updated_at = NOW()
        WHERE id = $2
      `;
      await pool.query(updateUserQuery, [USER_STATUS.ONBOARDED, userId]);

      // Also notify the main app about payment completion
      try {
        const appUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${appUrl}/api/onboarding/update-progress`, {
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
          subscription_status_id, current_period_start, current_period_end
        )
        VALUES ($1, 'stripe', $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const subscriptionResult = await pool.query(subscriptionQuery, [
        userId,
        subscription.id,
        subscription.customer,
        mapStripeSubscriptionStatus(subscription.status),
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
      // Set member_status_id to ACTIVE (2) since payment succeeded
      const membershipQuery = `
        INSERT INTO user_memberships (user_id, subscription_id, member_status_id, verification_status_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (subscription_id) DO UPDATE SET
          member_status_id = $3,
          updated_at = NOW()
      `;
      await pool.query(membershipQuery, [userId, subscriptionResult.rows[0].id, MEMBER_STATUS.ACTIVE, VERIFICATION_STATUS.PENDING]);

      logger.info(`Member status set to Active (ID: ${MEMBER_STATUS.ACTIVE}) for user ${userId}`);

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

      // Create initial payment record with idempotency check
      // Check if payment already exists (prevents duplicate processing of webhooks)
      const checkPaymentQuery = `
        SELECT id FROM user_payments
        WHERE provider_payment_id = $1
        LIMIT 1
      `;
      const existingPayment = await pool.query(checkPaymentQuery, [paymentIntentId]);

      if (existingPayment.rows.length > 0) {
        logger.warn(`Payment already recorded for payment_intent: ${paymentIntentId}, skipping duplicate`, {
          userId,
          paymentIntentId
        });
      } else {
        // Payment doesn't exist, create it with payment_status_id FK column
        const paymentQuery = `
          INSERT INTO user_payments (
            user_id, subscription_id, payment_method_id, provider_payment_id, provider_invoice_id,
            provider_charge_id, amount, currency, payment_type, payment_status_id, is_first_payment, receipt_url, metadata, payment_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'initial', $9, true, $10, $11, NOW())
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
          PAYMENT_STATUS.SUCCEEDED,
          checkoutReceiptUrl,
          JSON.stringify(initialPaymentMetadata)
        ]);

        logger.info(`Initial payment recorded for member ${userId}`, {
          paymentIntentId,
          amount: initialPaymentAmount
        });
      }

      // Refresh the materialized queue view to immediately show user in queue
      // This ensures real-time updates instead of waiting for scheduled refresh
      try {
        await pool.query('SELECT refresh_active_member_queue()');
        logger.info(`Queue refreshed after payment for user ${userId}`);
      } catch (refreshError) {
        // Don't fail the webhook if refresh fails - scheduled refresh will handle it
        logger.warn('Failed to refresh queue view:', refreshError);
      }

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

      // Send welcome email after successful first payment
      try {
        // Get user name for personalized email
        const userNameQuery = `
          SELECT u.name, p.first_name, p.last_name, u.email
          FROM users u
          LEFT JOIN user_profiles p ON u.id = p.user_id
          WHERE u.id = $1
        `;
        const userResult = await pool.query(userNameQuery, [userId]);
        const userData = userResult.rows[0];

        if (userData?.email) {
          const userName = userData.first_name || userData.name || 'Member';
          await emailService.sendWelcomeEmail({
            to: userData.email,
            name: userName
          });
          logger.info(`Welcome email sent to ${userData.email}`);
        }
      } catch (emailError) {
        // Don't fail the webhook if email fails - just log it
        logger.error('Failed to send welcome email:', emailError);
      }
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

      // CRITICAL: Skip processing subscription_create invoices to prevent duplicate payments
      // The initial payment is already handled by handleCheckoutComplete webhook
      if (invoice.billing_reason === 'subscription_create') {
        logger.info(`Skipping subscription_create invoice ${invoice.id} - already handled by checkout.session.completed`);
        return;
      }

      const isFirstPayment = invoice.metadata?.isFirstPayment === 'true';
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

      // Check if payment already exists (idempotency check)
      const checkPaymentQuery = `
        SELECT id FROM user_payments
        WHERE provider_invoice_id = $1
        LIMIT 1
      `;
      const existingPayment = await pool.query(checkPaymentQuery, [invoice.id]);

      if (existingPayment.rows.length > 0) {
        logger.warn(`Payment already recorded for invoice: ${invoice.id}, skipping duplicate`);
        return;
      }

      // Create payment record in user_payments table with payment_status_id FK column
      // Note: In Stripe API v2025+, payment_intent and charge are not on Invoice
      const paymentQuery = `
        INSERT INTO user_payments (
          user_id, subscription_id, payment_method_id, provider_payment_id, provider_invoice_id,
          provider_charge_id, amount, currency, payment_type, payment_status_id, is_first_payment, receipt_url, metadata, payment_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
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
        PAYMENT_STATUS.SUCCEEDED,
        isFirstPayment,
        invoice.hosted_invoice_url || null,
        JSON.stringify(paymentMetadata)
      ]);

      // Calculate total months subscribed and lifetime total using payment_status_id
      const paymentsQuery = `
        SELECT * FROM user_payments
        WHERE user_id = $1
        ORDER BY payment_date DESC
      `;
      const paymentsResult = await pool.query(paymentsQuery, [dbSubscription.user_id]);
      const payments = paymentsResult.rows;
      const totalMonths = payments.filter((p: any) => p.payment_status_id === PAYMENT_STATUS.SUCCEEDED).length;

      const lifetimeTotalQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM user_payments
        WHERE user_id = $1 AND payment_status_id = $2
      `;
      const lifetimeTotalResult = await pool.query(lifetimeTotalQuery, [dbSubscription.user_id, PAYMENT_STATUS.SUCCEEDED]);
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

      // SYNC: Reactivate member_status_id to ACTIVE on successful payment
      // This handles users who were Suspended and made a successful payment to cure
      // Only reactivate if currently Suspended (don't override Won/Paid states)
      await pool.query(
        `UPDATE user_memberships
         SET member_status_id = $1,
             updated_at = NOW()
         WHERE subscription_id = $2
         AND member_status_id = $3`,
        [MEMBER_STATUS.ACTIVE, dbSubscription.id, MEMBER_STATUS.SUSPENDED]
      );

      logger.info(`Member status reactivated to Active (ID: ${MEMBER_STATUS.ACTIVE}) for subscription ${dbSubscription.id} (if was Suspended)`);

      // Refresh the queue to reflect updated payment stats
      try {
        await pool.query('SELECT refresh_active_member_queue()');
        logger.info(`Queue refreshed after recurring payment for user ${dbSubscription.user_id}`);
      } catch (refreshError) {
        logger.warn('Failed to refresh queue view:', refreshError);
      }
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

      // Record failed payment attempt with payment_status_id FK column
      const paymentQuery = `
        INSERT INTO user_payments (
          user_id, subscription_id, payment_method_id, provider_payment_id, provider_invoice_id,
          provider_charge_id, amount, currency, payment_type, payment_status_id, is_first_payment,
          failure_reason, metadata, payment_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
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
        PAYMENT_STATUS.FAILED,
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

      // SMART RETRY HANDLING: Let Stripe handle retries (default: 4 attempts over 21-30 days)
      // Stripe also sends dunning emails automatically (configurable in Dashboard > Billing > Subscriptions)
      // We only take action based on retry status:

      const isFinalAttempt = invoice.next_payment_attempt === null;
      const attemptCount = invoice.attempt_count || 1;

      if (isFinalAttempt) {
        // FINAL ATTEMPT FAILED - All Stripe retries exhausted
        // Now we cancel/suspend the subscription
        logger.warn(`Final payment attempt failed for subscription ${subscriptionId}. Suspending member.`);

        try {
          // Pause collection rather than cancel - gives user chance to update payment method
          await stripe.subscriptions.update(subscriptionId, {
            pause_collection: {
              behavior: 'mark_uncollectible' // Mark outstanding invoices as uncollectible
            }
          });

          // Update database subscription status using subscription_status_id FK column
          // CANCELED (4) for paused state since we don't have a PAUSED status
          await pool.query(
            `UPDATE user_subscriptions
             SET subscription_status_id = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [SUBSCRIPTION_STATUS.CANCELED, dbSubscription.id]
          );

          // SYNC: Update member_status_id to SUSPENDED on final payment failure
          // This removes user from queue eligibility
          await pool.query(
            `UPDATE user_memberships
             SET member_status_id = $1,
                 updated_at = NOW()
             WHERE subscription_id = $2`,
            [MEMBER_STATUS.SUSPENDED, dbSubscription.id]
          );

          logger.info(`Member status set to Suspended (ID: ${MEMBER_STATUS.SUSPENDED}) for subscription ${dbSubscription.id} after ${attemptCount} failed attempts`);

          // Refresh the queue to reflect the status change
          try {
            await pool.query('SELECT refresh_active_member_queue()');
          } catch (refreshError) {
            logger.warn('Failed to refresh queue view after suspension:', refreshError);
          }

          logger.info(`Subscription ${subscriptionId} paused after all retry attempts failed. User must update payment method.`);
        } catch (cancelError) {
          logger.error('Error pausing subscription after final payment failure:', cancelError);
        }
      } else {
        // NOT FINAL - Stripe will retry automatically
        // Just log and let Stripe handle it (Stripe sends dunning emails automatically)
        const nextAttemptDate = invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : 'unknown';

        logger.info(`Payment attempt ${attemptCount} failed for subscription ${subscriptionId}. Stripe will retry on ${nextAttemptDate}. Dunning emails sent by Stripe.`);

        // Optional: Mark member as "at risk" but don't suspend yet
        // This keeps them in queue but flags the account
      }

      // Note: Stripe handles dunning emails automatically
      // Configure in Dashboard: Settings > Billing > Subscriptions and emails
      // - Failed payment notifications
      // - Reminder emails (up to 4)
      // - Final warning before action

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

      // SYNC: Update member_status_id to CANCELLED when subscription is deleted
      // This permanently removes user from queue eligibility
      await pool.query(
        `UPDATE user_memberships
         SET member_status_id = $1,
             updated_at = NOW()
         WHERE subscription_id = $2`,
        [MEMBER_STATUS.CANCELLED, dbSubscription.id]
      );

      logger.info(`Member status set to Cancelled (ID: ${MEMBER_STATUS.CANCELLED}) for subscription ${dbSubscription.id}`);

      // Refresh the queue to reflect the status change
      try {
        await pool.query('SELECT refresh_active_member_queue()');
      } catch (refreshError) {
        logger.warn('Failed to refresh queue view after cancellation:', refreshError);
      }

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

      // Check if subscription is canceled using subscription_status_id (4 = Canceled)
      if (dbSubscription.subscription_status_id === SUBSCRIPTION_STATUS.CANCELED) {
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
  static async getPaymentHistory(userId: string) {
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
        `SELECT provider_customer_id, subscription_status_id
         FROM user_subscriptions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (subscription.rows.length === 0) {
        throw new Error('No subscription found for user');
      }

      const { provider_customer_id, subscription_status_id } = subscription.rows[0];

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
   * Sync a Stripe subscription to the database
   * Used when we find an active subscription in Stripe that's not in our DB (e.g., webhook failed)
   */
  private static async syncStripeSubscriptionToDatabase(
    userId: string,
    stripeCustomerId: string,
    stripeSub: Stripe.Subscription
  ): Promise<void> {
    try {
      logger.info(`Syncing Stripe subscription ${stripeSub.id} to database for user ${userId}`);

      // Get period start/end from subscription items (Stripe API v2025+)
      const subscriptionItems = stripeSub.items.data;
      const earliestPeriodStart = Math.min(...subscriptionItems.map(item => item.current_period_start));
      const latestPeriodEnd = Math.max(...subscriptionItems.map(item => item.current_period_end));

      // Check if subscription already exists in DB (might be with different status)
      const existingSubQuery = `
        SELECT id, subscription_status_id FROM user_subscriptions
        WHERE provider_subscription_id = $1
        LIMIT 1
      `;
      const existingSub = await pool.query(existingSubQuery, [stripeSub.id]);

      let subscriptionId: string;

      if (existingSub.rows.length > 0) {
        // Update existing subscription to active using subscription_status_id FK column
        subscriptionId = existingSub.rows[0].id;
        await pool.query(
          `UPDATE user_subscriptions
           SET subscription_status_id = $1,
               current_period_start = $2,
               current_period_end = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [
            mapStripeSubscriptionStatus(stripeSub.status),
            new Date(earliestPeriodStart * 1000),
            new Date(latestPeriodEnd * 1000),
            subscriptionId
          ]
        );
        logger.info(`Updated existing subscription ${subscriptionId} to status ID ${mapStripeSubscriptionStatus(stripeSub.status)}`);
      } else {
        // Create new subscription record with subscription_status_id FK column
        const insertSubQuery = `
          INSERT INTO user_subscriptions (
            user_id, provider, provider_subscription_id, provider_customer_id,
            subscription_status_id, current_period_start, current_period_end,
            cancel_at_period_end, created_at, updated_at
          )
          VALUES ($1, 'stripe', $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING id
        `;
        const subResult = await pool.query(insertSubQuery, [
          userId,
          stripeSub.id,
          stripeCustomerId,
          mapStripeSubscriptionStatus(stripeSub.status),
          new Date(earliestPeriodStart * 1000),
          new Date(latestPeriodEnd * 1000),
          stripeSub.cancel_at_period_end || false,
        ]);
        subscriptionId = subResult.rows[0].id;
        logger.info(`Created new subscription record ${subscriptionId} for Stripe sub ${stripeSub.id}`);
      }

      // Check if user has a membership - update the latest one
      const membershipQuery = `
        SELECT id, member_status_id FROM user_memberships
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const membership = await pool.query(membershipQuery, [userId]);

      if (membership.rows.length > 0) {
        const membershipId = membership.rows[0].id;
        const currentStatusId = membership.rows[0].member_status_id;

        // Update membership to Active and link to subscription if not already active/won/paid
        if (currentStatusId !== MEMBER_STATUS.ACTIVE && currentStatusId !== MEMBER_STATUS.WON && currentStatusId !== MEMBER_STATUS.PAID) {
          await pool.query(
            `UPDATE user_memberships
             SET member_status_id = $1,
                 subscription_id = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [MEMBER_STATUS.ACTIVE, subscriptionId, membershipId]
          );
          logger.info(`Updated membership ${membershipId} to Active status (ID: ${MEMBER_STATUS.ACTIVE})`);
        } else {
          // Just ensure subscription_id is linked
          await pool.query(
            `UPDATE user_memberships
             SET subscription_id = $1,
                 updated_at = NOW()
             WHERE id = $2 AND (subscription_id IS NULL OR subscription_id != $1)`,
            [subscriptionId, membershipId]
          );
        }
      } else {
        // Create membership record with member_status_id and verification_status_id FK columns
        const insertMembershipQuery = `
          INSERT INTO user_memberships (
            user_id, subscription_id, member_status_id, verification_status_id, join_date, tenure,
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, CURRENT_DATE, 0, NOW(), NOW())
          RETURNING id
        `;
        const membershipResult = await pool.query(insertMembershipQuery, [userId, subscriptionId, MEMBER_STATUS.ACTIVE, VERIFICATION_STATUS.PENDING]);
        logger.info(`Created new membership ${membershipResult.rows[0].id} for user ${userId}`);
      }

      // Update user status to Onboarded if not already using user_status_id FK column
      await pool.query(
        `UPDATE users
         SET user_status_id = $1,
             updated_at = NOW()
         WHERE id = $2 AND user_status_id != $1`,
        [USER_STATUS.ONBOARDED, userId]
      );

      // Refresh the queue
      try {
        await pool.query('SELECT refresh_active_member_queue()');
        logger.info(`Queue refreshed after syncing subscription for user ${userId}`);
      } catch (refreshError) {
        logger.warn('Failed to refresh queue view after sync:', refreshError);
      }

      logger.info(`Successfully synced Stripe subscription ${stripeSub.id} for user ${userId}`);
    } catch (error) {
      logger.error(`Error syncing Stripe subscription to database:`, error);
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
