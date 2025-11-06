-- ============================================================================
-- SIMPLE USER DELETION SCRIPT
-- ============================================================================
-- Most tables have CASCADE delete enabled, so deleting the user will
-- automatically delete related records.
--
-- WARNING: This is IRREVERSIBLE. Backup your data first!
-- ============================================================================

-- STEP 1: Verify the user exists
SELECT
    id,
    name,
    email,
    created_at,
    email_verified
FROM "user"
WHERE email = 'USER_EMAIL_HERE';

-- STEP 2: Delete the user (this will cascade to most tables)
-- Replace USER_EMAIL_HERE with the actual email
DELETE FROM "user"
WHERE email = 'USER_EMAIL_HERE';

-- STEP 3: Verify deletion
SELECT COUNT(*) as user_still_exists
FROM "user"
WHERE email = 'USER_EMAIL_HERE';
-- Should return 0

-- STEP 4: Clean up any orphaned records (optional)
-- Some tables might have SET NULL instead of CASCADE
-- These won't be deleted automatically

-- Clean up orphaned audit logs (if you want to delete them)
DELETE FROM user_audit_logs
WHERE user_id NOT IN (SELECT id FROM "user");

-- Clean up orphaned verification records
DELETE FROM verification
WHERE identifier = 'USER_EMAIL_HERE';
