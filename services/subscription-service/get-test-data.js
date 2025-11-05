/**
 * Get test data from database for webhook testing
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false }
});

async function getTestData() {
  try {
    console.log('🔍 Fetching test subscription data from database...\n');

    // Get a subscription with a user
    const query = `
      SELECT
        us.id as subscription_id,
        us.user_id,
        us.provider_subscription_id as stripe_subscription_id,
        us.provider_customer_id as stripe_customer_id,
        us.status,
        u.email,
        u.name
      FROM user_subscriptions us
      INNER JOIN users u ON u.id = us.user_id
      WHERE us.status = 'active'
      LIMIT 1
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('❌ No active subscriptions found in database');
      console.log('\n💡 Tips:');
      console.log('- Complete a test signup with payment first');
      console.log('- Check if users have active subscriptions');
      return null;
    }

    const data = result.rows[0];
    console.log('✅ Found test subscription data:\n');
    console.log('User Information:');
    console.log('  User ID (UUID):', data.user_id);
    console.log('  Email:', data.email);
    console.log('  Name:', data.name);
    console.log('');
    console.log('Subscription Information:');
    console.log('  Subscription ID (DB):', data.subscription_id);
    console.log('  Stripe Subscription ID:', data.stripe_subscription_id);
    console.log('  Stripe Customer ID:', data.stripe_customer_id);
    console.log('  Status:', data.status);
    console.log('');

    // Check existing payments
    const paymentsQuery = `
      SELECT
        id,
        amount,
        payment_type,
        payment_date,
        status,
        is_first_payment
      FROM user_payments
      WHERE user_id = $1
      ORDER BY payment_date DESC
    `;

    const paymentsResult = await pool.query(paymentsQuery, [data.user_id]);

    console.log(`Existing Payments (${paymentsResult.rows.length} total):`);
    if (paymentsResult.rows.length > 0) {
      paymentsResult.rows.forEach((p, i) => {
        console.log(`  ${i + 1}. $${p.amount} - ${p.payment_type} - ${p.status} - ${p.payment_date.toISOString().split('T')[0]}`);
      });
    } else {
      console.log('  No payments found');
    }
    console.log('');

    // Generate environment variables for test
    console.log('📋 Copy these environment variables to run the webhook test:\n');
    console.log('export TEST_USER_ID=' + data.user_id);
    console.log('export TEST_SUBSCRIPTION_ID=' + data.stripe_subscription_id);
    console.log('');
    console.log('Then run:');
    console.log('node test-webhook.js');

    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection failed. Check DATABASE_URI in .env');
    }
  } finally {
    await pool.end();
  }
}

getTestData();
