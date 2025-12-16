import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAuditLogs() {
  console.log('🔧 Adding status column to audit_logs table...\n');

  const sql = fs.readFileSync(
    path.join(__dirname, 'add-status-to-audit-logs.sql'),
    'utf-8'
  );

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Successfully added status column to audit_logs table!');
}

fixAuditLogs();
