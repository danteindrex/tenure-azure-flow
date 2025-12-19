
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkAddressTable() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_addresses'
      ORDER BY ordinal_position;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkAddressTable();
