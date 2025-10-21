-- DATA MIGRATION SCRIPT
-- Migrates all existing data from old schema to normalized schema
-- Handles deduplication and data integrity

BEGIN;

-- ============================================================================
-- PHASE 1: MIGRATE CORE USER DATA
-- ============================================================================

-- Migrate users from member table
INSERT INTO users (auth_user_id, email, email_verified, status, created_at, updated_at)
SELECT 
    auth_user_id,
    email,
    CASE WHEN status = 'Active' THEN TRUE ELSE FALSE END as email_verified,
    status,
    created_at,
    updated_at
FROM member
ON CONFLICT (email) DO NOTHING; -- Prevent duplicates

-- ============================================================================
-- PHASE 2: MIGRATE PERSONAL INFORMATION
-- ============================================================================

-- Migrate user profiles with intelligent name handling
INSERT INTO user_profiles (user_id, first_name, last_name, middle_name, date_of_birth, created_at, updated_at)
SELECT 
    u.id as user_id,
    COALESCE(
        NULLIF(m.first_name, ''), 
        CASE 
            WHEN m.name IS NOT NULL AND m.name != '' THEN 
                TRIM(SPLIT_PART(m.name, ' ', 1))
            ELSE NULL 
        END
    ) as first_name,
    COALESCE(
        NULLIF(m.last_name, ''),
        CASE 
            WHEN m.name IS NOT NULL AND m.name != '' AND position(' ' in m.name) > 0 THEN 
                TRIM(SUBSTRING(m.name FROM position(' ' in m.name) + 1))
            ELSE NULL 
        END
    ) as last_name,
    NULLIF(m.middle_name, '') as middle_name,
    m.date_of_birth,
    m.created_at,
    m.updated_at
FROM users u
JOIN member m ON u.email = m.email;

-- ============================================================================
-- PHASE 3: MIGRATE CONTACT INFORMATION
-- ============================================================================

-- Migrate phone numbers
INSERT INTO user_contacts (user_id, contact_type, contact_value, is_primary, is_verified, created_at, updated_at)
SELECT 
    u.id as user_id,
    'phone' as contact_type,
    m.phone as contact_value,
    TRUE as is_primary,
    FALSE as is_verified,
    m.created_at,
    m.updated_at
FROM users u
JOIN member m ON u.email = m.email
WHERE m.phone IS NOT NULL AND m.phone != '';

-- Migrate email as contact (for consistency)
INSERT INTO user_contacts (user_id, contact_type, contact_value, is_primary, is_verified, created_at, updated_at)
SELECT 
    u.id as user_id,
    'email' as contact_type,
    u.email as contact_value,
    TRUE as is_primary,
    u.email_verified as is_verified,
    u.created_at,
    u.updated_at
FROM users u;

-- ============================================================================
-- PHASE 4: MIGRATE ADDRESS INFORMATION
-- ============================================================================

-- Migrate addresses (handle both old and new field names)
INSERT INTO user_addresses (user_id, address_type, street_address, address_line_2, city, state, postal_code, country_code, is_primary, created_at, updated_at)
SELECT 
    u.id as user_id,
    'primary' as address_type,
    m.street_address,
    m.address_line_2,
    m.city,
    COALESCE(m.state, m.administrative_area) as state,
    COALESCE(m.zip_code, m.postal_code) as postal_code,
    COALESCE(m.country_code, 'US') as country_code,
    TRUE as is_primary,
    m.created_at,
    m.updated_at
FROM users u
JOIN member m ON u.email = m.email
WHERE m.street_address IS NOT NULL AND m.street_address != '';

-- ============================================================================
-- PHASE 5: MIGRATE MEMBERSHIP DATA
-- ============================================================================

-- Migrate membership information
INSERT INTO user_memberships (user_id, join_date, tenure, verification_status, assigned_admin_id, created_at, updated_at)
SELECT 
    u.id as user_id,
    m.join_date,
    COALESCE(m.tenure, 0) as tenure,
    COALESCE(m.verification_status, 'PENDING') as verification_status,
    m.admin_i_d_id_id as assigned_admin_id,
    m.created_at,
    m.updated_at
FROM users u
JOIN member m ON u.email = m.email;

-- ============================================================================
-- PHASE 6: MIGRATE QUEUE DATA
-- ============================================================================

-- Migrate from queue_entries table
INSERT INTO membership_queue (user_id, queue_position, joined_queue_at, is_eligible, priority_score, created_at, updated_at)
SELECT 
    u.id as user_id,
    qe.queue_position,
    qe.joined_queue_at,
    COALESCE(qe.is_eligible, TRUE) as is_eligible,
    COALESCE(qe.priority_score, 0) as priority_score,
    qe.created_at,
    qe.updated_at
FROM users u
JOIN member m ON u.email = m.email
JOIN queue_entries qe ON m.id = qe.member_id;

-- Migrate from queue table (if it has different data)
INSERT INTO membership_queue (user_id, queue_position, subscription_active, total_months_subscribed, last_payment_date, lifetime_payment_total, has_received_payout, notes, created_at, updated_at)
SELECT 
    u.id as user_id,
    q.queue_position,
    COALESCE(q.subscription_active, FALSE) as subscription_active,
    COALESCE(q.total_months_subscribed, 0) as total_months_subscribed,
    q.last_payment_date,
    COALESCE(q.lifetime_payment_total, 0.00) as lifetime_payment_total,
    COALESCE(q.has_received_payout, FALSE) as has_received_payout,
    q.notes,
    q.created_at,
    q.updated_at
