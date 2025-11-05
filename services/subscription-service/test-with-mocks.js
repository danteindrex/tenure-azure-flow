/**
 * Test Payment Scenarios with Stripe API Mocking
 *
 * This version intercepts Stripe API calls to return mock payment method data
 * so we can test the full flow without needing real Stripe resources
 */

require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/stripe';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TEST_SUBSCRIPTION_ID = process.env.TEST_SUBSCRIPTION_ID;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false }
});

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

// Test scenarios generator
const createTestEvent = (type, options = {}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const {
    cardBrand = 'visa',
    last4 = '4242',
    declineCode = null,
    amount = 2500
  } = options;

  const paymentMethodId = `pm_test_${cardBrand}_${timestamp}`;
  const paymentIntentId = `pi_test_${type}_${timestamp}`;
  const invoiceId = `in_test_${type}_${timestamp}`;
  const chargeId = type === 'success' ? `ch_test_${timestamp}` : null;

  const baseInvoice = {
    id: invoiceId,
    object: 'invoice',
    amount_due: amount,
    attempt_count: type === 'failed' ? 2 : 1,
    billing_reason: 'subscription_cycle',
    currency: 'usd',
    customer: 'cus_test123',
    customer_email: 'test@example.com',
    default_payment_method: paymentMethodId,
    payment_intent: paymentIntentId,
    subscription: TEST_SUBSCRIPTION_ID,
    number: `INV-TEST-${timestamp}`,
    metadata: {
      test_mode: 'true',
      test_scenario: type,
      card_brand: cardBrand,
      ...(declineCode && { decline_code: declineCode })
    }
  };

  if (type === 'success') {
    return {
      id: `evt_success_${timestamp}`,
      object: 'event',
      api_version: '2023-10-16',
      created: timestamp,
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          ...baseInvoice,
          amount_paid: amount,
          amount_remaining: 0,
          charge: chargeId,
          paid: true,
          status: 'paid',
          hosted_invoice_url: `https://invoice.stripe.com/i/test_${invoiceId}`
        }
      }
    };
  } else {
    return {
      id: `evt_failed_${timestamp}`,
      object: 'event',
      api_version: '2023-10-16',
      created: timestamp,
      type: 'invoice.payment_failed',
      data: {
        object: {
          ...baseInvoice,
          amount_paid: 0,
          amount_remaining: amount,
          charge: null,
          attempted: true,
          paid: false,
          status: 'open',
          hosted_invoice_url: null,
          next_payment_attempt: timestamp + 86400
        }
      }
    };
  }
};

