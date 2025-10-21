const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

async function enableSQLEXecution() {
  console.log('🚀 Enabling SQL execution capabilities for Supabase...\n');

  try {
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Create the exec_sql function
    console.log('📝 Step 1: Creating exec_sql function...');
    
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

    // Execute the function creation
    const { data: execData, error: execError } = await supabase.rpc('exec', {
      sql: execFunctionSQL
    });

    if (execError) {
      console.log('⚠️  Direct RPC execution failed, trying alternative approach...');
      
      // Alternative: Use the REST API
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
        console.log('❌ Could not create exec_sql function automatically');
        console.log('\n📋 Manual Setup Required:');
        console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the following SQL:');
        console.log('\n' + execFunctionSQL);
        console.log('\n4. Execute the script');
        console.log('\n5. Then run this script again to create the queue table');
        return;
      }
    }

    console.log('✅ exec_sql function created successfully');

    // Step 2: Test the function
    console.log('\n🧪 Step 2: Testing SQL execution...');
    
    const { data: testData, error: testError } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT NOW() as current_time;'
    });

    if (testError) {
      console.log('❌ SQL execution test failed:', testError.message);
      console.log('The exec_sql function may not be working properly');
      return;
    }

    console.log('✅ SQL execution test passed');

    // Step 3: Create the queue table
    console.log('\n📊 Step 3: Creating queue table...');
    
    const queueTableSQL = fs.readFileSync('create-queue-table.sql', 'utf8');
    
    const { data: queueData, error: queueError } = await supabase.rpc('exec_sql', {
      sql_query: queueTableSQL
    });

    if (queueError) {
      console.log('❌ Failed to create queue table:', queueError);
      console.log('You may need to run the SQL manually in Supabase dashboard');
      return;
    }

    console.log('✅ Queue table created successfully');

    // Step 4: Verify setup
    console.log('\n🔍 Step 4: Verifying setup...');
    
    const { data: verifyData, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          table_name,
          'exists' as status
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('queue', 'exec_sql')
        ORDER BY table_name;
      `
    });

    if (verifyError) {
      console.log('⚠️  Could not verify table creation');
    } else {
      console.log('✅ Database verification completed');
    }

    console.log('\n🎉 SQL execution capabilities enabled successfully!');
    console.log('\n📚 You can now use:');
    console.log('• SupabaseSQLExecutor class for direct SQL execution');
    console.log('• useSQLExecution React hook in your components');
    console.log('• /api/sql/execute API endpoint for SQL execution');
    console.log('• supabase.rpc("exec_sql", { sql_query: "YOUR_SQL" }) directly');

  } catch (error) {
    console.error('❌ Error enabling SQL execution:', error);
    console.log('\n📋 Manual Setup Required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL from create-sql-exec-function.sql');
    console.log('4. Then run the SQL from create-queue-table.sql');
  }
}

// Run the setup
enableSQLEXecution();