FROM users u
JOIN member m ON u.email = m.email
JOIN queue q ON m.id = q.memberid
ON CONFLICT (user_id) DO UPDATE SET
    subscription_active = EXCLUDED.subscription_active,
    total_months_subscribed = EXCLUDED.total_months_subscribed,
    last_payment_date = EXCLUDED.last_payment_date,
    lifetime_payment_total = EXCLUDED.lifetime_payment_total,
    has_received_payout = EXCLUDED.has_received_payout,
    notes = COALESCE(EXCLUDED.notes, membership_queue.notes);

-- ============================================================================
-- PHASE 7: MIGRATE PAYMENT METHODS
-- ============================================================================

-- Migrate payment methods
INSERT INTO user_payment_methods (user_id, provider, method_type, method_subtype, provider_payment_method_id, is_default, is_active, metadata, created_at, updated_at)
SELECT 
    u.id as user_id,
    'stripe' as provider,
    pm.method_type,
    NULL as method_subtype,
    pm.source_token as provider_payment_method_id,
    COALESCE(pm.is_default, FALSE) as is_default,
    COALESCE(pm.is_active, TRUE) as is_active,
    COALESCE(pm.metadata, '{}') as metadata,
    pm.created_at,
    pm.updated_at
FROM users u
JOIN member m ON u.email = m.email
JOIN payment_methods pm ON m.id = pm.member_id;

-- ============================================================================
-- PHASE 8: MIGRATE SUBSCRIPTIONS
-- ============================================================================

-- Migrate subscriptions
INSERT INTO user_subscriptions (user_id, provider, provider_subscription_id, provider_customer_id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_end, created_at, updated_at)
SELECT 
    u.id as user_id,
    'stripe' as provider,
    s.stripe_subscription_id as provider_subscription_id,
    s.stripe_customer_id as provider_customer_id,
    s.status,
    s.current_period_start,
    s.current_period_end,
    COALESCE(s.cancel_at_period_end, FALSE) as cancel_at_period_end,
    s.canceled_at,
    s.trial_end,
    s.created_at,
    s.updated_at
FROM users u
JOIN member m ON u.email = m.email
JOIN subscription s ON m.id = s.memberid;

-- ============================================================================
-- PHASE 9: MIGRATE PAYMENTS
-- ============================================================================

-- Migrate payments
INSERT INTO user_payments (user_id, subscription_id, provider, provider_payment_id, provider_invoice_id, provider_charge_id, amount, currency, payment_type, payment_date, status, is_first_payment, failure_reason, receipt_url, created_at, updated_at)
SELECT 
    u.id as user_id,
    us.id as subscription_id,
    'stripe' as provider,
    p.stripe_payment_intent_id as provider_payment_id,
    p.stripe_invoice_id as provider_invoice_id,
    p.stripe_charge_id as provider_charge_id,
    p.amount,
    COALESCE(p.currency, 'USD') as currency,
    p.payment_type,
    p.payment_date,
    p.status,
    COALESCE(p.is_first_payment, FALSE) as is_first_payment,
    p.failure_reason,
    p.receipt_url,
    p.created_at,
    p.updated_at
FROM users u
JOIN member m ON u.email = m.email
JOIN payment p ON m.id = p.memberid
LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.provider_subscription_id IN (
    SELECT s2.stripe_subscription_id FROM subscription s2 WHERE s2.subscriptionid = p.subscriptionid
);

-- ============================================================================
-- PHASE 10: MIGRATE BILLING SCHEDULES
-- ============================================================================

-- Migrate financial schedules
INSERT INTO user_billing_schedules (user_id, subscription_id, billing_cycle, next_billing_date, amount, currency, is_active, created_at, updated_at)
SELECT 
    u.id as user_id,
    us.id as subscription_id,
    COALESCE(fs.billing_cycle, 'MONTHLY') as billing_cycle,
    fs.next_billing_date,
    fs.amount,
    COALESCE(fs.currency, 'USD') as currency,
    COALESCE(fs.is_active, TRUE) as is_active,
    fs.created_at,
    fs.updated_at
FROM users u
JOIN member m ON u.email = m.email
JOIN financial_schedules fs ON m.id = fs.member_id
LEFT JOIN user_subscriptions us ON us.user_id = u.id;

-- ============================================================================
-- PHASE 11: MIGRATE AGREEMENTS
-- ============================================================================

-- Migrate member agreements
INSERT INTO user_agreements (user_id, agreement_type, version_number, agreed_at, ip_address, user_agent, is_active, created_at)
SELECT 
    u.id as user_id,
    ma.agreement_type,
    ma.version_number,
    ma.agreed_at_ts as agreed_at,
    ma.ip_address,
    ma.user_agent,
    TRUE as is_active,
    ma.created_at
FROM users u
JOIN member m ON u.email = m.email
JOIN member_agreements ma ON m.id = ma.member_id;

-- ============================================================================
-- PHASE 12: MIGRATE AUDIT LOGS
-- ============================================================================

-- Migrate existing audit logs (skip entity_id since old format is incompatible)
INSERT INTO system_audit_logs (user_id, entity_type, action, success, ip_address, user_agent, metadata, created_at)
SELECT 
    u.id as user_id,
    COALESCE(ual.resource_type, 'user') as entity_type,
    ual.action,
    COALESCE(ual.success, true) as success,
    ual.ip_address,
    ual.user_agent,
    COALESCE(ual.details, '{}') as metadata,
    ual.created_at
FROM user_audit_logs ual
LEFT JOIN users u ON u.auth_user_id = ual.user_id::text;

COMMIT;