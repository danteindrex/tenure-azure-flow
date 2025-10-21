const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function testQueueRealData() {
  console.log('🧪 Testing Queue Dashboard with Real Data...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Fetch queue data
    console.log('1️⃣ Fetching queue data...');
    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .select('*')
      .order('queue_position', { ascending: true });

    if (queueError) {
      console.log('❌ Queue data fetch failed:', queueError.message);
      return;
    }

    console.log(`✅ Queue data fetched: ${queueData.length} records`);
    queueData.forEach((member, index) => {
      console.log(`   ${index + 1}. Position ${member.queue_position}: Member ${member.memberid} (${member.subscription_active ? 'Active' : 'Inactive'})`);
    });

    // Test 2: Fetch member data for queue members
    console.log('\n2️⃣ Fetching member data for queue members...');
    for (const queueMember of queueData) {
      try {
        const { data: memberData, error: memberError } = await supabase
          .from('member')
          .select('name, email, status, join_date')
          .eq('member_id', queueMember.memberid)
          .single();

        if (memberError) {
          console.log(`   ❌ Member ${queueMember.memberid}: Not found in member table`);
        } else {
          console.log(`   ✅ Member ${queueMember.memberid}: ${memberData.name} (${memberData.email})`);
        }
      } catch (err) {
        console.log(`   ❌ Member ${queueMember.memberid}: Error - ${err.message}`);
      }
    }

    // Test 3: Calculate statistics
    console.log('\n3️⃣ Calculating statistics...');
    const activeMembers = queueData.filter(member => member.subscription_active).length;
    const eligibleMembers = queueData.filter(member => member.is_eligible).length;
    const totalRevenue = queueData.reduce((sum, member) => sum + (member.lifetime_payment_total || 0), 0);

    console.log(`   Active Members: ${activeMembers}`);
    console.log(`   Eligible Members: ${eligibleMembers}`);
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);

    // Test 4: Test payment data
    console.log('\n4️⃣ Testing payment data...');
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment')
      .select('amount')
      .eq('status', 'Completed');

    if (paymentError) {
      console.log('   ❌ Payment data fetch failed:', paymentError.message);
    } else {
      const paymentRevenue = paymentData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      console.log(`   ✅ Payment revenue: $${paymentRevenue.toFixed(2)} (${paymentData.length} payments)`);
    }

    // Test 5: Simulate the transformed data
    console.log('\n5️⃣ Simulating transformed data for UI...');
    const transformedData = await Promise.all(
      queueData.map(async (item) => {
        let memberData = null;
        try {
          const { data: member } = await supabase
            .from('member')
            .select('name, email, status, join_date')
            .eq('member_id', item.memberid)
            .single();
          memberData = member;
        } catch (err) {
          // Member not found, use fallback
        }

        return {
          ...item,
          member_name: memberData?.name || `Member ${item.memberid}`,
          member_email: memberData?.email || `member${item.memberid}@example.com`,
          member_status: memberData?.status || (item.subscription_active ? 'Active' : 'Inactive'),
          member_join_date: memberData?.join_date || item.joined_at?.split('T')[0] || ''
        };
      })
    );

    console.log('   Transformed data for UI:');
    transformedData.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.member_name} (${member.member_email}) - ${member.member_status}`);
      console.log(`      Position: ${member.queue_position}, Eligible: ${member.is_eligible}, Revenue: $${member.lifetime_payment_total}`);
    });

    console.log('\n🎉 Queue dashboard is ready with real data!');
    console.log('\n📊 Summary:');
    console.log(`   - ${queueData.length} queue members`);
    console.log(`   - ${activeMembers} active subscriptions`);
    console.log(`   - ${eligibleMembers} eligible for payouts`);
    console.log(`   - $${totalRevenue.toFixed(2)} total lifetime payments`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQueueRealData();
