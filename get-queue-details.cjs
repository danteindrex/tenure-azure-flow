const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function getQueueDetails() {
  console.log('🎯 Getting detailed queue table information...\n');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all queue records
    console.log('📊 All queue records:');
    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .select('*')
      .order('queue_position');

    if (queueError) {
      console.log('❌ Error fetching queue data:', queueError.message);
      return;
    }

    console.log(`✅ Found ${queueData.length} queue records:`);
    queueData.forEach((record, index) => {
      console.log(`\n  Record ${index + 1}:`);
      console.log(`    ID: ${record.id}`);
      console.log(`    Member ID: ${record.memberid}`);
      console.log(`    Queue Position: ${record.queue_position}`);
      console.log(`    Joined At: ${record.joined_at}`);
      console.log(`    Is Eligible: ${record.is_eligible}`);
      console.log(`    Subscription Active: ${record.subscription_active}`);
      console.log(`    Total Months Subscribed: ${record.total_months_subscribed}`);
      console.log(`    Last Payment Date: ${record.last_payment_date || 'None'}`);
      console.log(`    Lifetime Payment Total: $${record.lifetime_payment_total}`);
      console.log(`    Has Received Payout: ${record.has_received_payout}`);
      console.log(`    Notes: ${record.notes || 'None'}`);
    });

    // Get member information for queue members
    console.log('\n👥 Member information for queue members:');
    for (const queueRecord of queueData) {
      try {
        const { data: memberData, error: memberError } = await supabase
          .from('member')
          .select('*')
          .eq('member_id', queueRecord.memberid)
          .single();

        if (memberError) {
          console.log(`   Member ID ${queueRecord.memberid}: ❌ Not found in member table`);
        } else {
          console.log(`   Member ID ${queueRecord.memberid}:`);
          console.log(`     Name: ${memberData.name || 'N/A'}`);
          console.log(`     Email: ${memberData.email || 'N/A'}`);
          console.log(`     Status: ${memberData.status || 'N/A'}`);
          console.log(`     Join Date: ${memberData.join_date || 'N/A'}`);
        }
      } catch (err) {
        console.log(`   Member ID ${queueRecord.memberid}: ❌ Error - ${err.message}`);
      }
    }

    // Get payment information
    console.log('\n💳 Payment information:');
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment')
      .select('*')
      .order('payment_date', { ascending: false });

    if (paymentError) {
      console.log('❌ Error fetching payment data:', paymentError.message);
    } else {
      console.log(`✅ Found ${paymentData.length} payment records`);
      if (paymentData.length > 0) {
        const totalRevenue = paymentData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
        
        console.log('\n   Recent payments:');
        paymentData.slice(0, 5).forEach((payment, index) => {
          console.log(`     ${index + 1}. $${payment.amount} - ${payment.payment_date} (${payment.status})`);
        });
      }
    }

    // Get admin information
    console.log('\n👨‍💼 Admin information:');
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('*');

    if (adminError) {
      console.log('❌ Error fetching admin data:', adminError.message);
    } else {
      console.log(`✅ Found ${adminData.length} admin records`);
      adminData.forEach((admin, index) => {
        console.log(`   Admin ${index + 1}:`);
        console.log(`     Email: ${admin.email}`);
        console.log(`     Full Name: ${admin.full_name || 'N/A'}`);
        console.log(`     Role: ${admin.role || 'N/A'}`);
        console.log(`     Status: ${admin.status || 'N/A'}`);
      });
    }

    // Test the exec_sql function with a more complex query
    console.log('\n🔧 Testing exec_sql with complex query:');
    try {
      const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT 
            q.queue_position,
            q.is_eligible,
            q.subscription_active,
            q.total_months_subscribed,
            q.lifetime_payment_total,
            m.name as member_name,
            m.email as member_email
          FROM queue q
          LEFT JOIN member m ON q.memberid = m.member_id
          ORDER BY q.queue_position;
        `
      });

      if (sqlError) {
        console.log('❌ Complex SQL query failed:', sqlError.message);
      } else {
        console.log('✅ Complex SQL query successful:', sqlResult);
      }
    } catch (err) {
      console.log('❌ Complex SQL query error:', err.message);
    }

  } catch (error) {
    console.error('❌ Error getting queue details:', error);
  }
}

// Run the check
getQueueDetails();