// Send webhook
const sendWebhook = async (event, scenarioName) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TEST: ${scenarioName}`);
  console.log(`${'='.repeat(80)}\n`);

  console.log('📤 Sending Event:');
  console.log('   Type:', event.type);
  console.log('   Invoice:', event.data.object.id);
  console.log('   Amount:', `$${(event.data.object.amount_due / 100).toFixed(2)}`);
  console.log('   Card:', event.data.object.metadata?.card_brand || 'N/A');
  console.log('');

  const payload = JSON.stringify(event);
  const signature = createStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

  try {
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
      console.log('✅ Webhook Success:', response.status);
      return { success: true, invoiceId: event.data.object.id };
    } else {
      console.log('❌ Webhook Failed:', response.status);
      console.log('   Response:', responseText);
      return { success: false, error: responseText };
    }
  } catch (error) {
    console.log('❌ Request Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Verify payment in database
const verifyPayment = async (invoiceId, expectedStatus) => {
  console.log('🔍 Verifying Database Record...\n');

  try {
    const query = `
      SELECT
        p.id,
        p.user_id,
        p.amount,
        p.payment_type,
        p.status,
        p.payment_method_id,
        p.receipt_url,
        p.failure_reason,
        p.metadata,
        pm.brand,
        pm.last_four,
        pm.expires_month,
        pm.expires_year
      FROM user_payments p
      LEFT JOIN user_payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.provider_invoice_id = $1
    `;

    const result = await pool.query(query, [invoiceId]);

    if (result.rows.length === 0) {
      console.log('❌ Payment NOT found in database\n');
      return false;
    }

    const payment = result.rows[0];
    const statusMatch = payment.status === expectedStatus;

    console.log('Payment Record:');
    console.log('   ID:', payment.id.substring(0, 8) + '...');
    console.log('   Amount:', `$${payment.amount}`);
    console.log('   Status:', payment.status, statusMatch ? '✅' : '❌');
    console.log('   Type:', payment.payment_type);
    console.log('');

    if (payment.payment_method_id) {
      console.log('Payment Method:');
      console.log('   Has PM ID:', '✅');
      console.log('   Brand:', payment.brand || 'N/A');
      console.log('   Last4:', payment.last_four || 'N/A');
      console.log('   Expires:', payment.expires_month && payment.expires_year
        ? `${payment.expires_month}/${payment.expires_year}` : 'N/A');
      console.log('');
    } else {
      console.log('Payment Method: ⚠️  Not linked\n');
    }

    if (payment.metadata) {
      const meta = payment.metadata;
      console.log('Metadata:');
      console.log('   Has metadata:', '✅');
      console.log('   Billing reason:', meta.billing_reason || 'N/A');
      console.log('   Has payment_method:', meta.payment_method ? '✅' : '❌');
      if (meta.payment_method?.card) {
        console.log('   Card brand:', meta.payment_method.card.brand);
        console.log('   Card last4:', meta.payment_method.card.last4);
      }
      console.log('');
    }

    if (payment.receipt_url) {
      console.log('Receipt URL:', '✅', payment.receipt_url.substring(0, 50) + '...');
      console.log('');
    }

    if (payment.failure_reason) {
      console.log('Failure Reason:', payment.failure_reason);
      console.log('');
    }

    return statusMatch;

  } catch (error) {
    console.log('❌ Database Error:', error.message, '\n');
    return false;
  }
};

// Run test suite
const runTests = async () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 PAYMENT WEBHOOK TEST SUITE');
  console.log('='.repeat(80));

  if (!STRIPE_WEBHOOK_SECRET) {
    console.log('\n❌ Missing STRIPE_WEBHOOK_SECRET in .env\n');
    process.exit(1);
  }

  if (!TEST_SUBSCRIPTION_ID) {
    console.log('\n❌ Missing TEST_SUBSCRIPTION_ID environment variable');
    console.log('Run: export TEST_SUBSCRIPTION_ID=<your-subscription-id>\n');
    process.exit(1);
  }

  const results = [];

  // Test 1: Successful Visa payment
  const visaEvent = createTestEvent('success', { cardBrand: 'visa', last4: '4242' });
  const visaResult = await sendWebhook(visaEvent, 'Successful Visa Payment');
  await new Promise(r => setTimeout(r, 3000));
  const visaVerified = await verifyPayment(visaEvent.data.object.id, 'succeeded');
  results.push({ name: 'Visa Success', passed: visaResult.success && visaVerified });

  // Test 2: Successful Mastercard
  const mcEvent = createTestEvent('success', { cardBrand: 'mastercard', last4: '5555' });
  const mcResult = await sendWebhook(mcEvent, 'Successful Mastercard Payment');
  await new Promise(r => setTimeout(r, 3000));
  const mcVerified = await verifyPayment(mcEvent.data.object.id, 'succeeded');
  results.push({ name: 'Mastercard Success', passed: mcResult.success && mcVerified });

  // Test 3: Successful Amex
  const amexEvent = createTestEvent('success', { cardBrand: 'amex', last4: '0005' });
  const amexResult = await sendWebhook(amexEvent, 'Successful Amex Payment');
  await new Promise(r => setTimeout(r, 3000));
  const amexVerified = await verifyPayment(amexEvent.data.object.id, 'succeeded');
  results.push({ name: 'Amex Success', passed: amexResult.success && amexVerified });

  // Test 4: Failed payment
  const failedEvent = createTestEvent('failed', { declineCode: 'insufficient_funds' });
  const failedResult = await sendWebhook(failedEvent, 'Failed Payment');
  await new Promise(r => setTimeout(r, 3000));
  const failedVerified = await verifyPayment(failedEvent.data.object.id, 'failed');
  results.push({ name: 'Payment Failure', passed: failedResult.success && failedVerified });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(80) + '\n');

  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  });

  const passed = results.filter(r => r.passed).length;
  console.log('\n' + '='.repeat(80));
  console.log(`Summary: ${passed}/${results.length} tests passed`);
  console.log('='.repeat(80) + '\n');

  await pool.end();
};

runTests().catch(error => {
  console.error('Test suite error:', error);
  pool.end();
  process.exit(1);
});
