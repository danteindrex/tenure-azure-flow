-- ============================================================================
-- Migration: Alter user_memberships.verification_status to use ENUM type
-- Date: 2025-11-07
-- Description: Convert verification_status from varchar(20) to enum type
--              This enforces allowed values at the database level
-- ============================================================================

-- Migration executed on: 2025-11-07
-- Status: COMPLETED ✅

BEGIN;

-- Step 1: Verify current values are compatible with enum
-- (Only showing for documentation, actual migration already completed)
-- SELECT DISTINCT verification_status FROM user_memberships;
-- Result: Only 'PENDING' existed, which is compatible

-- Step 2: Drop default constraint
ALTER TABLE user_memberships
  ALTER COLUMN verification_status DROP DEFAULT;

-- Step 3: Change column type to enum
ALTER TABLE user_memberships
  ALTER COLUMN verification_status TYPE enum_user_memberships_verification_status
  USING verification_status::enum_user_memberships_verification_status;

-- Step 4: Add default back using enum type
ALTER TABLE user_memberships
  ALTER COLUMN verification_status SET DEFAULT 'PENDING'::enum_user_memberships_verification_status;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify column now uses enum type
SELECT
  column_name,
  data_type,
  udt_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_memberships'
  AND column_name = 'verification_status';

-- Expected result:
-- column_name          | data_type    | udt_name                                  | column_default
-- ---------------------+--------------+-------------------------------------------+------------------------------------------------------
-- verification_status  | USER-DEFINED | enum_user_memberships_verification_status | 'PENDING'::enum_user_memberships_verification_status

-- Show allowed enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'enum_user_memberships_verification_status'::regtype
ORDER BY enumsortorder;

-- Expected values:
-- PENDING
-- VERIFIED
-- FAILED
-- SKIPPED

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================

/*
BEGIN;

-- Revert to varchar(20)
ALTER TABLE user_memberships
  ALTER COLUMN verification_status DROP DEFAULT;

ALTER TABLE user_memberships
  ALTER COLUMN verification_status TYPE varchar(20)
  USING verification_status::text;

ALTER TABLE user_memberships
  ALTER COLUMN verification_status SET DEFAULT 'PENDING'::character varying;

COMMIT;
*/
