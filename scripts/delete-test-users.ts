#!/usr/bin/env tsx

/**
 * Delete All Test Users Script
 * 
 * This script safely deletes all user data while preserving table structure.
 * It uses transactions to ensure data integrity.
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

async function deleteTestUsers() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('🔗 Connected to database')

    // Start transaction
    await client.query('BEGIN')
    console.log('🚀 Starting user deletion...')

    // Get initial counts
    const initialCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM "user") as better_auth_users_count,
        (SELECT COUNT(*) FROM Member) as members_count,
        (SELECT COUNT(*) FROM user_profiles) as profiles_count
    `)
    
    console.log('📊 Initial counts:', initialCounts.rows[0])

    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = replica')

    // Delete in dependency order
    const deletionSteps = [
      { table: 'system_audit_logs', description: 'System audit logs' },
      { table: 'user_audit_logs', description: 'User audit logs' },
      { table: 'auditlog', description: 'Audit logs' },
      
      { table: 'user_settings', description: 'User settings' },
      { table: 'user_notification_preferences', description: 'Notification preferences' },
      { table: 'user_security_settings', description: 'Security settings' },
      { table: 'user_payment_settings', description: 'Payment settings' },
      { table: 'user_privacy_settings', description: 'Privacy settings' },
      { table: 'user_appearance_settings', description: 'Appearance settings' },
      
      { table: 'user_payments', description: 'User payments' },
      { table: 'user_payment_methods', description: 'Payment methods' },
      { table: 'user_subscriptions', description: 'User subscriptions' },
      { table: 'user_billing_schedules', description: 'Billing schedules' },
      
      { table: 'payout_management', description: 'Payout management' },
      { table: 'tax_forms', description: 'Tax forms' },
      
      { table: 'verification_codes', description: 'Verification codes' },
      { table: 'verification', description: 'Verification records' },
      { table: 'kyc_verification', description: 'KYC verification' },
      { table: 'two_factor', description: 'Two-factor auth' },
      { table: 'passkey', description: 'Passkeys' },
      
      { table: 'user_profiles', description: 'User profiles' },
      { table: 'user_contacts', description: 'User contacts' },
      { table: 'user_addresses', description: 'User addresses' },
      { table: 'user_agreements', description: 'User agreements' },
      { table: 'user_memberships', description: 'User memberships' },
      
      { table: 'membership_queue', description: 'Membership queue' },
      
      { table: 'transaction_monitoring', description: 'Transaction monitoring' },
      { table: 'disputes', description: 'Disputes' },
      
      { table: 'signup_sessions', description: 'Signup sessions' },
      
      { table: 'session', description: 'Better Auth sessions' },
      { table: 'account', description: 'Better Auth accounts' },
      
      { table: 'organization_member', description: 'Organization members' },
      { table: 'organization_invitation', description: 'Organization invitations' },
      
      // Business logic tables
      { table: 'Payout', description: 'Business payouts' },
      { table: 'Payment', description: 'Business payments' },
      { table: 'Tenure', description: 'Business tenure records' },
      { table: 'Member', description: 'Business members' },
      
      // Main user tables last
      { table: 'users', description: 'Main users table' },
      { table: '"user"', description: 'Better Auth users table' },
    ]

    let totalDeleted = 0

    for (const step of deletionSteps) {
      try {
        const result = await client.query(`DELETE FROM ${step.table}`)
        const deletedCount = result.rowCount || 0
        if (deletedCount > 0) {
          console.log(`🗑️  Deleted ${deletedCount} records from ${step.description}`)
          totalDeleted += deletedCount
        }
      } catch (error: any) {
        // Table might not exist, continue
        if (!error.message.includes('does not exist')) {
          console.warn(`⚠️  Warning deleting from ${step.table}:`, error.message)
        }
      }
    }

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT')

    // Reset sequences
    console.log('🔄 Resetting sequences...')
    
    const sequences = await client.query(`
      SELECT schemaname, sequencename 
      FROM pg_sequences 
      WHERE schemaname = 'public' 
      AND sequencename NOT LIKE 'admin%'
    `)

    for (const seq of sequences.rows) {
      try {
        await client.query(`ALTER SEQUENCE ${seq.schemaname}.${seq.sequencename} RESTART WITH 1`)
      } catch (error: any) {
        console.warn(`⚠️  Warning resetting sequence ${seq.sequencename}:`, error.message)
      }
    }

    // Commit transaction
    await client.query('COMMIT')
    console.log('✅ Transaction committed')

    // Verify deletion
    const finalCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM "user") as better_auth_users_count,
        (SELECT COUNT(*) FROM Member) as members_count,
        (SELECT COUNT(*) FROM user_profiles) as profiles_count
    `)

    console.log('📊 Final counts:', finalCounts.rows[0])
    console.log(`🎉 Successfully deleted ${totalDeleted} total records`)
    console.log('✅ All test users deleted! Table structures preserved.')

  } catch (error) {
    console.error('❌ Error during deletion:', error)
    try {
      await client.query('ROLLBACK')
      console.log('🔄 Transaction rolled back')
    } catch (rollbackError) {
      console.error('❌ Error rolling back:', rollbackError)
    }
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This will delete ALL user data from the database!')
console.log('📋 Tables that will be cleared:')
console.log('   - All user accounts and profiles')
console.log('   - All subscriptions and payments')
console.log('   - All verification and security data')
console.log('   - All business members and tenure records')
console.log('   - Table structures will be preserved')
console.log('')

if (process.argv.includes('--confirm')) {
  deleteTestUsers()
} else {
  console.log('🛡️  To proceed, run: npm run delete-users --confirm')
  console.log('   or: tsx scripts/delete-test-users.ts --confirm')
}