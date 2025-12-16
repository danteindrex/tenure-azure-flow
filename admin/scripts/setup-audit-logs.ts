import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAuditLogs() {
  console.log('🔧 Setting up audit logs table...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-audit-logs-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the SQL
    console.log('📝 Creating user_audit_logs table...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative method - direct table creation
      console.log('⚠️  RPC method failed, trying direct creation...');
      
      const { error: createError } = await supabase
        .from('user_audit_logs')
        .select('id')
        .limit(1);

      if (createError && createError.message.includes('does not exist')) {
        console.error('❌ Table does not exist. Please run the SQL manually in Supabase SQL Editor:');
        console.log('\n' + sql + '\n');
        process.exit(1);
      }
    }

    // Verify table exists
    console.log('✅ Verifying table...');
    const { data, error: verifyError } = await supabase
      .from('user_audit_logs')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError.message);
      console.log('\n📋 Please run this SQL in your Supabase SQL Editor:\n');
      console.log(sql);
      process.exit(1);
    }

    console.log('✅ user_audit_logs table is ready!');

    // Insert a test log
    console.log('\n🧪 Inserting test audit log...');
    const { data: testLog, error: insertError } = await supabase
      .from('user_audit_logs')
      .insert({
        action: 'system_test',
        entity_type: 'system',
        entity_id: 'setup-script',
        metadata: { test: true, timestamp: new Date().toISOString() },
        success: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Test insert failed:', insertError.message);
    } else {
      console.log('✅ Test log created:', testLog.id);
    }

    // Query the test log
    console.log('\n🔍 Querying audit logs...');
    const { data: logs, error: queryError } = await supabase
      .from('user_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError) {
      console.error('❌ Query failed:', queryError.message);
    } else {
      console.log(`✅ Found ${logs?.length || 0} audit log(s)`);
      if (logs && logs.length > 0) {
        console.log('\nRecent logs:');
        logs.forEach((log: any) => {
          console.log(`  - ${log.action} (${log.created_at})`);
        });
      }
    }

    console.log('\n✅ Audit logs setup complete!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupAuditLogs();
