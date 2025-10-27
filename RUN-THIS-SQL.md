# Run This SQL to Add Onboarding Fields

**This SQL is SAFE to run** - it only adds two columns to the `user` table if they don't already exist.

## Option 1: Run via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the SQL below
5. Click "Run"

## Option 2: Run via psql command line

```bash
psql $DATABASE_URL < migrations/add-onboarding-fields.sql
```

## The SQL

```sql
-- Add onboarding tracking fields to Better Auth user table
-- This migration ONLY adds the onboardingStep and onboarding Completed fields
-- It does NOT touch any other tables

-- Add onboardingStep column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'onboardingStep'
  ) THEN
    ALTER TABLE "user" ADD COLUMN "onboarding Step" INTEGER NOT NULL DEFAULT 1;
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

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
  AND column_name IN ('onboardingStep', 'onboardingCompleted')
ORDER BY column_name;
```

## Expected Output

You should see output like:

```
NOTICE:  Added onboardingStep column
NOTICE:  Added onboardingCompleted column

 column_name        | data_type | column_default | is_nullable
--------------------+-----------+----------------+-------------
 onboardingCompleted| boolean   | false          | NO
 onboardingStep     | integer   | 1              | NO
```

Or if the columns already exist:

```
NOTICE:  onboardingStep column already exists
NOTICE:  onboardingCompleted column already exists
```

## What This Does

Adds two new columns to the Better Auth `user` table:

1. **onboardingStep** (INTEGER, DEFAULT 1)
   - Tracks which step of onboarding the user is on (1-5)
   - Step 1: Phone + password
   - Step 2: Verify phone
   - Step 3: Personal info + email
   - Step 4: Verify email
   - Step 5: Stripe checkout

2. **onboardingCompleted** (BOOLEAN, DEFAULT false)
   - Set to `true` when user completes all 5 steps
   - Used by middleware to block dashboard access until complete

## After Running This

Once you've run this SQL, you can:

1. ✅ Use ProfileNew.tsx (it's ready to go)
2. ✅ Update your onboarding flow to set these fields
3. ✅ Create middleware to enforce completion
4. ⏳ Replace Supabase Auth in other files

The database schema issue is ONLY about these two fields. All the other warnings about missing tables are for PayloadCMS admin tables that you're not using with Drizzle.
