import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://exneyqwvvckzxqzlknxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bmV5cXd2dmNrenhxemxrbnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYxNDY3OCwiZXhwIjoyMDc2MTkwNjc4fQ.R6ZS-ham7iP-eXjlwR5fUVacI22MsfMsYsHtMf3Lc7M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAllTables() {
  console.log('🔍 Comprehensive Database Analysis\n');
  console.log('='.repeat(50));

  // Define all tables to analyze
  const tables = [
    // New normalized tables
    'users',
    'user_profiles', 
    'user_contacts',
    'user_addresses',
    'user_memberships',
    'user_payment_methods',
    'user_subscriptions',
    'user_payments',
    'user_billing_schedules',
    'user_agreements',
    'system_audit_logs',
    
    // Legacy tables
    'member',
    'queue',
    'subscription', 
    'payment',
    'payment_methods',
    'queue_entries',
    
    // Other potential tables
    'admin',
    'notifications',
    'financial_schedules',
    'member_agreements'
  ];

  const results = {};

  for (const tableName of tables) {
    console.log(`\n📊 Analyzing Table: ${tableName}`);
    console.log('-'.repeat(40));
    
    try {
      // Get actual data to count rows
      const { data: actualData, error: countError, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1000); // Limit to avoid large data sets

      if (countError) {
        console.log(`❌ Table '${tableName}' not accessible: ${countError.message}`);
        results[tableName] = { status: 'not_accessible', error: countError.message };
        continue;
      }

      const rowCount = count || 0;
      console.log(`📈 Row Count: ${rowCount}`);

      // Get sample data if table has rows
      let sampleData = [];
      if (rowCount > 0) {
        const { data: samples, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);

        if (!sampleError && samples) {
          sampleData = samples;
          console.log(`📋 Sample Data (${samples.length} records):`);
          
          // Show column names from first record
          if (samples[0]) {
            const columns = Object.keys(samples[0]);
            console.log(`   Columns: ${columns.join(', ')}`);
            
            // Show first record details
            console.log('   First Record:');
            Object.entries(samples[0]).forEach(([key, value]) => {
              const displayValue = typeof value === 'string' && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : value;
              console.log(`     ${key}: ${displayValue}`);
            });
          }
        }
      } else {
        console.log('📭 No data in table');
      }

      results[tableName] = {
        status: 'accessible',
        rowCount,
        sampleData,
        columns: sampleData[0] ? Object.keys(sampleData[0]) : []
      };

    } catch (error) {
      console.log(`❌ Error analyzing '${tableName}': ${error.message}`);
      results[tableName] = { status: 'error', error: error.message };
    }
  }

  // Generate summary report
  console.log('\n\n📋 DATABASE SUMMARY REPORT');
  console.log('='.repeat(50));

  const accessibleTables = Object.entries(results).filter(([_, data]) => data.status === 'accessible');
  const tablesWithData = accessibleTables.filter(([_, data]) => data.rowCount > 0);
  const emptyTables = accessibleTables.filter(([_, data]) => data.rowCount === 0);
  const inaccessibleTables = Object.entries(results).filter(([_, data]) => data.status !== 'accessible');

  console.log(`\n✅ Accessible Tables: ${accessibleTables.length}`);
  console.log(`📊 Tables with Data: ${tablesWithData.length}`);
  console.log(`📭 Empty Tables: ${emptyTables.length}`);
  console.log(`❌ Inaccessible Tables: ${inaccessibleTables.length}`);

  console.log('\n📊 TABLES WITH DATA:');
  tablesWithData.forEach(([tableName, data]) => {
    console.log(`   • ${tableName}: ${data.rowCount} rows`);
  });

  console.log('\n📭 EMPTY TABLES:');
  emptyTables.forEach(([tableName, data]) => {
    console.log(`   • ${tableName}: 0 rows`);
  });

  console.log('\n❌ INACCESSIBLE TABLES:');
  inaccessibleTables.forEach(([tableName, data]) => {
    console.log(`   • ${tableName}: ${data.error}`);
  });

  // Analyze relationships and data integrity
  console.log('\n🔗 RELATIONSHIP ANALYSIS:');
  console.log('-'.repeat(30));

  // Check users table relationships
  if (results.users?.rowCount > 0) {
    console.log('\n👥 Users Table Analysis:');
    
    const { data: users } = await supabase
      .from('users')
      .select('id, email, status, created_at');

    if (users) {
      console.log(`   Total Users: ${users.length}`);
      
      const statusCounts = users.reduce((acc, user) => {
        acc[user.status] = (acc[user.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   Status Distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });

      // Check related data for each user
      for (const user of users.slice(0, 3)) { // Check first 3 users
        console.log(`\n   User: ${user.email}`);
        
        // Check profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        console.log(`     Profile: ${profile ? '✅ Exists' : '❌ Missing'}`);
        
        // Check contacts
        const { data: contacts } = await supabase
          .from('user_contacts')
          .select('*')
          .eq('user_id', user.id);
        
        console.log(`     Contacts: ${contacts?.length || 0} records`);
        
        // Check addresses
        const { data: addresses } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id);
        
        console.log(`     Addresses: ${addresses?.length || 0} records`);
        
        // Check membership
        const { data: membership } = await supabase
          .from('user_memberships')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        console.log(`     Membership: ${membership ? '✅ Exists' : '❌ Missing'}`);
        
        // Check queue
        const { data: queueEntry } = await supabase
          .from('membership_queue')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        console.log(`     Queue Entry: ${queueEntry ? `✅ Position ${queueEntry.queue_position}` : '❌ Missing'}`);
      }
    }
  }

  // Check for data migration completeness
  console.log('\n🔄 MIGRATION STATUS ANALYSIS:');
  console.log('-'.repeat(35));

  const newTables = ['users', 'user_profiles', 'user_contacts', 'user_addresses', 'user_memberships'];
  const legacyTables = ['member', 'queue', 'subscription', 'payment'];

  console.log('\nNew Schema Population:');
  newTables.forEach(table => {
    const data = results[table];
    if (data?.status === 'accessible') {
      console.log(`   ${table}: ${data.rowCount} records ${data.rowCount > 0 ? '✅' : '⚠️'}`);
    } else {
      console.log(`   ${table}: Not accessible ❌`);
    }
  });

  console.log('\nLegacy Schema Status:');
  legacyTables.forEach(table => {
    const data = results[table];
    if (data?.status === 'accessible') {
      console.log(`   ${table}: ${data.rowCount} records ${data.rowCount === 0 ? '✅ Clean' : '⚠️ Has data'}`);
    } else {
      console.log(`   ${table}: Not accessible ❌`);
    }
  });

  return results;
}

analyzeAllTables().catch(console.error);