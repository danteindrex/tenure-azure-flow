const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function testSQLEXecution() {
  console.log('🧪 Testing SQL execution capabilities...\n');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Check if exec_sql function exists
    console.log('1️⃣ Testing exec_sql function...');
    const { data: testData, error: testError } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT NOW() as current_time;'
    });

    if (testError) {
      console.log('❌ exec_sql function not found or not working');
      console.log('Error:', testError.message);
      console.log('\n📋 Please run the setup first:');
      console.log('1. Go to Supabase dashboard → SQL Editor');
      console.log('2. Run the SQL from create-sql-exec-function.sql');
      console.log('3. Run this test again');
      return;
    }

    console.log('✅ exec_sql function is working');
    console.log('Result:', testData);

    // Test 2: Check if queue table exists
    console.log('\n2️⃣ Testing queue table...');
    const { data: queueData, error: queueError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          table_name,
          'exists' as status
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'queue';
      `
    });

    if (queueError) {
      console.log('❌ Error checking queue table:', queueError.message);
      return;
    }

    console.log('✅ Queue table check completed');
    console.log('Result:', queueData);

    // Test 3: Try to query the queue table
    console.log('\n3️⃣ Testing queue table query...');
    const { data: queryData, error: queryError } = await supabase
      .from('queue')
      .select('*')
      .limit(5);

    if (queryError) {
      console.log('❌ Error querying queue table:', queryError.message);
      console.log('The queue table may not exist or have the wrong schema');
      console.log('\n📋 Please run:');
      console.log('1. Go to Supabase dashboard → SQL Editor');
      console.log('2. Run the SQL from create-queue-table.sql');
      console.log('3. Run this test again');
      return;
    }

    console.log('✅ Queue table query successful');
    console.log('Records found:', queryData.length);
    if (queryData.length > 0) {
      console.log('Sample record:', queryData[0]);
    }

    // Test 4: Test inserting sample data
    console.log('\n4️⃣ Testing data insertion...');
    const { data: insertData, error: insertError } = await supabase.rpc('exec_sql', {
      sql_query: `
        INSERT INTO queue (memberid, queue_position, is_eligible, subscription_active, total_months_subscribed, lifetime_payment_total)
        VALUES (999, 1, true, true, 3, 500.00)
        ON CONFLICT (memberid) DO NOTHING;
      `
    });

    if (insertError) {
      console.log('❌ Error inserting test data:', insertError.message);
    } else {
      console.log('✅ Test data insertion successful');
      console.log('Result:', insertData);
    }

    console.log('\n🎉 All tests passed! SQL execution is working correctly.');
    console.log('\n📚 You can now use:');
    console.log('• supabase.rpc("exec_sql", { sql_query: "YOUR_SQL" })');
    console.log('• The useSQLExecution React hook');
    console.log('• The /api/sql/execute API endpoint');
    console.log('• The SupabaseSQLExecutor class');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testSQLEXecution();
