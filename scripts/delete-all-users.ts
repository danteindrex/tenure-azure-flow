#!/usr/bin/env tsx

/**
 * Delete All Users Script
 * Simple script to delete all user data from the database
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found')
  process.exit(1)
}

async function deleteAllUsers() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('🔗 Connected to database')

    await client.query('BEGIN')

    // Disable foreign key checks
    await client.query('SET session_replication_role = replica')

    // Delete all user-related data
    const tables = [
      'system_audit_logs',
      'user_audit_logs', 
      'auditlog',
      'user_settings',
      'user_notification_preferences',
      'user_security_settings',
      'user_payment_settings',
      'user_privacy_settings',
      'user_appearance_settings',
      'user_payments',
      'user_payment_methods',
      'user_subscriptions',
      'user_billing_schedules',
      'payout_management',
      'tax_forms',
      'verification_codes',
      'verification',
      'kyc_verification',
      'two_factor',
      'passkey',
      'user_profiles',
      'user_contacts',
      'user_addresses',
      'user_agreements',
      'user_memberships',
      'membership_queue',
      'transaction_monitoring',
      'disputes',
      'signup_sessions',
      'session',
      'account',
      'organization_member',
      'organization_invitation',
      'Payout',
      'Payment', 
      'Tenure',
      'Member',
      'users',
      '"user"'
    ]

    let totalDeleted = 0

    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`)
        const count = result.rowCount || 0
        if (count > 0) {
          console.log(`🗑️  Deleted ${count} records from ${table}`)
          totalDeleted += count
        }
      } catch (error: any) {
        if (!error.message.includes('does not exist')) {
          console.warn(`⚠️  ${table}:`, error.message)
        }
      }
    }

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT')

    await client.query('COMMIT')
    
    console.log(`✅ Deleted ${totalDeleted} total records`)
    console.log('🎉 All users deleted successfully!')

  } catch (error) {
    console.error('❌ Error:', error)
    await client.query('ROLLBACK')
    process.exit(1)
  } finally {
    await client.end()
  }
}

deleteAllUsers()
deleteAllUsers()