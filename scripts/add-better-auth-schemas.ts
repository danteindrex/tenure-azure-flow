/**
 * Add Better Auth Schemas to Database
 *
 * This script safely adds Better Auth tables to your existing database
 * without affecting any existing data or tables.
 *
 * Tables to be added:
 * - user (Better Auth main user table)
 * - session (Better Auth sessions)
 * - account (OAuth accounts)
 * - verification (Email/phone verification)
 * - passkey (WebAuthn passkeys)
 * - two_factor (2FA settings)
 * - organization (Organizations)
 * - organization_member (Organization members)
 * - organization_invitation (Organization invitations)
 */

import { db } from '../drizzle/db'
import { sql } from 'drizzle-orm'

async function addBetterAuthSchemas() {
  console.log('🔄 Adding Better Auth schemas to database...')

  try {
    // Check which Better Auth tables already exist
    const existingTables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification', 'passkey', 'two_factor', 'organization', 'organization_member', 'organization_invitation')
    `)

    const existingTableNames = existingTables.rows.map((row: any) => row.table_name)
    console.log(`\nExisting Better Auth tables: ${existingTableNames.length > 0 ? existingTableNames.join(', ') : 'none'}`)

    const requiredTables = ['user', 'session', 'account', 'verification', 'passkey', 'two_factor', 'organization', 'organization_member', 'organization_invitation']
    const missingTables = requiredTables.filter(table => !existingTableNames.includes(table))

    if (missingTables.length === 0) {
      console.log('\n✅ All Better Auth tables already exist!')
      return
    }

    console.log(`\nTables to create: ${missingTables.join(', ')}`)

    // Create Better Auth tables (IF NOT EXISTS)
    await db.execute(sql`
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
    `)

    console.log('\n✅ Better Auth tables created successfully!')

    // Add foreign key constraints (IF NOT EXISTS equivalent)
    console.log('\n🔄 Adding foreign key constraints...')

    const constraints = [
      {
        name: 'session_userId_user_id_fk',
        sql: 'ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE'
      },
      {
        name: 'account_userId_user_id_fk',
        sql: 'ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE'
      },
      {
        name: 'passkey_userId_user_id_fk',
        sql: 'ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE'
      },
      {
        name: 'two_factor_userId_user_id_fk',
        sql: 'ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE'
      },
      {
        name: 'organization_member_organizationId_organization_id_fk',
        sql: 'ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE'
      },
      {
        name: 'organization_member_userId_user_id_fk',
        sql: 'ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE'
      },
      {
        name: 'organization_invitation_organizationId_organization_id_fk',
        sql: 'ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE'
      },
      {
        name: 'organization_invitation_inviterId_user_id_fk',
        sql: 'ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE'
      }
    ]

    for (const constraint of constraints) {
      try {
        await db.execute(sql.raw(`
          DO $$ BEGIN
            ${constraint.sql};
          EXCEPTION WHEN duplicate_object THEN NULL;
          END $$;
        `))
        console.log(`  ✅ Added constraint: ${constraint.name}`)
      } catch (error) {
        console.log(`  ⚠️  Constraint ${constraint.name} already exists or failed to add`)
      }
    }

    // Verify tables were created
    const finalCheck = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification', 'passkey', 'two_factor', 'organization', 'organization_member', 'organization_invitation')
      ORDER BY table_name
    `)

    console.log('\n✅ Verified Better Auth tables in database:')
    finalCheck.rows.forEach((row: any) => console.log(`  - ${row.table_name}`))

    // Count total tables
    const totalTables = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `)

    console.log(`\n📊 Total tables in database: ${(totalTables.rows[0] as any).count}`)
    console.log('\n🎉 Better Auth schemas added successfully!')

  } catch (error) {
    console.error('❌ Failed to add Better Auth schemas:', error)
    throw error
  }
}

// Run the migration
addBetterAuthSchemas().catch(console.error)