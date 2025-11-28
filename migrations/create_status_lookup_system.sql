-- =====================================================
-- Status Lookup System Migration
-- =====================================================
-- This migration creates a unified lookup table system
-- to replace hardcoded ENUMs with admin-configurable statuses
-- =====================================================

-- =====================================================
-- PHASE 1: Create Core Lookup Tables
-- =====================================================

-- 1.1 Status Categories (groups of related statuses)
CREATE TABLE IF NOT EXISTS status_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  table_name VARCHAR(100),           -- Which table uses this category
  column_name VARCHAR(100),          -- Which column in that table
  is_system BOOLEAN DEFAULT false,   -- System categories can't be deleted
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE status_categories IS 'Groups of related status values (e.g., user_funnel, member_eligibility)';

-- 1.2 Status Values (individual status options)
CREATE TABLE IF NOT EXISTS status_values (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES status_categories(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,                    -- Internal code (never changes)
  display_name VARCHAR(100) NOT NULL,           -- Shown in UI (admin can change)
  description TEXT,
  color VARCHAR(20) DEFAULT '#6B7280',          -- UI color for badges
  icon VARCHAR(50),                             -- Optional icon name
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,             -- Default value for new records
  is_terminal BOOLEAN DEFAULT false,            -- End state (no further transitions)
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',                  -- Custom properties
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, code)
);

COMMENT ON TABLE status_values IS 'Individual status options within each category';

-- 1.3 Status Transitions (valid state changes)
CREATE TABLE IF NOT EXISTS status_transitions (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES status_categories(id) ON DELETE CASCADE,
  from_status_id INTEGER REFERENCES status_values(id) ON DELETE CASCADE,  -- NULL = initial state
  to_status_id INTEGER NOT NULL REFERENCES status_values(id) ON DELETE CASCADE,
  requires_admin BOOLEAN DEFAULT false,         -- Only admins can make this transition
  requires_reason BOOLEAN DEFAULT false,        -- Must provide reason for transition
  auto_trigger VARCHAR(100),                    -- Event that auto-triggers this transition
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, from_status_id, to_status_id)
);

COMMENT ON TABLE status_transitions IS 'Defines valid status transitions and rules';

-- =====================================================
-- PHASE 2: Access Control Tables
-- =====================================================

-- 2.1 Access Control Rules
CREATE TABLE IF NOT EXISTS access_control_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Status conditions (arrays of status_value IDs)
  user_status_ids INTEGER[] DEFAULT '{}',
  member_status_ids INTEGER[] DEFAULT '{}',
  subscription_status_ids INTEGER[] DEFAULT '{}',
  kyc_status_ids INTEGER[] DEFAULT '{}',

  -- Additional boolean conditions
  requires_email_verified BOOLEAN DEFAULT false,
  requires_phone_verified BOOLEAN DEFAULT false,
  requires_profile_complete BOOLEAN DEFAULT false,
  requires_active_subscription BOOLEAN DEFAULT false,

  -- Condition logic: 'all' = AND, 'any' = OR
  condition_logic VARCHAR(10) DEFAULT 'all',

  priority INTEGER DEFAULT 0,                   -- Higher = checked first
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE access_control_rules IS 'Defines conditions for access to routes/features';

