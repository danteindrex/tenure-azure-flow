/**
 * Test Payment Scenarios - Simulate various Stripe webhook events
 *
 * This script tests:
 * 1. Successful recurring payment with card details
 * 2. Failed payment with decline reason
 * 3. Payment with different card brands
 * 4. Payment with metadata
 */

require('dotenv').config();
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/stripe';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Test data - you'll need to replace these with real values from your database
const TEST_SUBSCRIPTION_ID = process.env.TEST_SUBSCRIPTION_ID || 'sub_test123';
const TEST_CUSTOMER_ID = process.env.TEST_CUSTOMER_ID || 'cus_test123';

// Create Stripe signature
const createStripeSignature = (payload, secret) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
};

// Test Scenario 1: Successful recurring payment with Visa card
const createSuccessfulPayment = (cardBrand = 'visa', last4 = '4242') => {
  const timestamp = Math.floor(Date.now() / 1000);
  const paymentMethodId = `pm_test_${timestamp}`;
  const paymentIntentId = `pi_test_${timestamp}`;
  const invoiceId = `in_test_${timestamp}`;
  const chargeId = `ch_test_${timestamp}`;

  return {
    id: `evt_test_success_${timestamp}`,
    object: 'event',
    api_version: '2023-10-16',
    created: timestamp,
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: invoiceId,
        object: 'invoice',
        amount_due: 2500,
        amount_paid: 2500,
        amount_remaining: 0,
        attempt_count: 1,
        billing_reason: 'subscription_cycle',
        charge: chargeId,
        currency: 'usd',
        customer: TEST_CUSTOMER_ID,
        customer_email: 'test@example.com',
        default_payment_method: paymentMethodId,
        paid: true,
        payment_intent: paymentIntentId,
        status: 'paid',
        subscription: TEST_SUBSCRIPTION_ID,
        hosted_invoice_url: `https://invoice.stripe.com/i/acct_test/${invoiceId}`,
        number: `INV-${timestamp}`,
        metadata: {
          test_scenario: 'successful_recurring_payment',
          card_brand: cardBrand
        }
      }
    }
  };
};

// Test Scenario 2: Failed payment - Insufficient funds
const createFailedPayment = (declineCode = 'insufficient_funds') => {
  const timestamp = Math.floor(Date.now() / 1000);
  const paymentMethodId = `pm_test_${timestamp}`;
  const paymentIntentId = `pi_test_failed_${timestamp}`;
  const invoiceId = `in_test_failed_${timestamp}`;

  return {
    id: `evt_test_failed_${timestamp}`,
    object: 'event',
    api_version: '2023-10-16',
    created: timestamp,
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: invoiceId,
        object: 'invoice',
        amount_due: 2500,
        amount_paid: 0,
        amount_remaining: 2500,
        attempt_count: 2,
        attempted: true,
        billing_reason: 'subscription_cycle',
        charge: null,
        currency: 'usd',
        customer: TEST_CUSTOMER_ID,
        customer_email: 'test@example.com',
        default_payment_method: paymentMethodId,
        paid: false,
        payment_intent: paymentIntentId,
        status: 'open',
        subscription: TEST_SUBSCRIPTION_ID,
        hosted_invoice_url: null,
        next_payment_attempt: timestamp + 86400, // 24 hours later
        number: `INV-${timestamp}`,
        metadata: {
          test_scenario: 'failed_payment',
          decline_code: declineCode
        }
      }
    }
  };
};

// Test Scenario 3: Successful payment with Mastercard
const createMastercardPayment = () => {
  return createSuccessfulPayment('mastercard', '5555');
};

// Test Scenario 4: Successful payment with Amex
const createAmexPayment = () => {
  return createSuccessfulPayment('amex', '0005');
};

