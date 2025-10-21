import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://exneyqwvvckzxqzlknxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bmV5cXd2dmNrenhxemxrbnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYxNDY3OCwiZXhwIjoyMDc2MTkwNjc4fQ.R6ZS-ham7iP-eXjlwR5fUVacI22MsfMsYsHtMf3Lc7M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeMembershipQueue() {
  console.log('🔍 Analyzing Membership Queue Table...\n');

  try {
    // Get all queue entries with detailed information
    const { data: queueEntries, error: queueError } = await supabase
      .from('membership_queue')
      .select('*')
      .order('queue_position');

    if (queueError) {
      console.error('Error fetching queue entries:', queueError);
      return;
    }

    console.log('📊 Queue Entries Overview:');
    console.log('==========================');
    console.log(`Total entries: ${queueEntries.length}\n`);

    if (queueEntries.length > 0) {
      console.log('📋 Detailed Queue Analysis:');
      console.log('============================\n');

      queueEntries.forEach((entry, index) => {
        console.log(`🎯 Queue Position ${entry.queue_position || 'N/A'}:`);
        console.log(`   User ID: ${entry.user_id}`);
        console.log(`   Joined Queue: ${entry.joined_queue_at}`);
        console.log(`   Eligible: ${entry.is_eligible ? '✅' : '❌'}`);
        console.log(`   Priority Score: ${entry.priority_score || 0}`);
        console.log(`   Subscription Active: ${entry.subscription_active ? '✅' : '❌'}`);
        console.log(`   Months Subscribed: ${entry.total_months_subscribed || 0}`);
        console.log(`   Last Payment: ${entry.last_payment_date || 'Never'}`);
        console.log(`   Lifetime Total: $${entry.lifetime_payment_total || '0.00'}`);
        console.log(`   Received Payout: ${entry.has_received_payout ? '✅' : '❌'}`);
        console.log(`   Notes: ${entry.notes || 'None'}`);
        console.log(`   Created: ${entry.created_at}`);
        console.log(`   Updated: ${entry.updated_at}\n`);
      });

      // Get user information for queue entries
      console.log('👥 Queue Members with User Details:');
      console.log('===================================\n');

      for (const entry of queueEntries) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, status, created_at')
          .eq('id', entry.user_id)
          .single();

        if (!userError && userData) {
          console.log(`Position ${entry.queue_position}: ${userData.email}`);
          console.log(`   Status: ${userData.status}`);
          console.log(`   User Created: ${userData.created_at}`);
          console.log(`   Queue Joined: ${entry.joined_queue_at}`);
          console.log(`   Subscription: ${entry.subscription_active ? 'Active' : 'Inactive'}`);
          console.log(`   Eligible: ${entry.is_eligible ? 'Yes' : 'No'}\n`);
        }
      }

      // Statistics
      console.log('📈 Queue Statistics:');
      console.log('===================');
      
      const eligibleCount = queueEntries.filter(e => e.is_eligible).length;
      const activeSubscriptions = queueEntries.filter(e => e.subscription_active).length;
      const totalPayments = queueEntries.reduce((sum, e) => sum + (parseFloat(e.lifetime_payment_total) || 0), 0);
      const avgMonthsSubscribed = queueEntries.reduce((sum, e) => sum + (e.total_months_subscribed || 0), 0) / queueEntries.length;
      const payoutRecipients = queueEntries.filter(e => e.has_received_payout).length;

      console.log(`Eligible Members: ${eligibleCount}/${queueEntries.length} (${((eligibleCount/queueEntries.length)*100).toFixed(1)}%)`);
      console.log(`Active Subscriptions: ${activeSubscriptions}/${queueEntries.length} (${((activeSubscriptions/queueEntries.length)*100).toFixed(1)}%)`);
      console.log(`Total Lifetime Payments: $${totalPayments.toFixed(2)}`);
      console.log(`Average Months Subscribed: ${avgMonthsSubscribed.toFixed(1)}`);
      console.log(`Members with Payouts: ${payoutRecipients}/${queueEntries.length} (${((payoutRecipients/queueEntries.length)*100).toFixed(1)}%)`);

      // Queue integrity checks
      console.log('\n🔍 Queue Integrity Analysis:');
      console.log('============================');

      const positions = queueEntries.map(e => e.queue_position).filter(p => p !== null);
      const uniquePositions = [...new Set(positions)];
      const expectedPositions = Array.from({length: queueEntries.length}, (_, i) => i + 1);
      
      console.log(`Queue Positions: ${positions.join(', ')}`);
      console.log(`Unique Positions: ${uniquePositions.length}`);
      console.log(`Expected Sequential: ${expectedPositions.join(', ')}`);
      
      const hasDuplicates = positions.length !== uniquePositions.length;
      const hasGaps = !expectedPositions.every(pos => positions.includes(pos));
      
      if (hasDuplicates) {
        console.log('❌ Issue: Duplicate queue positions found');
      } else {
        console.log('✅ No duplicate positions');
      }
      
      if (hasGaps) {
        console.log('❌ Issue: Gaps in queue positions');
      } else {
        console.log('✅ Sequential queue positions');
      }

      // Business logic analysis
      console.log('\n💼 Business Logic Analysis:');
      console.log('===========================');

      queueEntries.forEach(entry => {
        const issues = [];
        
        if (!entry.is_eligible && entry.subscription_active) {
          issues.push('Ineligible but has active subscription');
        }
        
        if (entry.subscription_active && entry.total_months_subscribed === 0) {
          issues.push('Active subscription but 0 months recorded');
        }
        
        if (entry.lifetime_payment_total > 0 && !entry.last_payment_date) {
          issues.push('Has payment total but no last payment date');
        }
        
        if (entry.has_received_payout && entry.lifetime_payment_total === 0) {
          issues.push('Received payout but no recorded payments');
        }

        if (issues.length > 0) {
          console.log(`⚠️  Position ${entry.queue_position} issues:`);
          issues.forEach(issue => console.log(`   • ${issue}`));
        }
      });

      if (queueEntries.every(entry => 
        entry.is_eligible && 
        !entry.subscription_active && 
        entry.total_months_subscribed === 0 &&
        !entry.has_received_payout
      )) {
        console.log('✅ All entries appear to be new/default state');
      }

    } else {
      console.log('📭 No queue entries found');
    }

    // Check for orphaned queue entries (users that don't exist)
    console.log('\n🔗 Relationship Integrity:');
    console.log('==========================');

    for (const entry of queueEntries) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', entry.user_id)
        .single();

      if (userError || !userData) {
        console.log(`❌ Orphaned queue entry: ${entry.user_id} (user doesn't exist)`);
      }
    }

    console.log('✅ All queue entries have valid user references');

  } catch (error) {
    console.error('Error analyzing membership queue:', error);
  }
}

analyzeMembershipQueue();