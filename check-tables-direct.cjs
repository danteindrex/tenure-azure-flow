const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function checkTablesDirect() {
  console.log('🔍 Checking database tables directly...\n');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // List of tables to check
    const tablesToCheck = [
      'queue',
      'profiles', 
      'member',
      'payment',
      'payout',
      'admin',
      'tenure',
      'news_feed_post',
      'audit_log'
    ];

    console.log('📊 Checking for specific tables:');
    
    for (const tableName of tablesToCheck) {
      try {
        // Try to query the table with a simple select
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            console.log(`   ❌ ${tableName} - NOT FOUND`);
          } else {
            console.log(`   ⚠️  ${tableName} - EXISTS but has error: ${error.message}`);
          }
        } else {
          console.log(`   ✅ ${tableName} - EXISTS (${data ? data.length : 0} records)`);
        }
      } catch (err) {
        console.log(`   ❌ ${tableName} - ERROR: ${err.message}`);
      }
    }

    // Check specifically for queue table and get its structure
    console.log('\n🎯 Detailed check for queue table:');
    try {
      const { data: queueData, error: queueError } = await supabase
        .from('queue')
        .select('*')
        .limit(5);

      if (queueError) {
        console.log('❌ Queue table error:', queueError.message);
        console.log('   Code:', queueError.code);
        console.log('   Details:', queueError.details);
      } else {
        console.log('✅ Queue table exists and is accessible');
        console.log(`   Records found: ${queueData ? queueData.length : 0}`);
        
        if (queueData && queueData.length > 0) {
          console.log('   Sample record structure:');
          const sampleRecord = queueData[0];
          Object.keys(sampleRecord).forEach(key => {
            console.log(`     - ${key}: ${typeof sampleRecord[key]} (${sampleRecord[key]})`);
          });
        } else {
          console.log('   Table is empty');
        }
      }
    } catch (err) {
      console.log('❌ Queue table check failed:', err.message);
    }

    // Check for exec_sql function
    console.log('\n🔧 Checking for exec_sql function:');
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: 'SELECT 1 as test;'
      });

      if (error) {
        console.log('❌ exec_sql function error:', error.message);
        console.log('   Code:', error.code);
      } else {
        console.log('✅ exec_sql function exists and works');
        console.log('   Test result:', data);
      }
    } catch (err) {
      console.log('❌ exec_sql function check failed:', err.message);
    }

    // Try to get table list using a different approach
    console.log('\n📋 Attempting to get table list via RPC:');
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `
      });

      if (error) {
        console.log('❌ Could not get table list via RPC:', error.message);
      } else {
        console.log('✅ Table list via RPC:', data);
      }
    } catch (err) {
      console.log('❌ RPC table list failed:', err.message);
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

// Run the check
checkTablesDirect();
