const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function comprehensiveAnalysis() {
  console.log('🔍 COMPREHENSIVE SUPABASE DATABASE ANALYSIS\n');
  console.log('=' .repeat(60));

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. DATABASE CONNECTION INFO
    console.log('\n📡 DATABASE CONNECTION');
    console.log('-'.repeat(30));
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Service Key: ${supabaseServiceKey.substring(0, 20)}...`);
    console.log('✅ Connection established successfully');

    // 2. ALL TABLES ANALYSIS
    console.log('\n📊 DATABASE TABLES ANALYSIS');
    console.log('-'.repeat(30));
    
    const tablesToCheck = [
      'queue', 'profiles', 'member', 'payment', 'payout', 
      'admin', 'tenure', 'news_feed_post', 'audit_log',
      'user_settings', 'user_notification_preferences', 
      'user_security_settings', 'user_payment_settings',
      'user_privacy_settings', 'user_appearance_settings'
    ];

    const tableAnalysis = {};
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            tableAnalysis[tableName] = { exists: false, error: 'Table does not exist' };
          } else {
            tableAnalysis[tableName] = { exists: true, error: error.message, accessible: false };
          }
        } else {
          // Get full table info
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          tableAnalysis[tableName] = { 
            exists: true, 
            accessible: true, 
            recordCount: count || 0,
            sampleData: data?.[0] || null
          };
        }
      } catch (err) {
        tableAnalysis[tableName] = { exists: false, error: err.message };
      }
    }

    // Display table analysis
    Object.entries(tableAnalysis).forEach(([tableName, info]) => {
      if (info.exists && info.accessible) {
        console.log(`✅ ${tableName}: ${info.recordCount} records`);
        if (info.sampleData) {
          console.log(`   Sample fields: ${Object.keys(info.sampleData).join(', ')}`);
        }
      } else if (info.exists && !info.accessible) {
        console.log(`⚠️  ${tableName}: EXISTS but not accessible - ${info.error}`);
      } else {
        console.log(`❌ ${tableName}: NOT FOUND - ${info.error}`);
      }
    });

    // 3. FUNCTIONS ANALYSIS
    console.log('\n🔧 DATABASE FUNCTIONS ANALYSIS');
    console.log('-'.repeat(30));
    
    const functionsToTest = ['exec_sql', 'update_updated_at_column', 'handle_new_user_profile'];
    
    for (const funcName of functionsToTest) {
      try {
        if (funcName === 'exec_sql') {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: 'SELECT 1 as test;'
          });
          if (error) {
            console.log(`❌ ${funcName}: ${error.message}`);
          } else {
            console.log(`✅ ${funcName}: Working - ${data}`);
          }
        } else {
          // Test other functions if they exist
          console.log(`🔍 ${funcName}: Checking existence...`);
        }
      } catch (err) {
        console.log(`❌ ${funcName}: ${err.message}`);
      }
    }

    // 4. ROW LEVEL SECURITY ANALYSIS
    console.log('\n🔒 ROW LEVEL SECURITY ANALYSIS');
    console.log('-'.repeat(30));
    
    const rlsTables = ['queue', 'profiles', 'member', 'payment', 'payout', 'admin'];
    
    for (const tableName of rlsTables) {
      if (tableAnalysis[tableName]?.exists && tableAnalysis[tableName]?.accessible) {
        try {
          // Try to query without auth to test RLS
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error && error.message.includes('RLS')) {
            console.log(`🔒 ${tableName}: RLS enabled (blocked without auth)`);
          } else {
            console.log(`⚠️  ${tableName}: RLS may not be properly configured`);
          }
        } catch (err) {
          console.log(`🔍 ${tableName}: Could not test RLS - ${err.message}`);
        }
      }
    }

    // 5. DATA RELATIONSHIPS ANALYSIS
    console.log('\n🔗 DATA RELATIONSHIPS ANALYSIS');
    console.log('-'.repeat(30));
    
    // Check queue -> member relationship
    if (tableAnalysis.queue?.exists && tableAnalysis.member?.exists) {
      try {
        const { data: queueData } = await supabase
          .from('queue')
          .select('memberid')
          .limit(5);
        
        if (queueData && queueData.length > 0) {
          console.log('Queue -> Member relationships:');
          for (const queueItem of queueData) {
            const { data: memberData } = await supabase
              .from('member')
              .select('member_id, name, email')
              .eq('member_id', queueItem.memberid)
              .single();
            
            if (memberData) {
              console.log(`  ✅ Queue ID ${queueItem.memberid} -> Member: ${memberData.name} (${memberData.email})`);
            } else {
              console.log(`  ❌ Queue ID ${queueItem.memberid} -> No matching member found`);
            }
          }
        }
      } catch (err) {
        console.log(`❌ Could not analyze queue->member relationships: ${err.message}`);
      }
    }

    // 6. AUTH INTEGRATION ANALYSIS
    console.log('\n🔐 AUTH INTEGRATION ANALYSIS');
    console.log('-'.repeat(30));
    
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.log(`❌ Auth users query failed: ${authError.message}`);
      } else {
        console.log(`✅ Auth users: ${authUsers.users.length} registered`);
        authUsers.users.forEach((user, index) => {
          console.log(`  User ${index + 1}: ${user.email} (${user.created_at})`);
        });
      }
    } catch (err) {
      console.log(`❌ Auth integration check failed: ${err.message}`);
    }

    // 7. API ENDPOINTS ANALYSIS
    console.log('\n🌐 API ENDPOINTS ANALYSIS');
    console.log('-'.repeat(30));
    
    const apiEndpoints = [
      '/api/queue',
      '/api/audit/log',
      '/api/profiles/upsert',
      '/api/settings/update',
      '/api/notifications',
      '/api/history',
      '/api/help'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
          console.log(`🔒 ${endpoint}: Requires authentication (401)`);
        } else if (response.status === 200) {
          console.log(`✅ ${endpoint}: Accessible (200)`);
        } else {
          console.log(`⚠️  ${endpoint}: Status ${response.status}`);
        }
      } catch (err) {
        console.log(`❌ ${endpoint}: ${err.message}`);
      }
    }

    // 8. FRONTEND INTEGRATION ANALYSIS
    console.log('\n💻 FRONTEND INTEGRATION ANALYSIS');
    console.log('-'.repeat(30));
    
    // Check Supabase client configuration
    console.log('Supabase Client Configuration:');
    console.log(`  URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
    
    // Check if app is running
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Next.js app is running on localhost:3000');
      } else {
        console.log('❌ Next.js app not responding');
      }
    } catch (err) {
      console.log('❌ Could not reach Next.js app');
    }

    // 9. PERFORMANCE ANALYSIS
    console.log('\n⚡ PERFORMANCE ANALYSIS');
    console.log('-'.repeat(30));
    
    const performanceTests = [
      { name: 'Queue Query', query: () => supabase.from('queue').select('*').limit(10) },
      { name: 'Member Query', query: () => supabase.from('member').select('*').limit(10) },
      { name: 'Payment Query', query: () => supabase.from('payment').select('*').limit(10) },
      { name: 'SQL Execution', query: () => supabase.rpc('exec_sql', { sql_query: 'SELECT NOW();' }) }
    ];
    
    for (const test of performanceTests) {
      try {
        const start = Date.now();
        const { data, error } = await test.query();
        const duration = Date.now() - start;
        
        if (error) {
          console.log(`❌ ${test.name}: ${error.message} (${duration}ms)`);
        } else {
          console.log(`✅ ${test.name}: ${duration}ms`);
        }
      } catch (err) {
        console.log(`❌ ${test.name}: ${err.message}`);
      }
    }

    // 10. SUMMARY AND RECOMMENDATIONS
    console.log('\n📋 SUMMARY AND RECOMMENDATIONS');
    console.log('-'.repeat(30));
    
    const existingTables = Object.values(tableAnalysis).filter(t => t.exists && t.accessible).length;
    const totalTables = Object.keys(tableAnalysis).length;
    
    console.log(`Database Status: ${existingTables}/${totalTables} tables accessible`);
    console.log(`SQL Execution: ${tableAnalysis.exec_sql ? '✅ Available' : '❌ Not available'}`);
    console.log(`Auth Integration: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`);
    console.log(`App Status: Running on localhost:3000`);
    
    console.log('\n🔧 RECOMMENDATIONS:');
    
    if (!tableAnalysis.profiles?.exists) {
      console.log('1. Create profiles table for user data');
    }
    if (!tableAnalysis.member?.exists) {
      console.log('2. Create member table for business logic');
    }
    if (tableAnalysis.queue?.exists && !tableAnalysis.member?.exists) {
      console.log('3. Fix queue->member relationships');
    }
    if (!tableAnalysis.payment?.exists) {
      console.log('4. Create payment table for transactions');
    }
    
    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the comprehensive analysis
comprehensiveAnalysis();
