import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkDetails() {
  try {
    // Check if user_profiles has bio column
    const profileCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `);
    
    console.log('=== user_profiles COLUMNS ===');
    profileCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Check user_settings columns
    const settingsCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n=== user_settings COLUMNS ===');
    settingsCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Count data in key tables
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM user_profiles) as profiles_count,
        (SELECT COUNT(*) FROM user_payments) as payments_count,
        (SELECT COUNT(*) FROM user_settings) as settings_count,
        (SELECT COUNT(*) FROM membership_queue) as queue_count;
    `);
    
    console.log('\n=== TABLE ROW COUNTS ===');
    Object.entries(counts.rows[0]).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} rows`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDetails();
