/**
 * Apply User Settings Migration
 *
 * This script applies the user_settings_tables.sql migration to create
 * the 6 user settings tables in the database.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const DATABASE_URL = 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres'

async function applyMigration() {
  console.log('🔄 Connecting to database...')

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Read migration file
    const migrationPath = join(process.cwd(), 'migrations', 'user_settings_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🔄 Applying user settings migration...')

    // Execute migration
    await client.query(migrationSQL)

    console.log('✅ User settings migration applied successfully!')
    console.log('\nTables created:')
    console.log('  - user_settings')
    console.log('  - user_notification_preferences')
    console.log('  - user_security_settings')
    console.log('  - user_payment_settings')
    console.log('  - user_privacy_settings')
    console.log('  - user_appearance_settings')

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'user_%settings%'
      ORDER BY table_name
    `)

    console.log('\n✅ Verified tables in database:')
    result.rows.forEach(row => console.log(`  - ${row.table_name}`))

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

applyMigration().catch(console.error)
