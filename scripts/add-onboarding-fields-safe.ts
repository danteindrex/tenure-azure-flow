/**
 * Safe migration script to add onboarding fields to Better Auth user table
 *
 * This script ONLY adds two fields:
 * - onboardingStep (INTEGER, DEFAULT 1)
 * - onboardingCompleted (BOOLEAN, DEFAULT false)
 *
 * It will NOT touch any other tables or columns.
 */

import 'dotenv/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { db } from '../drizzle/db'
import { sql } from 'drizzle-orm'

async function addOnboardingFields() {
  try {
    console.log('🔧 Adding onboarding fields to "user" table...\n')

    // Run the migration SQL
    await db.execute(sql`
      -- Add onboardingStep column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = 'onboardingStep'
        ) THEN
          ALTER TABLE "user" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 1;
          RAISE NOTICE 'Added onboardingStep column';
        ELSE
          RAISE NOTICE 'onboardingStep column already exists';
        END IF;
      END
      $$;

      -- Add onboardingCompleted column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = 'onboardingCompleted'
        ) THEN
          ALTER TABLE "user" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
          RAISE NOTICE 'Added onboardingCompleted column';
        ELSE
          RAISE NOTICE 'onboardingCompleted column already exists';
        END IF;
      END
      $$;
    `)

    console.log('✅ Migration completed successfully!\n')

    // Verify the columns were added
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user'
        AND column_name IN ('onboardingStep', 'onboardingCompleted')
      ORDER BY column_name;
    `)

    console.log('📋 Verified columns in "user" table:')
    console.log(result.rows)
    console.log('\n✨ Done! The onboarding fields are now in your database.')

  } catch (error: any) {
    console.error('❌ Error adding onboarding fields:', error)
    console.error('\nError details:', error.message)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

addOnboardingFields()
