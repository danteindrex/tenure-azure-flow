-- ============================================================================
-- DELETE USER AND ALL RELATED DATA BY EMAIL
-- ============================================================================
-- This script deletes a user and ALL their related data from the database
-- based on their email address.
--
-- WARNING: This operation is IRREVERSIBLE. Make sure you have a backup.
--
-- Usage:
--   Replace 'user@example.com' with the actual email address
--   Then run this script in your database
-- ============================================================================

-- STEP 1: Get the user ID from email (for verification)
-- Run this first to verify you have the correct user
SELECT
    id,
    name,
    email,
    created_at
FROM "users"
WHERE email = 'dspratechnincal@gmail.com';

-- STEP 2: Delete all related data (most tables have CASCADE, but some don't)
-- We'll delete them explicitly to be safe

BEGIN;

-- Store user_id in a variable for the transaction
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO target_user_id
    FROM "user"
    WHERE email = 'user@example.com';

    -- If user not found, raise error
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email user@example.com not found';
    END IF;

    RAISE NOTICE 'Deleting user: %', target_user_id;

    -- Delete from audit logs (for compliance, you might want to keep these)
    DELETE FROM user_audit_logs WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted audit logs';

    -- Delete from settings tables
    DELETE FROM user_settings WHERE user_id = target_user_id;
    DELETE FROM user_appearance_settings WHERE user_id = target_user_id;
    DELETE FROM user_notification_preferences WHERE user_id = target_user_id;
    DELETE FROM user_privacy_settings WHERE user_id = target_user_id;
    DELETE FROM user_security_settings WHERE user_id = target_user_id;
    DELETE FROM user_payment_settings WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted settings';

    -- Delete from profile tables
    DELETE FROM user_profiles WHERE user_id = target_user_id;
    DELETE FROM user_contacts WHERE user_id = target_user_id;
    DELETE FROM user_addresses WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted profile data';

    -- Delete from financial tables
    DELETE FROM user_payments WHERE user_id = target_user_id;
    DELETE FROM user_subscriptions WHERE user_id = target_user_id;
    DELETE FROM user_payment_methods WHERE user_id = target_user_id;
    DELETE FROM user_billing_schedules WHERE user_id = target_user_id;
    DELETE FROM payout_management WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted financial data';

    -- Delete from membership tables
    DELETE FROM user_memberships WHERE user_id = target_user_id;
    DELETE FROM membership_queue WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted membership data';

    -- Delete from agreements
    DELETE FROM user_agreements WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted agreements';

    -- Delete from Better Auth related tables (sessions, accounts, etc.)
    DELETE FROM session WHERE user_id = target_user_id;
    DELETE FROM account WHERE user_id = target_user_id;
    DELETE FROM verification WHERE identifier = (SELECT email FROM "user" WHERE id = target_user_id);
    RAISE NOTICE 'Deleted auth sessions and accounts';

    -- Finally, delete the user record itself
    DELETE FROM "user" WHERE id = target_user_id;
    RAISE NOTICE 'Deleted user record';

    RAISE NOTICE 'User deletion completed successfully';
END $$;

COMMIT;

-- STEP 3: Verify deletion
-- This should return 0 rows
SELECT COUNT(*) as remaining_records
FROM "user"
WHERE email = 'user@example.com';
