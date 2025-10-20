import { createClient } from '@supabase/supabase-js';

// Database connection using environment variables
const supabaseUrl = 'https://exneyqwvvckzxqzlknxv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bmV5cXd2dmNrenhxemxrbnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYxNDY3OCwiZXhwIjoyMDc2MTkwNjc4fQ.R6ZS-ham7iP-eXjlwR5fUVacI22MsfMsYsHtMf3Lc7M';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseConnection() {
    console.log('🔍 Testing Supabase Database Connection...\n');

    try {
        // Test 1: Check if we can connect to Supabase
        console.log('1. Testing basic connection...');
        const { data: connectionTest, error: connectionError } = await supabase
            .from('queue')
            .select('count', { count: 'exact', head: true });

        if (connectionError) {
            console.log('❌ Connection failed:', connectionError.message);
            return;
        }
        console.log('✅ Successfully connected to Supabase');

        // Test 2: Check queue table
        console.log('\n2. Checking queue table...');
        const { data: queueData, error: queueError } = await supabase
            .from('queue')
            .select('*')
            .limit(5);

        if (queueError) {
            console.log('❌ Queue table error:', queueError.message);
        } else {
            console.log(`✅ Queue table exists with ${queueData.length} sample records`);
            if (queueData.length > 0) {
                console.log('📊 Sample queue record:');
                console.log(JSON.stringify(queueData[0], null, 2));
            }
        }

        // Test 3: Check member table
        console.log('\n3. Checking member table...');
        const { data: memberData, error: memberError } = await supabase
            .from('member')
            .select('*')
            .limit(3);

        if (memberError) {
            console.log('❌ Member table error:', memberError.message);
        } else {
            console.log(`✅ Member table exists with ${memberData.length} sample records`);
            if (memberData.length > 0) {
                console.log('👤 Sample member record:');
                console.log(JSON.stringify(memberData[0], null, 2));
            }
        }

        // Test 4: Check payment table
        console.log('\n4. Checking payment table...');
        const { data: paymentData, error: paymentError } = await supabase
            .from('payment')
            .select('*')
            .limit(3);

        if (paymentError) {
            console.log('❌ Payment table error:', paymentError.message);
        } else {
            console.log(`✅ Payment table exists with ${paymentData.length} sample records`);
        }

        // Test 5: Test queue with member join
        console.log('\n5. Testing queue with member data join...');
        const { data: joinData, error: joinError } = await supabase
            .from('queue')
            .select(`
        *,
        member:memberid (
          id,
          name,
          email,
          status
        )
      `)
            .limit(3);

        if (joinError) {
            console.log('❌ Queue-Member join error:', joinError.message);
        } else {
            console.log(`✅ Queue-Member join successful with ${joinData.length} records`);
            if (joinData.length > 0) {
                console.log('🔗 Sample joined record:');
                console.log(JSON.stringify(joinData[0], null, 2));
            }
        }

        // Test 6: Get table counts
        console.log('\n6. Getting table statistics...');

        const tables = ['queue', 'member', 'payment', 'subscription', 'admin'];
        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.log(`❌ ${table}: ${error.message}`);
                } else {
                    console.log(`📊 ${table}: ${count} records`);
                }
            } catch (err) {
                console.log(`❌ ${table}: ${err.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Database test failed:', error.message);
    }
}

// Run the test
testDatabaseConnection().then(() => {
    console.log('\n🏁 Database connection test completed!');
}).catch(console.error);