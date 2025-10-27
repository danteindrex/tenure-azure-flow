/**
 * Push Drizzle Migrations to Database
 *
 * This script applies the generated Drizzle migrations to create
 * Better Auth tables in the database.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const DATABASE_URL = 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres'

async function pushMigrations() {
  console.log('🔄 Connecting to database...')

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Read migration file
    const migrationPath = join(process.cwd(), 'drizzle', 'migrations', '0000_wandering_la_nuit.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🔄 Applying Better Auth migrations...')
    console.log('Creating tables:')
    console.log('  - user (Better Auth identity)')
    console.log('  - session (Better Auth sessions)')
    console.log('  - account (OAuth providers)')
    console.log('  - verification (Email/phone codes)')
    console.log('  - passkey (WebAuthn credentials)')
    console.log('  - two_factor (TOTP secrets)')
    console.log('  - organization (Organization management)')
    console.log('  - organization_member (Org members)')
    console.log('  - organization_invitation (Org invites)')

    // Execute migration
    await client.query(migrationSQL)

    console.log('\n✅ Better Auth migrations applied successfully!')

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification', 'passkey', 'two_factor', 'organization', 'organization_member', 'organization_invitation')
      ORDER BY table_name
    `)

    console.log('\n✅ Verified Better Auth tables in database:')
    result.rows.forEach(row => console.log(`  - ${row.table_name}`))

    // Count total tables
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `)

    console.log(`\n📊 Total tables in database: ${countResult.rows[0].count}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

pushMigrations().catch(console.error)
