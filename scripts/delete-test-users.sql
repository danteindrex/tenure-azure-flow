-- =====================================================
-- Delete All Test Users Script
-- =====================================================
-- This script deletes all user data while preserving table structure
-- Run with: psql $DATABASE_URL -f scripts/delete-test-users.sql
-- =====================================================

BEGIN;

-- Disable foreign key checks temporarily for faster deletion
SET session_replication_role = replica;

-- =====================================================
-- DELETE USER DATA (in dependency order)
-- =====================================================

-- Delete audit logs first (they reference users but don't block deletion)
DELETE FROM system_audit_logs;
DELETE FROM user_audit_logs;
DELETE FROM auditlog;

-- Delete user settings and preferences
DELETE FROM user_settings;
DELETE FROM user_notification_preferences;
DELETE FROM user_security_settings;
DELETE FROM user_payment_settings;
DELETE FROM user_privacy_settings;
DELETE FROM user_appearance_settings;

-- Delete financial and subscription data
DELETE FROM user_payments;
DELETE FROM user_payment_methods;
DELETE FROM user_subscriptions;
DELETE FROM user_billing_schedules;

-- Delete payout and tax data
DELETE FROM payout_management;
DELETE FROM tax_forms;

-- Delete verification and security data
DELETE FROM verification_codes;
DELETE FROM verification;
DELETE FROM kyc_verification;
DELETE FROM two_factor;
DELETE FROM passkey;

-- Delete user profile and contact data
DELETE FROM user_profiles;
DELETE FROM user_contacts;
DELETE FROM user_addresses;
DELETE FROM user_agreements;
DELETE FROM user_memberships;

-- Delete queue and membership data
DELETE FROM membership_queue;

-- Delete monitoring and compliance data
DELETE FROM transaction_monitoring;
DELETE FROM disputes;

-- Delete signup sessions
DELETE FROM signup_sessions;

-- Delete Better Auth related data
DELETE FROM session;
DELETE FROM account;

-- Delete organization memberships (if using organizations)
DELETE FROM organization_member;
DELETE FROM organization_invitation;

-- Delete admin alerts (if they reference users)
DELETE FROM admin_alerts;

-- Finally delete the main user records
DELETE FROM users; -- Main users table
DELETE FROM "user"; -- Better Auth user table

-- Delete Member table (business logic table)
DELETE FROM Member;

-- Delete related business data that depends on members
DELETE FROM Tenure;
DELETE FROM Payment;
DELETE FROM Payout;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences to start from 1
ALTER SEQUENCE IF EXISTS admin_id_seq RESTART WITH 1;

-- Reset any other sequences that might exist
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT schemaname, sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequencename NOT LIKE 'admin%'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || seq_record.schemaname || '.' || seq_record.sequencename || ' RESTART WITH 1';
    END LOOP;
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION - Show remaining data
-- =====================================================

-- Count remaining records in key tables
SELECT 
    'users' as table_name, 
    COUNT(*) as remaining_records 
FROM users
UNION ALL
SELECT 
    'user (Better Auth)', 
    COUNT(*) 
FROM "user"
UNION ALL
SELECT 
    'Member', 
    COUNT(*) 
FROM Member
UNION ALL
SELECT 
    'user_profiles', 
    COUNT(*) 
FROM user_profiles
UNION ALL
SELECT 
    'user_subscriptions', 
    COUNT(*) 
FROM user_subscriptions
UNION ALL
SELECT 
    'membership_queue', 
    COUNT(*) 
FROM membership_queue
ORDER BY table_name;

-- Show table structure is preserved
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user', 'Member', 'user_profiles')
ORDER BY table_name, ordinal_position
LIMIT 20;

SELECT '✅ All test users deleted successfully! Table structures preserved.' as status;