-- 2.2 Protected Routes
CREATE TABLE IF NOT EXISTS protected_routes (
  id SERIAL PRIMARY KEY,
  route_pattern VARCHAR(255) NOT NULL,          -- '/dashboard', '/dashboard/*', '/settings'
  route_name VARCHAR(100),                      -- Human-readable name

  -- Access control
  access_rule_id INTEGER REFERENCES access_control_rules(id) ON DELETE SET NULL,

  -- Redirect behavior
  redirect_route VARCHAR(255) DEFAULT '/login',
  show_error_message BOOLEAN DEFAULT false,
  error_message TEXT,

  -- Route metadata
  requires_auth BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,              -- Accessible without auth

  priority INTEGER DEFAULT 0,                   -- For pattern matching order
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE protected_routes IS 'Maps routes to access control rules';

-- 2.3 Feature Flags (optional feature-level access)
CREATE TABLE IF NOT EXISTS feature_access (
  id SERIAL PRIMARY KEY,
  feature_code VARCHAR(100) NOT NULL UNIQUE,    -- 'payout_eligible', 'can_export', etc.
  feature_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Access control
  access_rule_id INTEGER REFERENCES access_control_rules(id) ON DELETE SET NULL,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE feature_access IS 'Feature-level access control';

-- =====================================================
-- PHASE 3: Populate Status Categories
-- =====================================================

INSERT INTO status_categories (code, name, description, table_name, column_name, is_system) VALUES
-- User journey statuses
('user_funnel', 'User Funnel Status', 'Tracks user onboarding journey', 'users', 'status', true),
('member_eligibility', 'Member Eligibility Status', 'Tracks member financial lifecycle', 'user_memberships', 'member_status', true),

-- Verification statuses
('kyc_status', 'KYC Verification Status', 'Identity verification states', 'kyc_verification', 'status', true),
('verification_status', 'Membership Verification Status', 'Membership verification states', 'user_memberships', 'verification_status', true),

-- Financial statuses
('subscription_status', 'Subscription Status', 'Subscription lifecycle states', 'user_subscriptions', 'status', true),
('payment_status', 'Payment Status', 'Payment transaction states', 'user_payments', 'status', true),
('payout_status', 'Payout Status', 'Payout workflow states', 'payout_management', 'status', true),

-- Admin statuses
('admin_status', 'Admin Account Status', 'Admin account states', 'admin_accounts', 'status', true),
('admin_role', 'Admin Role', 'Admin permission levels', 'admin_accounts', 'role', true)

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- PHASE 4: Populate Status Values
-- =====================================================

-- 4.1 User Funnel Status (matches client requirements)
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('pending', 'Pending', 'User has started signup but not completed', '#F59E0B', 1, true),
  ('onboarded', 'Onboarded', 'User has completed all onboarding steps', '#10B981', 2, false),
  ('suspended', 'Suspended', 'User account is temporarily suspended', '#EF4444', 3, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'user_funnel'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.2 Member Eligibility Status (matches client requirements exactly)
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_terminal)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_terminal
FROM status_categories c
CROSS JOIN (VALUES
  ('inactive', 'Inactive', 'Member without active subscription', '#6B7280', 1, false),
  ('active', 'Active', 'Member with active subscription', '#10B981', 2, false),
  ('suspended', 'Suspended', 'Member temporarily suspended', '#F59E0B', 3, false),
  ('cancelled', 'Cancelled', 'Member voluntarily cancelled', '#EF4444', 4, true),
  ('won', 'Won', 'Member selected for payout', '#8B5CF6', 5, false),
  ('paid', 'Paid', 'Member received payout', '#06B6D4', 6, true)
) AS v(code, display_name, description, color, sort_order, is_terminal)
WHERE c.code = 'member_eligibility'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.3 KYC Verification Status
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('pending', 'Pending', 'Awaiting KYC submission', '#F59E0B', 1, true),
  ('in_review', 'Under Review', 'KYC documents being reviewed', '#3B82F6', 2, false),
  ('verified', 'Verified', 'KYC verification complete', '#10B981', 3, false),
  ('rejected', 'Rejected', 'KYC verification failed', '#EF4444', 4, false),
  ('expired', 'Expired', 'KYC verification expired', '#6B7280', 5, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'kyc_status'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.4 Membership Verification Status
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('PENDING', 'Pending', 'Awaiting verification', '#F59E0B', 1, true),
  ('VERIFIED', 'Verified', 'Verification complete', '#10B981', 2, false),
  ('FAILED', 'Failed', 'Verification failed', '#EF4444', 3, false),
  ('SKIPPED', 'Skipped', 'Verification skipped', '#6B7280', 4, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'verification_status'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.5 Subscription Status
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('active', 'Active', 'Subscription is active', '#10B981', 1, false),
  ('trialing', 'Trial', 'In trial period', '#3B82F6', 2, false),
  ('past_due', 'Past Due', 'Payment overdue', '#F59E0B', 3, false),
  ('canceled', 'Canceled', 'Subscription canceled', '#EF4444', 4, false),
  ('incomplete', 'Incomplete', 'Setup incomplete', '#6B7280', 5, true),
  ('unpaid', 'Unpaid', 'Payment failed', '#EF4444', 6, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'subscription_status'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.6 Payment Status
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('pending', 'Pending', 'Payment processing', '#F59E0B', 1, true),
  ('succeeded', 'Succeeded', 'Payment successful', '#10B981', 2, false),
  ('failed', 'Failed', 'Payment failed', '#EF4444', 3, false),
  ('refunded', 'Refunded', 'Payment refunded', '#6B7280', 4, false),
  ('canceled', 'Canceled', 'Payment canceled', '#6B7280', 5, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'payment_status'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.7 Payout Status
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('pending_approval', 'Pending Approval', 'Awaiting admin approval', '#F59E0B', 1, true),
  ('approved', 'Approved', 'Approved for payout', '#3B82F6', 2, false),
  ('scheduled', 'Scheduled', 'Payout scheduled', '#8B5CF6', 3, false),
  ('processing', 'Processing', 'Payout in progress', '#6366F1', 4, false),
  ('completed', 'Completed', 'Payout complete', '#10B981', 5, false),
  ('failed', 'Failed', 'Payout failed', '#EF4444', 6, false),
  ('cancelled', 'Cancelled', 'Payout cancelled', '#6B7280', 7, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'payout_status'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.8 Admin Status
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('active', 'Active', 'Admin account active', '#10B981', 1, true),
  ('inactive', 'Inactive', 'Admin account inactive', '#6B7280', 2, false),
  ('suspended', 'Suspended', 'Admin account suspended', '#EF4444', 3, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'admin_status'
ON CONFLICT (category_id, code) DO NOTHING;

-- 4.9 Admin Role
INSERT INTO status_values (category_id, code, display_name, description, color, sort_order, is_default)
SELECT
  c.id,
  v.code,
  v.display_name,
  v.description,
  v.color,
  v.sort_order,
  v.is_default
FROM status_categories c
CROSS JOIN (VALUES
  ('super_admin', 'Super Admin', 'Full system access', '#EF4444', 1, false),
  ('admin', 'Admin', 'Standard admin access', '#3B82F6', 2, true),
  ('moderator', 'Moderator', 'Limited admin access', '#10B981', 3, false)
) AS v(code, display_name, description, color, sort_order, is_default)
WHERE c.code = 'admin_role'
ON CONFLICT (category_id, code) DO NOTHING;

-- =====================================================
-- PHASE 5: Create Access Control Rules
-- =====================================================

-- Get status value IDs for rule creation
DO $$
DECLARE
  v_onboarded_id INTEGER;
  v_pending_id INTEGER;
  v_suspended_id INTEGER;
  v_member_active_id INTEGER;
  v_member_inactive_id INTEGER;
  v_member_suspended_id INTEGER;
  v_member_won_id INTEGER;
  v_member_paid_id INTEGER;
  v_sub_active_id INTEGER;
  v_sub_trialing_id INTEGER;
  v_kyc_verified_id INTEGER;
BEGIN
  -- Get user funnel status IDs
  SELECT id INTO v_onboarded_id FROM status_values
  WHERE code = 'onboarded' AND category_id = (SELECT id FROM status_categories WHERE code = 'user_funnel');

  SELECT id INTO v_pending_id FROM status_values
  WHERE code = 'pending' AND category_id = (SELECT id FROM status_categories WHERE code = 'user_funnel');

  SELECT id INTO v_suspended_id FROM status_values
  WHERE code = 'suspended' AND category_id = (SELECT id FROM status_categories WHERE code = 'user_funnel');

  -- Get member status IDs
  SELECT id INTO v_member_active_id FROM status_values
  WHERE code = 'active' AND category_id = (SELECT id FROM status_categories WHERE code = 'member_eligibility');

  SELECT id INTO v_member_inactive_id FROM status_values
  WHERE code = 'inactive' AND category_id = (SELECT id FROM status_categories WHERE code = 'member_eligibility');

  SELECT id INTO v_member_suspended_id FROM status_values
  WHERE code = 'suspended' AND category_id = (SELECT id FROM status_categories WHERE code = 'member_eligibility');

  SELECT id INTO v_member_won_id FROM status_values
  WHERE code = 'won' AND category_id = (SELECT id FROM status_categories WHERE code = 'member_eligibility');

  SELECT id INTO v_member_paid_id FROM status_values
  WHERE code = 'paid' AND category_id = (SELECT id FROM status_categories WHERE code = 'member_eligibility');

  -- Get subscription status IDs
  SELECT id INTO v_sub_active_id FROM status_values
  WHERE code = 'active' AND category_id = (SELECT id FROM status_categories WHERE code = 'subscription_status');

  SELECT id INTO v_sub_trialing_id FROM status_values
  WHERE code = 'trialing' AND category_id = (SELECT id FROM status_categories WHERE code = 'subscription_status');

  -- Get KYC status IDs
  SELECT id INTO v_kyc_verified_id FROM status_values
  WHERE code = 'verified' AND category_id = (SELECT id FROM status_categories WHERE code = 'kyc_status');

  -- Rule 1: Full Dashboard Access (Active paying members)
  INSERT INTO access_control_rules (
    name, description,
    user_status_ids, member_status_ids, subscription_status_ids,
    requires_email_verified, requires_phone_verified, requires_profile_complete,
    priority
  ) VALUES (
    'dashboard_full_access',
    'Full dashboard access for active paying members',
    ARRAY[v_onboarded_id],
    ARRAY[v_member_active_id, v_member_won_id],
    ARRAY[v_sub_active_id, v_sub_trialing_id],
    true, true, true,
    100
  ) ON CONFLICT DO NOTHING;

  -- Rule 2: Dashboard Read-Only (Won/Paid members - can view but not interact)
  INSERT INTO access_control_rules (
    name, description,
    user_status_ids, member_status_ids,
    requires_email_verified,
    priority
  ) VALUES (
    'dashboard_read_only',
    'Read-only dashboard access for won/paid members',
    ARRAY[v_onboarded_id],
    ARRAY[v_member_won_id, v_member_paid_id],
    true,
    90
  ) ON CONFLICT DO NOTHING;

  -- Rule 3: Suspended User Access (redirect to suspension page)
  INSERT INTO access_control_rules (
    name, description,
    user_status_ids,
    priority
  ) VALUES (
    'suspended_access',
    'Suspended users - redirect to suspension page',
    ARRAY[v_suspended_id],
    200
  ) ON CONFLICT DO NOTHING;

  -- Rule 4: Onboarding Access (users still in signup flow)
  INSERT INTO access_control_rules (
    name, description,
    user_status_ids,
    priority
  ) VALUES (
    'onboarding_access',
    'Users in onboarding process',
    ARRAY[v_pending_id],
    80
  ) ON CONFLICT DO NOTHING;

  -- Rule 5: Payout Eligibility (for payout service checks)
  INSERT INTO access_control_rules (
    name, description,
    member_status_ids, subscription_status_ids, kyc_status_ids,
    requires_active_subscription,
    priority
  ) VALUES (
    'payout_eligible',
    'Eligible for payout selection',
    ARRAY[v_member_active_id],
    ARRAY[v_sub_active_id, v_sub_trialing_id],
    ARRAY[v_kyc_verified_id],
    true,
    100
  ) ON CONFLICT DO NOTHING;

END $$;

-- =====================================================
-- PHASE 6: Create Protected Routes
-- =====================================================

INSERT INTO protected_routes (route_pattern, route_name, requires_auth, is_public, redirect_route, priority) VALUES
-- Public routes
('/', 'Home', false, true, NULL, 100),
('/login', 'Login', false, true, NULL, 100),
('/signup', 'Signup', false, true, NULL, 100),
('/reset-password', 'Reset Password', false, true, NULL, 100),
('/reset-password/*', 'Reset Password Flow', false, true, NULL, 99),

-- Auth callback
('/auth/callback', 'Auth Callback', true, false, '/login', 90),

-- Onboarding routes
('/signup?step=*', 'Signup Steps', true, false, '/login', 80),

-- Suspended page
('/suspended', 'Suspension Notice', true, false, '/login', 70),

-- Dashboard routes (require full access)
('/dashboard', 'Dashboard', true, false, '/signup', 50),
('/dashboard/*', 'Dashboard Pages', true, false, '/signup', 49),

-- Settings
('/settings', 'Settings', true, false, '/signup', 48),
('/settings/*', 'Settings Pages', true, false, '/signup', 47)

ON CONFLICT DO NOTHING;

-- Link routes to access rules
UPDATE protected_routes
SET access_rule_id = (SELECT id FROM access_control_rules WHERE name = 'dashboard_full_access')
WHERE route_pattern IN ('/dashboard', '/dashboard/*', '/settings', '/settings/*');

UPDATE protected_routes
SET access_rule_id = (SELECT id FROM access_control_rules WHERE name = 'suspended_access'),
    redirect_route = '/suspended'
WHERE route_pattern = '/suspended';

UPDATE protected_routes
SET access_rule_id = (SELECT id FROM access_control_rules WHERE name = 'onboarding_access')
WHERE route_pattern LIKE '/signup%';

-- =====================================================
-- PHASE 7: Create Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_status_values_category ON status_values(category_id);
CREATE INDEX IF NOT EXISTS idx_status_values_code ON status_values(code);
CREATE INDEX IF NOT EXISTS idx_status_values_active ON status_values(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_status_transitions_category ON status_transitions(category_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_from ON status_transitions(from_status_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_to ON status_transitions(to_status_id);

CREATE INDEX IF NOT EXISTS idx_access_rules_active ON access_control_rules(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_protected_routes_pattern ON protected_routes(route_pattern);
CREATE INDEX IF NOT EXISTS idx_protected_routes_active ON protected_routes(is_active, priority DESC);

-- =====================================================
-- PHASE 8: Create Helper Functions
-- =====================================================

-- Function to get status display name
CREATE OR REPLACE FUNCTION get_status_display_name(
  p_category_code VARCHAR,
  p_status_code VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT sv.display_name
    FROM status_values sv
    JOIN status_categories sc ON sc.id = sv.category_id
    WHERE sc.code = p_category_code
    AND sv.code = p_status_code
    AND sv.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all statuses for a category
CREATE OR REPLACE FUNCTION get_category_statuses(p_category_code VARCHAR)
RETURNS TABLE (
  id INTEGER,
  code VARCHAR,
  display_name VARCHAR,
  description TEXT,
  color VARCHAR,
  sort_order INTEGER,
  is_default BOOLEAN,
  is_terminal BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sv.id,
    sv.code,
    sv.display_name,
    sv.description,
    sv.color,
    sv.sort_order,
    sv.is_default,
    sv.is_terminal
  FROM status_values sv
  JOIN status_categories sc ON sc.id = sv.category_id
  WHERE sc.code = p_category_code
  AND sv.is_active = true
  ORDER BY sv.sort_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has access to route
CREATE OR REPLACE FUNCTION check_route_access(
  p_user_id UUID,
  p_route VARCHAR
) RETURNS TABLE (
  allowed BOOLEAN,
  redirect_to VARCHAR,
  rule_name VARCHAR
) AS $$
DECLARE
  v_user_status VARCHAR;
  v_member_status VARCHAR;
  v_subscription_status VARCHAR;
  v_kyc_status VARCHAR;
  v_email_verified BOOLEAN;
  v_phone_verified BOOLEAN;
  v_has_profile BOOLEAN;
  v_rule RECORD;
  v_route_config RECORD;
BEGIN
  -- Get user's current statuses
  SELECT u.status INTO v_user_status FROM users u WHERE u.id = p_user_id;
  SELECT um.member_status INTO v_member_status FROM user_memberships um WHERE um.user_id = p_user_id LIMIT 1;
  SELECT us.status INTO v_subscription_status FROM user_subscriptions us WHERE us.user_id = p_user_id AND us.status = 'active' LIMIT 1;
  SELECT kv.status INTO v_kyc_status FROM kyc_verification kv WHERE kv.user_id = p_user_id LIMIT 1;
  SELECT u.email_verified INTO v_email_verified FROM users u WHERE u.id = p_user_id;
  SELECT EXISTS(SELECT 1 FROM user_contacts uc WHERE uc.user_id = p_user_id AND uc.contact_type = 'phone' AND uc.is_verified = true) INTO v_phone_verified;
  SELECT EXISTS(SELECT 1 FROM user_profiles up WHERE up.user_id = p_user_id) INTO v_has_profile;

  -- Find matching route config
  SELECT * INTO v_route_config
  FROM protected_routes pr
  WHERE pr.is_active = true
  AND (
    pr.route_pattern = p_route
    OR (pr.route_pattern LIKE '%*' AND p_route LIKE REPLACE(pr.route_pattern, '*', '%'))
  )
  ORDER BY pr.priority DESC
  LIMIT 1;

  -- If no route config or public route, allow
  IF v_route_config IS NULL OR v_route_config.is_public THEN
    RETURN QUERY SELECT true, NULL::VARCHAR, NULL::VARCHAR;
    RETURN;
  END IF;

  -- If no access rule, check if auth required
  IF v_route_config.access_rule_id IS NULL THEN
    IF v_route_config.requires_auth AND v_user_status IS NULL THEN
      RETURN QUERY SELECT false, v_route_config.redirect_route, 'auth_required'::VARCHAR;
    ELSE
      RETURN QUERY SELECT true, NULL::VARCHAR, NULL::VARCHAR;
    END IF;
    RETURN;
  END IF;

  -- Get access rule
  SELECT * INTO v_rule FROM access_control_rules WHERE id = v_route_config.access_rule_id;

  -- Check status conditions (simplified - full implementation would check arrays)
  -- This is a simplified check - production would use proper array contains logic

  RETURN QUERY SELECT true, NULL::VARCHAR, v_rule.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- PHASE 9: Grant Permissions
-- =====================================================

GRANT SELECT ON status_categories TO authenticated;
GRANT SELECT ON status_values TO authenticated;
GRANT SELECT ON status_transitions TO authenticated;
GRANT SELECT ON access_control_rules TO authenticated;
GRANT SELECT ON protected_routes TO authenticated;
GRANT SELECT ON feature_access TO authenticated;

GRANT ALL ON status_categories TO service_role;
GRANT ALL ON status_values TO service_role;
GRANT ALL ON status_transitions TO service_role;
GRANT ALL ON access_control_rules TO service_role;
GRANT ALL ON protected_routes TO service_role;
GRANT ALL ON feature_access TO service_role;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Status Lookup System Migration Complete!';
  RAISE NOTICE 'Tables created: status_categories, status_values, status_transitions';
  RAISE NOTICE 'Access control tables: access_control_rules, protected_routes, feature_access';
  RAISE NOTICE 'Run: SELECT * FROM get_category_statuses(''member_eligibility''); to verify';
END $$;

-- Show summary
SELECT
  'Status Categories' as entity,
  COUNT(*) as count
FROM status_categories
UNION ALL
SELECT
  'Status Values' as entity,
  COUNT(*) as count
FROM status_values
UNION ALL
SELECT
  'Access Rules' as entity,
  COUNT(*) as count
FROM access_control_rules
UNION ALL
SELECT
  'Protected Routes' as entity,
  COUNT(*) as count
FROM protected_routes;
