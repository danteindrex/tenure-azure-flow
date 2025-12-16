/**
 * Check user_billing_schedules Table Structure
 */

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function checkBillingSchedulesTable() {
  console.log('🔍 Checking user_billing_schedules table structure...\n');

  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'user_billing_schedules'
      ORDER BY ordinal_position
    `);

    const columns = result as unknown as Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>;

    console.log('📋 user_billing_schedules table columns:');
    columns.forEach((col) => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Get sample data
    console.log('\n📊 Sample data:');
    const sampleData = await db.execute(sql`
      SELECT * FROM user_billing_schedules LIMIT 2
    `);
    console.log(JSON.stringify(sampleData, null, 2));

    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkBillingSchedulesTable();
