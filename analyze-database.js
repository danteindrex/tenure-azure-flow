import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://exneyqwvvckzxqzlknxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bmV5cXd2dmNrenhxemxrbnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYxNDY3OCwiZXhwIjoyMDc2MTkwNjc4fQ.R6ZS-ham7iP-eXjlwR5fUVacI22MsfMsYsHtMf3Lc7M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabaseStructure() {
  console.log('🔍 Analyzing Supabase Database Structure...\n');

  // Check for new normalized tables
  const newTables = [
    'users', 'user_profiles', 'user_contacts', 'user_addresses', 
    'user_memberships', 'membership_queue', 'user_payment_methods',
    'user_subscriptions', 'user_payments', 'user_billing_schedules',
    'user_agreements', 'system_audit_logs'
  ];

  // Check for old tables that should be migrated
  const oldTables = ['member', 'queue', 'subscription', 'payment', 'payment_methods', 'queue_entries'];

  console.log('🆕 New Normalized Tables Status:');
  console.log('=================================');
  
  for (const tableName of newTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName} - Not found or no access`);
      } else {
        console.log(`✅ ${tableName} - ${data?.length || 0} rows`);
      }
    } catch (err) {
      console.log(`❌ ${tableName} - Error: ${err.message}`);
    }
  }

  console.log('\n📦 Legacy Tables Status:');
  console.log('========================');
  
  for (const tableName of oldTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`✅ ${tableName} - Cleaned up (not found)`);
      } else {
        console.log(`⚠️  ${tableName} - Still exists with ${data?.length || 0} rows`);
      }
    } catch (err) {
      console.log(`✅ ${tableName} - Cleaned up (error accessing)`);
    }
  }

  // Test some specific table queries
  console.log('\n📊 Sample Data Analysis:');
  console.log('========================');

  try {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, status, created_at')
      .limit(5);

    if (!usersError && usersData) {
      console.log(`\n👥 Users table sample (${usersData.length} records):`);
      usersData.forEach(user => {
        console.log(`   • ${user.email} - ${user.status} (${user.created_at})`);
      });
    }
  } catch (err) {
    console.log('Users table not accessible');
  }

  try {
    const { data: queueData, error: queueError } = await supabase
      .from('membership_queue')
      .select('user_id, queue_position, subscription_active, total_months_subscribed')
      .limit(5);

    if (!queueError && queueData) {
      console.log(`\n🔄 Membership queue sample (${queueData.length} records):`);
      queueData.forEach(entry => {
        console.log(`   • Position ${entry.queue_position} - Active: ${entry.subscription_active} - Months: ${entry.total_months_subscribed}`);
      });
    }
  } catch (err) {
    console.log('Membership queue table not accessible');
  }

  try {
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('user_subscriptions')
      .select('user_id, status, current_period_start, current_period_end')
      .limit(5);

    if (!subscriptionsError && subscriptionsData) {
      console.log(`\n💳 User subscriptions sample (${subscriptionsData.length} records):`);
      subscriptionsData.forEach(sub => {
        console.log(`   • Status: ${sub.status} - Period: ${sub.current_period_start} to ${sub.current_period_end}`);
      });
    }
  } catch (err) {
    console.log('User subscriptions table not accessible');
  }
}

analyzeDatabaseStructure();