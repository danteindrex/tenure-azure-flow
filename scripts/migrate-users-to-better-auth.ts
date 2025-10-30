/**
 * Migrate Users from Supabase Auth to Better Auth
 *
 * This script:
 * 1. Copies users from auth.users (Supabase) to user table (Better Auth)
 * 2. Links existing public.users to Better Auth users
 * 3. Migrates OAuth accounts from auth.identities to account table
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const DATABASE_URL = 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres'

async function migrateUsers() {
  console.log('🔄 Connecting to database...')

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Step 1: Copy users from auth.users to Better Auth user table
    console.log('📥 Step 1: Migrating users from Supabase auth to Better Auth...')

    const userMigrationResult = await client.query(`
      INSERT INTO "user" (
        id,
        name,
        email,
        "emailVerified",
        password,
        image,
        "createdAt",
        "updatedAt"
      )
      SELECT
        au.id,
        COALESCE(
          NULLIF(TRIM(CONCAT(
            COALESCE(au.raw_user_meta_data->>'first_name', ''),
            ' ',
            COALESCE(au.raw_user_meta_data->>'last_name', '')
          )), ''),
          SPLIT_PART(au.email, '@', 1)
        ) as name,
        au.email,
        au.email_confirmed_at IS NOT NULL,
        au.encrypted_password,
        au.raw_user_meta_data->>'avatar_url',
        au.created_at,
        au.updated_at
      FROM auth.users au
      LEFT JOIN "user" u ON u.id = au.id
      WHERE u.id IS NULL
      RETURNING id, email
    `)

    console.log(`✅ Migrated ${userMigrationResult.rowCount} users to Better Auth`)

    if (userMigrationResult.rowCount > 0) {
      console.log('\nMigrated users:')
      userMigrationResult.rows.forEach(row => {
        console.log(`  - ${row.email} (${row.id})`)
      })
    }

    // Step 2: Link existing public.users to Better Auth users
    console.log('\n📊 Step 2: Linking existing public.users to Better Auth...')

    const linkResult = await client.query(`
      UPDATE users
      SET user_id = auth_user_id::uuid
      WHERE user_id IS NULL
        AND auth_user_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM "user" WHERE id = auth_user_id::uuid)
      RETURNING id, email
    `)

    console.log(`✅ Linked ${linkResult.rowCount} public.users to Better Auth`)

    // Step 3: Migrate OAuth accounts
    console.log('\n🔐 Step 3: Migrating OAuth accounts...')

    const oauthMigrationResult = await client.query(`
      INSERT INTO "account" (
        "userId",
        "accountId",
        "providerId",
        "accessToken",
        "refreshToken",
        "expiresAt",
        "createdAt",
        "updatedAt"
      )
      SELECT
        ai.user_id,
        ai.id::text,
        ai.provider,
        ai.last_sign_in_at::text,  -- Note: Supabase doesn't store tokens, using last_sign_in as placeholder
        NULL,
        NULL,
        ai.created_at,
        ai.updated_at
      FROM auth.identities ai
      LEFT JOIN "account" a ON a."accountId" = ai.id::text AND a."providerId" = ai.provider
      WHERE a.id IS NULL
      RETURNING "userId", "providerId"
    `)

    console.log(`✅ Migrated ${oauthMigrationResult.rowCount} OAuth accounts`)

    if (oauthMigrationResult.rowCount > 0) {
      const providers = oauthMigrationResult.rows.reduce((acc, row) => {
        acc[row.providerId] = (acc[row.providerId] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('\nOAuth providers:')
      Object.entries(providers).forEach(([provider, count]) => {
        console.log(`  - ${provider}: ${count} account(s)`)
      })
    }

    // Step 4: Verification summary
    console.log('\n📊 Migration Summary:')

    const summaryResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM auth.users) as supabase_users,
        (SELECT COUNT(*) FROM "user") as better_auth_users,
        (SELECT COUNT(*) FROM users) as public_users,
        (SELECT COUNT(*) FROM users WHERE user_id IS NOT NULL) as linked_users,
        (SELECT COUNT(*) FROM "account") as oauth_accounts
    `)

    const summary = summaryResult.rows[0]
    console.log(`  Supabase users (auth.users): ${summary.supabase_users}`)
    console.log(`  Better Auth users ("user"): ${summary.better_auth_users}`)
    console.log(`  Public users (users): ${summary.public_users}`)
    console.log(`  Linked users: ${summary.linked_users}`)
    console.log(`  OAuth accounts: ${summary.oauth_accounts}`)

    // Check for missing links
    if (parseInt(summary.supabase_users) !== parseInt(summary.better_auth_users)) {
      console.log('\n⚠️  Warning: Number of Supabase users does not match Better Auth users')
    }

    if (parseInt(summary.public_users) !== parseInt(summary.linked_users)) {
      const unlinked = parseInt(summary.public_users) - parseInt(summary.linked_users)
      console.log(`\n⚠️  Warning: ${unlinked} public users are not linked to Better Auth`)

      // Show unlinked users
      const unlinkedResult = await client.query(`
        SELECT id, email
        FROM users
        WHERE user_id IS NULL
        LIMIT 5
      `)

      if (unlinkedResult.rowCount > 0) {
        console.log('\nUnlinked users (first 5):')
        unlinkedResult.rows.forEach(row => {
          console.log(`  - ${row.email} (${row.id})`)
        })
      }
    }

    console.log('\n✅ Migration completed successfully!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

migrateUsers().catch(console.error)
