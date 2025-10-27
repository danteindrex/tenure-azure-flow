/**
 * Apply Better Auth Tables (IF NOT EXISTS)
 *
 * This script creates only the Better Auth tables that don't already exist.
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const DATABASE_URL = 'postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres'

async function applyBetterAuthTables() {
  console.log('🔄 Connecting to database...')

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    console.log('\n🔄 Creating Better Auth tables (IF NOT EXISTS)...')

    // Check which tables already exist
    const checkResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification', 'passkey', 'two_factor', 'organization', 'organization_member', 'organization_invitation')
    `)

    const existingTables = checkResult.rows.map(r => r.table_name)
    console.log(`\nExisting Better Auth tables: ${existingTables.length > 0 ? existingTables.join(', ') : 'none'}`)

    const tablesToCreate = ['user', 'session', 'account', 'verification', 'passkey', 'two_factor', 'organization', 'organization_member', 'organization_invitation']
    const missingTables = tablesToCreate.filter(t => !existingTables.includes(t))

    if (missingTables.length === 0) {
      console.log('\n✅ All Better Auth tables already exist!')
      return
    }

    console.log(`\nTables to create: ${missingTables.join(', ')}`)

    // Create only missing tables
    const sql = `
      -- Better Auth: Main user identity table
      CREATE TABLE IF NOT EXISTS "user" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "password" text,
        "image" text,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- Better Auth: Sessions
      CREATE TABLE IF NOT EXISTS "session" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL,
        "expiresAt" timestamp with time zone NOT NULL,
        "ipAddress" text,
        "userAgent" text,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- Better Auth: OAuth accounts
      CREATE TABLE IF NOT EXISTS "account" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL,
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "accessToken" text,
        "refreshToken" text,
        "expiresAt" timestamp with time zone,
        "scope" text,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- Better Auth: Email/phone verification
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expiresAt" timestamp with time zone NOT NULL,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- Better Auth: Passkeys (WebAuthn)
      CREATE TABLE IF NOT EXISTS "passkey" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL,
        "name" text,
        "credentialId" text NOT NULL UNIQUE,
        "publicKey" text NOT NULL,
        "counter" integer NOT NULL DEFAULT 0,
        "deviceType" text,
        "backedUp" boolean DEFAULT false,
        "transports" text[],
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "lastUsedAt" timestamp with time zone
      );

      -- Better Auth: Two-factor authentication
      CREATE TABLE IF NOT EXISTS "two_factor" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL UNIQUE,
        "secret" text NOT NULL,
        "backupCodes" text[],
        "verified" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "verifiedAt" timestamp with time zone
      );

      -- Better Auth: Organizations
      CREATE TABLE IF NOT EXISTS "organization" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL UNIQUE,
        "logo" text,
        "metadata" text,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
        "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- Better Auth: Organization members
      CREATE TABLE IF NOT EXISTS "organization_member" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organizationId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" varchar(20) DEFAULT 'member' NOT NULL,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- Better Auth: Organization invitations
      CREATE TABLE IF NOT EXISTS "organization_invitation" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organizationId" uuid NOT NULL,
        "email" text NOT NULL,
        "role" varchar(20) DEFAULT 'member' NOT NULL,
        "inviterId" uuid NOT NULL,
        "status" varchar(20) DEFAULT 'pending' NOT NULL,
        "token" text NOT NULL UNIQUE,
        "expiresAt" timestamp with time zone NOT NULL,
        "createdAt" timestamp with time zone DEFAULT now() NOT NULL
      );

      -- Add foreign keys (IF NOT EXISTS equivalent - will skip if already exists)
      DO $$ BEGIN
        ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_user_id_fk"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_userId_user_id_fk"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_organization_id_fk"
          FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userId_user_id_fk"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_organizationId_organization_id_fk"
          FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_inviterId_user_id_fk"
          FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `

    await client.query(sql)

    console.log('\n✅ Better Auth tables created successfully!')

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

applyBetterAuthTables().catch(console.error)
