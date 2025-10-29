-- Delete All Users Script
-- Run with: psql $DATABASE_URL -f scripts/delete-all-users.sql

BEGIN;

-- Disable foreign key checks
SET session_replication_role = replica;

-- Delete all user data
DELETE FROM system_audit_logs;
DELETE FROM user_audit_logs;
DELETE FROM auditlog;
DELETE FROM user_settings;
DELETE FROM user_notification_preferences;
DELETE FROM user_security_settings;
DELETE FROM user_payment_settings;
DELETE FROM user_privacy_settings;
DELETE FROM user_appearance_settings;
DELETE FROM user_payments;
DELETE FROM user_payment_methods;
DELETE FROM user_subscriptions;
DELETE FROM user_billing_schedules;
DELETE FROM payout_management;
DELETE FROM tax_forms;
DELETE FROM verification_codes;
DELETE FROM verification;
DELETE FROM kyc_verification;
DELETE FROM two_factor;
DELETE FROM passkey;
DELETE FROM user_profiles;
DELETE FROM user_contacts;
DELETE FROM user_addresses;
DELETE FROM user_agreements;
DELETE FROM user_memberships;
DELETE FROM membership_queue;
DELETE FROM transaction_monitoring;
DELETE FROM disputes;
DELETE FROM signup_sessions;
DELETE FROM session;
DELETE FROM account;
DELETE FROM organization_member;
DELETE FROM organization_invitation;
DELETE FROM Payout;
DELETE FROM Payment;
DELETE FROM Tenure;
DELETE FROM Member;
DELETE FROM users;
DELETE FROM "user";

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

COMMIT;

SELECT 'All users deleted successfully!' as status;