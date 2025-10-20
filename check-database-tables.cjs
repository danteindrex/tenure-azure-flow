const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function checkDatabaseTables() {
  console.log('🔍 Checking database tables...\n');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check all tables in the public schema
    console.log('📊 All tables in public schema:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.log('❌ Error fetching tables:', tablesError.message);
      return;
    }

    if (!tables || tables.length === 0) {
      console.log('❌ No tables found in public schema');
      return;
    }

    console.log('✅ Found', tables.length, 'tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name} (${table.table_type})`);
    });

    // Check specifically for queue table
    console.log('\n🎯 Checking for queue table specifically:');
    const queueTable = tables.find(t => t.table_name === 'queue');
    
    if (queueTable) {
      console.log('✅ Queue table EXISTS!');
      console.log('   Type:', queueTable.table_type);
      
      // Get queue table schema
      console.log('\n📋 Queue table schema:');
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', 'queue')
        .order('ordinal_position');

      if (columnsError) {
        console.log('❌ Error fetching queue columns:', columnsError.message);
      } else if (columns && columns.length > 0) {
        console.log('   Columns:');
        columns.forEach(col => {
          console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
          if (col.column_default) {
            console.log(`       Default: ${col.column_default}`);
          }
        });
      }

      // Check queue table data
      console.log('\n📊 Queue table data:');
      const { data: queueData, error: queueDataError } = await supabase
        .from('queue')
        .select('*')
        .limit(10);

      if (queueDataError) {
        console.log('❌ Error fetching queue data:', queueDataError.message);
      } else {
        console.log(`   Records found: ${queueData ? queueData.length : 0}`);
        if (queueData && queueData.length > 0) {
          console.log('   Sample record:');
          console.log('   ', JSON.stringify(queueData[0], null, 2));
        }
      }

    } else {
      console.log('❌ Queue table does NOT exist');
      console.log('\n📋 To create the queue table:');
      console.log('1. Go to Supabase dashboard → SQL Editor');
      console.log('2. Run the SQL from create-queue-table.sql');
      console.log('3. Or run: node test-sql-execution.cjs');
    }

    // Check for exec_sql function
    console.log('\n🔧 Checking for exec_sql function:');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'exec_sql');

    if (functionsError) {
      console.log('❌ Error checking functions:', functionsError.message);
    } else if (functions && functions.length > 0) {
      console.log('✅ exec_sql function EXISTS!');
      console.log('   Type:', functions[0].routine_type);
    } else {
      console.log('❌ exec_sql function does NOT exist');
      console.log('\n📋 To create the exec_sql function:');
      console.log('1. Go to Supabase dashboard → SQL Editor');
      console.log('2. Run the SQL from create-sql-exec-function.sql');
    }

    // Check for other important tables
    console.log('\n🏗️ Checking for other important tables:');
    const importantTables = ['profiles', 'member', 'payment', 'payout', 'admin'];
    
    importantTables.forEach(tableName => {
      const table = tables.find(t => t.table_name === tableName);
      if (table) {
        console.log(`   ✅ ${tableName} - EXISTS`);
      } else {
        console.log(`   ❌ ${tableName} - MISSING`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

// Run the check
checkDatabaseTables();
