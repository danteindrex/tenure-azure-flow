
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function analyzeKYC() {
  try {
    console.log('--- Verification Statuses ---');
    const statusRes = await pool.query('SELECT * FROM verification_statuses ORDER BY id');
    console.table(statusRes.rows);

    console.log('\n--- KYC Verification Table Schema ---');
    const schemaRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'kyc_verification'
      ORDER BY ordinal_position;
    `);
    console.table(schemaRes.rows);
    
    console.log('\n--- User Memberships Table Schema (Verification Columns) ---');
     const userSchemaRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_memberships' AND column_name LIKE '%verification%'
      ORDER BY ordinal_position;
    `);
    console.table(userSchemaRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

analyzeKYC();
