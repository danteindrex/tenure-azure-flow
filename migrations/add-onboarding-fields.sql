-- Add onboarding tracking fields to Better Auth user table
-- This migration ONLY adds the onboardingStep and onboardingCompleted fields
-- It does NOT touch any other tables

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

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
  AND column_name IN ('onboardingStep', 'onboardingCompleted')
ORDER BY column_name;