// Mock Stripe API responses for payment method retrieval
const mockPaymentMethodResponses = {
  'visa': {
    id: null, // Will be set dynamically
    object: 'payment_method',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
      funding: 'credit',
      country: 'US',
      fingerprint: 'fingerprint_visa_4242'
    }
  },
  'mastercard': {
    id: null,
    object: 'payment_method',
    type: 'card',
    card: {
      brand: 'mastercard',
      last4: '5555',
      exp_month: 6,
      exp_year: 2026,
      funding: 'debit',
      country: 'US',
      fingerprint: 'fingerprint_mc_5555'
    }
  },
  'amex': {
    id: null,
    object: 'payment_method',
    type: 'card',
    card: {
      brand: 'amex',
      last4: '0005',
      exp_month: 3,
      exp_year: 2027,
      funding: 'credit',
      country: 'US',
      fingerprint: 'fingerprint_amex_0005'
    }
  }
};

// Send webhook request
const sendWebhook = async (event, scenario) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TEST SCENARIO: ${scenario}`);
  console.log(`${'='.repeat(80)}\n`);

  console.log('Event Details:');
  console.log('  Event ID:', event.id);
  console.log('  Event Type:', event.type);
  console.log('  Invoice ID:', event.data.object.id);
  console.log('  Amount:', `$${(event.data.object.amount_due / 100).toFixed(2)}`);
  console.log('  Status:', event.data.object.status);
  console.log('  Payment Intent:', event.data.object.payment_intent);
  console.log('  Attempt Count:', event.data.object.attempt_count);

  if (event.type === 'invoice.payment_succeeded') {
    console.log('  Receipt URL:', event.data.object.hosted_invoice_url);
  } else if (event.type === 'invoice.payment_failed') {
    console.log('  Next Attempt:', event.data.object.next_payment_attempt ? new Date(event.data.object.next_payment_attempt * 1000).toISOString() : 'N/A');
  }
  console.log('');

  const payload = JSON.stringify(event);
  const signature = createStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

  try {
    console.log('📡 Sending webhook request...\n');

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: payload,
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
      console.log('   Status:', response.status);
      console.log('   Response:', responseText);
    } else {
      console.error('❌ Webhook failed!');
      console.error('   Status:', response.status);
      console.error('   Response:', responseText);
    }

    return { success: response.ok, status: response.status, response: responseText };

  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    return { success: false, error: error.message };
  }
};

// Query database to verify results
const verifyPaymentInDatabase = async (invoiceId, scenario) => {
  console.log('\n🔍 Verifying payment in database...\n');

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URI,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const query = `
      SELECT
        id,
        user_id,
        amount,
        payment_type,
        status,
        payment_method_id,
        receipt_url,
        failure_reason,
        metadata::text as metadata,
        payment_date,
        created_at
      FROM user_payments
      WHERE provider_invoice_id = $1
    `;

    const result = await pool.query(query, [invoiceId]);

    if (result.rows.length === 0) {
      console.log('⚠️  Payment not found in database!');
      return null;
    }

    const payment = result.rows[0];
    console.log('✅ Payment found in database:');
    console.log('   Payment ID:', payment.id);
    console.log('   User ID:', payment.user_id);
    console.log('   Amount:', `$${payment.amount}`);
    console.log('   Type:', payment.payment_type);
    console.log('   Status:', payment.status);
    console.log('   Payment Method ID:', payment.payment_method_id || 'NULL');
    console.log('   Receipt URL:', payment.receipt_url || 'NULL');
    console.log('   Failure Reason:', payment.failure_reason || 'N/A');
    console.log('');

    // Parse and display metadata
    if (payment.metadata) {
      const metadata = JSON.parse(payment.metadata);
      console.log('📋 Payment Metadata:');
      console.log('   Billing Reason:', metadata.billing_reason);
      console.log('   Attempt Count:', metadata.attempt_count);

      if (metadata.payment_method) {
        console.log('   Payment Method:');
        console.log('     ID:', metadata.payment_method.id);
        console.log('     Type:', metadata.payment_method.type);
        if (metadata.payment_method.card) {
          console.log('     Card Brand:', metadata.payment_method.card.brand);
          console.log('     Card Last4:', metadata.payment_method.card.last4);
          console.log('     Card Exp:', `${metadata.payment_method.card.exp_month}/${metadata.payment_method.card.exp_year}`);
          console.log('     Card Funding:', metadata.payment_method.card.funding);
          console.log('     Card Country:', metadata.payment_method.card.country);
        }
      }

      if (metadata.failure_details) {
        console.log('   Failure Details:', metadata.failure_details);
      }
      console.log('');
    }

    // Check if payment method was stored in user_payment_methods table
    if (payment.payment_method_id) {
      const pmQuery = `
        SELECT
          id,
          method_type,
          method_subtype,
          last_four,
          brand,
          expires_month,
          expires_year,
          is_default,
          is_active,
          metadata::text as metadata
        FROM user_payment_methods
        WHERE id = $1
      `;
      const pmResult = await pool.query(pmQuery, [payment.payment_method_id]);

      if (pmResult.rows.length > 0) {
        const pm = pmResult.rows[0];
        console.log('💳 Payment Method Details (from user_payment_methods):');
        console.log('   Method Type:', pm.method_type);
        console.log('   Brand:', pm.brand);
        console.log('   Last 4:', pm.last_four);
        console.log('   Expires:', `${pm.expires_month}/${pm.expires_year}`);
        console.log('   Is Default:', pm.is_default);
        console.log('   Is Active:', pm.is_active);
        console.log('');
      }
    }

    return payment;

  } catch (error) {
    console.error('❌ Database error:', error.message);
    return null;
  } finally {
    await pool.end();
  }
};

// Run all test scenarios
const runAllTests = async () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 STRIPE PAYMENT WEBHOOK TESTING SUITE');
  console.log('='.repeat(80));

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('\n❌ Error: STRIPE_WEBHOOK_SECRET not set in .env file');
    console.log('\nTo fix this:');
    console.log('1. Add to .env: STRIPE_WEBHOOK_SECRET=whsec_...');
    process.exit(1);
  }

  if (!TEST_SUBSCRIPTION_ID) {
    console.error('\n❌ Error: TEST_SUBSCRIPTION_ID not set');
    console.log('\nTo fix this:');
    console.log('1. Run: node get-test-data.js');
    console.log('2. Export: TEST_SUBSCRIPTION_ID=<subscription_id>');
    process.exit(1);
  }

  const results = [];

  // Test 1: Successful Visa payment
  console.log('\n\n');
  const visaEvent = createSuccessfulPayment('visa', '4242');
  const visaResult = await sendWebhook(visaEvent, 'Successful Payment - Visa Card');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
  await verifyPaymentInDatabase(visaEvent.data.object.id, 'Visa Payment');
  results.push({ scenario: 'Visa Success', ...visaResult });

  // Test 2: Successful Mastercard payment
  console.log('\n\n');
  const mcEvent = createMastercardPayment();
  const mcResult = await sendWebhook(mcEvent, 'Successful Payment - Mastercard');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await verifyPaymentInDatabase(mcEvent.data.object.id, 'Mastercard Payment');
  results.push({ scenario: 'Mastercard Success', ...mcResult });

  // Test 3: Successful Amex payment
  console.log('\n\n');
  const amexEvent = createAmexPayment();
  const amexResult = await sendWebhook(amexEvent, 'Successful Payment - American Express');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await verifyPaymentInDatabase(amexEvent.data.object.id, 'Amex Payment');
  results.push({ scenario: 'Amex Success', ...amexResult });

  // Test 4: Failed payment - Insufficient funds
  console.log('\n\n');
  const failedEvent = createFailedPayment('insufficient_funds');
  const failedResult = await sendWebhook(failedEvent, 'Failed Payment - Insufficient Funds');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await verifyPaymentInDatabase(failedEvent.data.object.id, 'Failed Payment');
  results.push({ scenario: 'Payment Failure', ...failedResult });

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.scenario}`);
    if (!result.success) {
      console.log(`         Error: ${result.error || result.response}`);
    }
  });

  const passedCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log('\n' + '='.repeat(80));
  console.log(`Results: ${passedCount}/${totalCount} tests passed`);
  console.log('='.repeat(80) + '\n');

  console.log('📋 Next Steps:');
  console.log('1. Check the subscription service logs for detailed processing');
  console.log('2. Query the database to verify all fields are populated:');
  console.log('   SELECT * FROM user_payments ORDER BY created_at DESC LIMIT 5;');
  console.log('3. Check payment methods table:');
  console.log('   SELECT * FROM user_payment_methods ORDER BY created_at DESC LIMIT 5;');
  console.log('');
};

// Run tests
runAllTests().catch(console.error);
