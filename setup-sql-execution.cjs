const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function setupSQLEXecution() {
  console.log('🚀 Setting up SQL execution capabilities...\n');

  try {
    // Step 1: Create the exec_sql function using REST API
    console.log('📝 Creating exec_sql function...');
    
    const execFunctionSQL = `
      -- Create a function to execute SQL
      CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          result text;
      BEGIN
          -- Execute the SQL and return a success message
          EXECUTE sql_query;
          RETURN 'SQL executed successfully';
      EXCEPTION
          WHEN OTHERS THEN
              RETURN 'Error: ' || SQLERRM;
      END;
      $$;

      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

      -- Grant execute permission to service role
      GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
    `;

    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql: execFunctionSQL })
    });

    if (!response.ok) {
      console.log('❌ Could not create exec_sql function via REST API');
      console.log('Response status:', response.status);
      console.log('Response text:', await response.text());
      
      console.log('\n📋 Manual Setup Required:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the following SQL:');
      console.log('\n' + execFunctionSQL);
      console.log('\n4. Execute the script');
      console.log('\n5. Then run: node create-queue-table.cjs');
      return;
    }

    console.log('✅ exec_sql function created successfully');

    // Step 2: Test the function
    console.log('\n🧪 Testing SQL execution...');
    
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql_query: 'SELECT NOW() as current_time;' })
    });

    if (!testResponse.ok) {
      console.log('❌ SQL execution test failed');
      console.log('Response status:', testResponse.status);
      console.log('Response text:', await testResponse.text());
      return;
    }

    const testResult = await testResponse.json();
    console.log('✅ SQL execution test passed:', testResult);

    // Step 3: Create the queue table
    console.log('\n📊 Creating queue table...');
    
    const fs = require('fs');
    const queueTableSQL = fs.readFileSync('create-queue-table.sql', 'utf8');
    
    const queueResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql_query: queueTableSQL })
    });

    if (!queueResponse.ok) {
      console.log('❌ Failed to create queue table via REST API');
      console.log('Response status:', queueResponse.status);
      console.log('Response text:', await queueResponse.text());
      
      console.log('\n📋 Manual Setup Required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the SQL from create-queue-table.sql');
      console.log('4. Execute the script');
      return;
    }

    const queueResult = await queueResponse.json();
    console.log('✅ Queue table created successfully:', queueResult);

    console.log('\n🎉 SQL execution capabilities enabled successfully!');
    console.log('\n📚 You can now use:');
    console.log('• supabase.rpc("exec_sql", { sql_query: "YOUR_SQL" }) in your code');
    console.log('• The useSQLExecution React hook');
    console.log('• The /api/sql/execute API endpoint');
    console.log('• The SupabaseSQLExecutor class');

  } catch (error) {
    console.error('❌ Error setting up SQL execution:', error);
    console.log('\n📋 Manual Setup Required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL from create-sql-exec-function.sql');
    console.log('4. Then run the SQL from create-queue-table.sql');
  }
}

// Run the setup
setupSQLEXecution();
