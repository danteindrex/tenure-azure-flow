
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function getStatuses() {
  try {
    console.log('--- Member Eligibility Statuses ---');
    const memberRes = await pool.query('SELECT * FROM member_eligibility_statuses ORDER BY id');
    console.table(memberRes.rows);

    console.log('\n--- Subscription Statuses ---');
    const subRes = await pool.query('SELECT * FROM subscription_statuses ORDER BY id');
    console.table(subRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

getStatuses();
