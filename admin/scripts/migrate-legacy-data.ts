/**
 * Legacy Data Migration Script
 * 
 * Migrates data from old Supabase tables to new Drizzle schema.
 * Run with: npx tsx scripts/migrate-legacy-data.ts
 * 
 * WARNING: Review and test this script before running in production!
 */

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { adminAccounts, twoFactorAuth, auditLogs } from '../lib/db/schema';

async function migrateLegacyData() {
  console.log('🔄 Starting legacy data migration...\n');

  try {
    // Check if legacy tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('admin', 'admin_2fa_codes', 'user_audit_logs')
    `);

    const tables = tablesResult as unknown as Array<{ table_name: string }>;
    const existingTables = tables.map((row) => row.table_name);

    if (existingTables.length === 0) {
      console.log('✅ No legacy tables found. Nothing to migrate.\n');
      return;
    }

    console.log('📋 Found legacy tables:', existingTables.join(', '), '\n');

    // Migrate admin table to admin_accounts
    if (existingTables.includes('admin')) {
      console.log('1. Migrating admin → admin_accounts...');
      
      // Check if admin_accounts table exists
      const adminAccountsExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admin_accounts'
        )
      `);

      const existsResult = adminAccountsExists as unknown as Array<{ exists: boolean }>;
      if (!existsResult[0].exists) {
        console.log('⚠️  admin_accounts table does not exist. Run "npm run db:push" first.\n');
      } else {
        // Get count of records to migrate
        const countResult = await db.execute(sql`SELECT COUNT(*) FROM admin`);
        const countData = countResult as unknown as Array<{ count: string }>;
        const count = countData[0].count;
        
        console.log(`   Found ${count} admin records to migrate`);

        // Migrate data (adjust field mapping as needed)
        await db.execute(sql`
          INSERT INTO admin_accounts (id, email, password, name, role, status, two_factor_enabled, phone_number, last_login, created_at, updated_at)
          SELECT 
            id,
            email,
            COALESCE(password, hash) as password,
            name,
            CAST(role as admin_role),
            CAST(COALESCE(status, 'active') as admin_status),
            COALESCE(two_factor_enabled, false),
            phone_number,
            last_login,
            created_at,
            COALESCE(updated_at, created_at)
          FROM admin
          ON CONFLICT (id) DO NOTHING
        `);

        console.log('✅ Admin accounts migrated\n');
      }
    }

    // Migrate admin_2fa_codes to two_factor_auth
    if (existingTables.includes('admin_2fa_codes')) {
      console.log('2. Migrating admin_2fa_codes → two_factor_auth...');
      
      const twoFactorExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'two_factor_auth'
        )
      `);

      const existsResult = twoFactorExists as unknown as Array<{ exists: boolean }>;
      if (!existsResult[0].exists) {
        console.log('⚠️  two_factor_auth table does not exist. Run "npm run db:push" first.\n');
      } else {
        const countResult = await db.execute(sql`SELECT COUNT(*) FROM admin_2fa_codes`);
        const countData = countResult as unknown as Array<{ count: string }>;
        const count = countData[0].count;
        
        console.log(`   Found ${count} 2FA records to migrate`);

        await db.execute(sql`
          INSERT INTO two_factor_auth (id, admin_id, code, expires_at, verified, created_at)
          SELECT 
            id,
            admin_id,
            code,
            expires_at,
            COALESCE(used, false) as verified,
            created_at
          FROM admin_2fa_codes
          WHERE expires_at > NOW()
          ON CONFLICT (id) DO NOTHING
        `);

        console.log('✅ 2FA codes migrated (only non-expired)\n');
      }
    }

    // Migrate user_audit_logs to audit_logs
    if (existingTables.includes('user_audit_logs')) {
      console.log('3. Migrating user_audit_logs → audit_logs...');
      
      const auditLogsExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_logs'
        )
      `);

      const existsResult = auditLogsExists as unknown as Array<{ exists: boolean }>;
      if (!existsResult[0].exists) {
        console.log('⚠️  audit_logs table does not exist. Run "npm run db:push" first.\n');
      } else {
        const countResult = await db.execute(sql`SELECT COUNT(*) FROM user_audit_logs`);
        const countData = countResult as unknown as Array<{ count: string }>;
        const count = countData[0].count;
        
        console.log(`   Found ${count} audit log records to migrate`);

        await db.execute(sql`
          INSERT INTO audit_logs (id, admin_id, admin_email, action, resource, resource_id, details, ip_address, user_agent, status, created_at)
          SELECT 
            id,
            CASE WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
              THEN user_id::uuid 
              ELSE NULL 
            END as admin_id,
            user_id as admin_email,
            CAST(COALESCE(action, 'view') as action_type),
            COALESCE(entity_type, 'unknown') as resource,
            entity_id as resource_id,
            metadata as details,
            ip_address,
            user_agent,
            CASE WHEN success THEN 'success' ELSE 'failed' END as status,
            created_at
          FROM user_audit_logs
          ON CONFLICT (id) DO NOTHING
        `);

        console.log('✅ Audit logs migrated\n');
      }
    }

    console.log('✨ Migration complete!\n');
    console.log('Next steps:');
    console.log('1. Verify migrated data in Drizzle Studio: npm run db:studio');
    console.log('2. Test the application thoroughly');
    console.log('3. Once verified, you can optionally rename/archive legacy tables');
    console.log('   (DO NOT DELETE until you are 100% sure everything works!)');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    console.log('\n⚠️  Migration failed. Please review the error and try again.');
    console.log('💡 Tip: Make sure to backup your database before running migrations!');
    process.exit(1);
  }

  process.exit(0);
}

// Run migration
migrateLegacyData();
