/**
 * Drizzle Setup Script
 * 
 * This script helps set up Drizzle ORM with your existing Supabase database.
 * Run with: npx tsx scripts/setup-drizzle.ts
 */

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function setupDrizzle() {
  console.log('🚀 Setting up Drizzle ORM...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful\n');

    // Check if tables exist
    console.log('2. Checking existing tables...');
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = result as unknown as Array<{ table_name: string }>;
    
    console.log('📋 Existing tables:');
    tables.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    // Check for Drizzle tables
    const drizzleTables = [
      'admin_accounts',
      'admin_sessions',
      'two_factor_auth',
      'audit_logs',
      'users',
      'subscriptions',
      'transactions',
      'payouts',
      'membership_queue',
      'billing_schedules',
      'admin_alerts'
    ];

    console.log('3. Checking Drizzle schema tables...');
    const existingTableNames = tables.map((row) => row.table_name);
    const missingTables = drizzleTables.filter(
      table => !existingTableNames.includes(table)
    );

    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables:');
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log('\n💡 Run "npm run db:push" to create missing tables\n');
    } else {
      console.log('✅ All Drizzle tables exist\n');
    }

    // Check for old Supabase tables that might need migration
    console.log('4. Checking for legacy tables...');
    const legacyTables = ['admin', 'admin_2fa_codes', 'user_audit_logs'];
    const foundLegacyTables = legacyTables.filter(
      table => existingTableNames.includes(table)
    );

    if (foundLegacyTables.length > 0) {
      console.log('📦 Found legacy tables:');
      foundLegacyTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log('\n💡 Consider migrating data from legacy tables to new schema\n');
    } else {
      console.log('✅ No legacy tables found\n');
    }

    console.log('✨ Setup check complete!\n');
    console.log('Next steps:');
    console.log('1. Run "npm run db:push" to sync schema with database');
    console.log('2. Run "npm run db:studio" to explore your database');
    console.log('3. Test the migrated API routes');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }

  process.exit(0);
}

setupDrizzle();
