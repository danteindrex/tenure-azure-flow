-- CLEANUP OLD TABLES SCRIPT
-- Removes old denormalized tables after successful migration
-- Execute only after verifying data migration success

BEGIN;

-- ============================================================================
-- VERIFICATION QUERIES (Run these first to verify migration success)
-- ============================================================================

-- Verify user count matches
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM member;
    SELECT COUNT(*) INTO new_count FROM users;
    
    IF old_count != new_count THEN
        RAISE EXCEPTION 'User count mismatch: old=%, new=%', old_count, new_count;
    END IF;
    
    RAISE NOTICE 'User count verification passed: % users migrated', new_count;
END $$;

-- Verify subscription count matches
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM subscription;
    SELECT COUNT(*) INTO new_count FROM user_subscriptions;
    
    IF old_count != new_count THEN
        RAISE EXCEPTION 'Subscription count mismatch: old=%, new=%', old_count, new_count;
    END IF;
    
    RAISE NOTICE 'Subscription count verification passed: % subscriptions migrated', new_count;
END $$;

-- Verify payment count matches
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM payment;
    SELECT COUNT(*) INTO new_count FROM user_payments;
    
    IF old_count != new_count THEN
        RAISE EXCEPTION 'Payment count mismatch: old=%, new=%', old_count, new_count;
    END IF;
    
    RAISE NOTICE 'Payment count verification passed: % payments migrated', new_count;
END $$;

-- ============================================================================
-- DROP OLD TABLES (Execute only after verification)
-- ============================================================================

-- Drop old tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS member_agreements CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS financial_schedules CASCADE;
DROP TABLE IF EXISTS queue_entries CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS subscription CASCADE;
DROP TABLE IF EXISTS queue CASCADE;
DROP TABLE IF EXISTS user_audit_logs CASCADE;
DROP TABLE IF EXISTS member CASCADE;

-- Drop old sequences
DROP SEQUENCE IF EXISTS member_memberid_seq CASCADE;
DROP SEQUENCE IF EXISTS payment_paymentid_seq CASCADE;
DROP SEQUENCE IF EXISTS subscription_subscriptionid_seq CASCADE;

-- ============================================================================
-- CREATE OPTIMIZED VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Create a comprehensive user view for easy querying
CREATE VIEW users_complete AS
SELECT 
    u.id,
    u.auth_user_id,
    u.email,
    u.email_verified,
    u.status,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at,
    
    -- Profile information
    p.first_name,
    p.last_name,
    p.middle_name,
    p.date_of_birth,
    CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) as full_name,
    
    -- Primary contact
    phone.contact_value as phone,
    
    -- Primary address
    a.street_address,
    a.address_line_2,
    a.city,
    a.state,
    a.postal_code,
    a.country_code,
    
    -- Membership info
    m.join_date,
    m.tenure,
    m.verification_status,
    m.assigned_admin_id,
    
    -- Queue info
    q.queue_position,
    q.is_eligible,
    q.subscription_active,
    q.total_months_subscribed,
    q.lifetime_payment_total,
    q.has_received_payout
    
FROM users u
LEFT JOIN user_profiles p ON u.id = p.user_id
LEFT JOIN user_contacts phone ON u.id = phone.user_id AND phone.contact_type = 'phone' AND phone.is_primary = true
LEFT JOIN user_addresses a ON u.id = a.user_id AND a.is_primary = true
LEFT JOIN user_memberships m ON u.id = m.user_id
LEFT JOIN membership_queue q ON u.id = q.user_id;

-- Create a view for active subscriptions
CREATE VIEW active_subscriptions AS
SELECT 
    us.*,
    u.email,
    p.first_name,
    p.last_name
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE us.status = 'active';

-- Create a view for recent payments
CREATE VIEW recent_payments AS
SELECT 
    up.*,
    u.email,
    p.first_name,
    p.last_name
FROM user_payments up
JOIN users u ON up.user_id = u.id
LEFT JOIN user_profiles p ON u.id = p.user_id
ORDER BY up.payment_date DESC;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- ============================================================================

-- Enable RLS on all user tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Users policies
CREATE POLICY "Users can view their own data" ON users 
    FOR SELECT USING (auth_user_id = auth.uid()::text);

CREATE POLICY "Service can manage users" ON users 
    FOR ALL USING (true);

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own profile" ON user_profiles 
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage profiles" ON user_profiles 
    FOR ALL USING (true);

-- Similar policies for other tables...
CREATE POLICY "Users can view their own contacts" ON user_contacts 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage contacts" ON user_contacts 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own addresses" ON user_addresses 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage addresses" ON user_addresses 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own memberships" ON user_memberships 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage memberships" ON user_memberships 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own queue status" ON membership_queue 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage queue" ON membership_queue 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own payment methods" ON user_payment_methods 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage payment methods" ON user_payment_methods 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage subscriptions" ON user_subscriptions 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own payments" ON user_payments 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage payments" ON user_payments 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own billing schedules" ON user_billing_schedules 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage billing schedules" ON user_billing_schedules 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own agreements" ON user_agreements 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage agreements" ON user_agreements 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own audit logs" ON system_audit_logs 
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage audit logs" ON system_audit_logs 
    FOR ALL USING (true);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Final count verification
SELECT 
    'users' as table_name, 
    COUNT(*) as count 
FROM users
UNION ALL
SELECT 
    'user_profiles' as table_name, 
    COUNT(*) as count 
FROM user_profiles
UNION ALL
SELECT 
    'user_subscriptions' as table_name, 
    COUNT(*) as count 
FROM user_subscriptions
UNION ALL
SELECT 
    'user_payments' as table_name, 
    COUNT(*) as count 
FROM user_payments;

COMMIT;