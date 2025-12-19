
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

listTables();
