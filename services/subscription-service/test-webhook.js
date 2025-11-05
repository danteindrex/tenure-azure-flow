/**
 * Test Stripe Webhook - Simulate invoice.payment_succeeded event
 *
 * This script simulates a Stripe webhook to test if recurring payments
 * are properly recorded in the user_payments table.
 */

require('dotenv').config();
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/stripe';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Test data - you'll need to replace these with real values from your database
const TEST_SUBSCRIPTION_ID = process.env.TEST_SUBSCRIPTION_ID || 'sub_test123'; // Stripe subscription ID
const TEST_USER_ID = process.env.TEST_USER_ID; // UUID from your database
const TEST_AMOUNT = 2500; // $25.00 in cents

// Sample invoice.payment_succeeded event
const createInvoicePaymentSucceededEvent = () => {
  const timestamp = Math.floor(Date.now() / 1000);

  return {
    id: `evt_test_${timestamp}`,
    object: 'event',
    api_version: '2023-10-16',
    created: timestamp,
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: `in_test_${timestamp}`,
        object: 'invoice',
        amount_due: TEST_AMOUNT,
        amount_paid: TEST_AMOUNT,
        amount_remaining: 0,
        billing_reason: 'subscription_cycle', // Indicates recurring payment
        charge: `ch_test_${timestamp}`,
        currency: 'usd',
        customer: `cus_test_${timestamp}`,
        customer_email: 'test@example.com',
        paid: true,
        payment_intent: `pi_test_${timestamp}`,
        status: 'paid',
        subscription: TEST_SUBSCRIPTION_ID,
        hosted_invoice_url: `https://invoice.stripe.com/i/test_${timestamp}`,
        metadata: {
          isFirstPayment: 'false' // This is a recurring payment
        }
      }
    }
  };
};

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

// Send webhook request
const sendWebhook = async () => {
  console.log('\n🚀 Testing Stripe Webhook - invoice.payment_succeeded\n');
  console.log('Configuration:');
  console.log('  Webhook URL:', WEBHOOK_URL);
  console.log('  Test Subscription ID:', TEST_SUBSCRIPTION_ID);
  console.log('  Test User ID:', TEST_USER_ID || '⚠️  NOT SET - Use TEST_USER_ID env var');
  console.log('  Amount:', `$${(TEST_AMOUNT / 100).toFixed(2)}`);
  console.log('  Webhook Secret:', STRIPE_WEBHOOK_SECRET ? '✅ Configured' : '❌ NOT SET');
  console.log('');

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Error: STRIPE_WEBHOOK_SECRET not set in .env file');
    console.log('\nTo fix this:');
    console.log('1. Copy your webhook signing secret from Stripe Dashboard');
    console.log('2. Add to .env: STRIPE_WEBHOOK_SECRET=whsec_...');
    process.exit(1);
  }

  if (!TEST_USER_ID) {
    console.error('❌ Error: TEST_USER_ID not set');
    console.log('\nTo fix this:');
    console.log('1. Query your database for a test user UUID');
    console.log('2. Run: TEST_USER_ID=<uuid> node test-webhook.js');
    process.exit(1);
  }

  const event = createInvoicePaymentSucceededEvent();
  const payload = JSON.stringify(event);
  const signature = createStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

  console.log('📦 Event Details:');
  console.log('  Event ID:', event.id);
  console.log('  Event Type:', event.type);
  console.log('  Invoice ID:', event.data.object.id);
  console.log('  Payment Intent:', event.data.object.payment_intent);
  console.log('  Amount Paid:', `$${(event.data.object.amount_paid / 100).toFixed(2)}`);
  console.log('  Billing Reason:', event.data.object.billing_reason);
  console.log('');

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
      console.log('');
      console.log('🔍 Next steps:');
      console.log('1. Check the subscription service logs for detailed output');
      console.log('2. Query the user_payments table:');
      console.log(`   SELECT * FROM user_payments WHERE user_id = '${TEST_USER_ID}' ORDER BY payment_date DESC LIMIT 5;`);
      console.log('3. Check the membership_queue table:');
      console.log(`   SELECT total_months_subscribed, lifetime_payment_total, last_payment_date FROM membership_queue WHERE user_id = '${TEST_USER_ID}';`);
    } else {
      console.error('❌ Webhook failed!');
      console.error('   Status:', response.status);
      console.error('   Response:', responseText);

      if (response.status === 400 && responseText.includes('signature')) {
        console.log('\n💡 Tip: Signature verification failed. Make sure STRIPE_WEBHOOK_SECRET matches your Stripe webhook endpoint secret.');
      }
    }
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
    console.log('\n💡 Tips:');
    console.log('- Make sure subscription service is running: npm run dev');
    console.log('- Check service is listening on port 3001');
    console.log('- Verify DATABASE_URL is configured correctly');
  }
};

// Run the test
sendWebhook().catch(console.error);
