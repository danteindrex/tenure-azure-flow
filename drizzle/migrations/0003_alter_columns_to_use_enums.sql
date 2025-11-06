-- Migration: Alter status columns to use ENUM types
-- Date: 2025-11-06
-- Description: Convert text/varchar status columns to use proper ENUM types

-- Step 0: Drop views, functions, and indexes that depend on the status columns (we'll recreate them at the end)
DROP VIEW IF EXISTS active_member_queue_view CASCADE;
DROP FUNCTION IF EXISTS get_queue_statistics() CASCADE;
DROP FUNCTION IF EXISTS get_user_queue_position(UUID) CASCADE;

-- Drop indexes that have predicates on status columns
DROP INDEX IF EXISTS idx_user_payments_created_at_status;
DROP INDEX IF EXISTS idx_user_subscriptions_status_active;
DROP INDEX IF EXISTS idx_payout_management_user_status;
DROP INDEX IF EXISTS idx_user_payments_user_status_date;

-- Step 1: Alter users.status to use enum_users_status
-- Drop default first, then change type, then add default back
ALTER TABLE "user" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "user"
  ALTER COLUMN status TYPE enum_users_status
  USING status::enum_users_status;
ALTER TABLE "user" ALTER COLUMN status SET DEFAULT 'Pending'::enum_users_status;

-- Step 2: Alter user_subscriptions.status to use enum_user_subscriptions_status
-- Drop default first, then change type, then add default back if needed
ALTER TABLE user_subscriptions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE user_subscriptions
  ALTER COLUMN status TYPE enum_user_subscriptions_status
  USING status::enum_user_subscriptions_status;

-- Step 3: Alter user_payments.status to use enum_user_payments_status
-- Drop default first, then change type, then add default back if needed
ALTER TABLE user_payments ALTER COLUMN status DROP DEFAULT;
ALTER TABLE user_payments
  ALTER COLUMN status TYPE enum_user_payments_status
  USING status::enum_user_payments_status;

-- Step 4: Recreate the active_member_queue_view (exact copy from create_queue_view.sql)
CREATE OR REPLACE VIEW active_member_queue_view AS
SELECT
  -- User identification
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,

  -- Profile information
  up.first_name,
  up.last_name,
  up.middle_name,
  CONCAT_WS(' ', up.first_name, up.middle_name, up.last_name) as full_name,

  -- Subscription details
  s.id as subscription_id,
  s.status as subscription_status,
  s.provider_subscription_id,

  -- Payment statistics (calculated from user_payments)
  MIN(p.created_at) as tenure_start_date,
  MAX(p.created_at) as last_payment_date,
  COUNT(p.id) FILTER (WHERE p.status = 'succeeded') as total_successful_payments,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as lifetime_payment_total,

  -- Payout status (check if user has received payout)
  EXISTS(
    SELECT 1 FROM payout_management pm
    WHERE pm.user_id = u.id
    AND pm.status = 'completed'
  ) as has_received_payout,

  -- Calculated queue position (ROW_NUMBER ordered by tenure)
  ROW_NUMBER() OVER (
    ORDER BY MIN(p.created_at) ASC, u.id ASC
  ) as queue_position,

  -- Eligibility flags
  (s.status = 'active') as is_eligible,
  (COUNT(p.id) FILTER (WHERE p.status = 'succeeded') >= 12) as meets_time_requirement,

  -- Metadata
  NOW() as calculated_at

FROM users u
INNER JOIN user_subscriptions s ON s.user_id = u.id
INNER JOIN user_payments p ON p.user_id = u.id
LEFT JOIN user_profiles up ON up.user_id = u.id

WHERE
  -- Only active subscriptions
  s.status = 'active'

  -- Only successful payments
  AND p.status = 'succeeded'

  -- Exclude zero-amount payments
  AND p.amount > 0

  -- Exclude past winners (users who have received payouts)
  AND NOT EXISTS(
    SELECT 1 FROM payout_management pm
    WHERE pm.user_id = u.id
    AND pm.status = 'completed'
  )

GROUP BY
  u.id,
  u.email,
  u.created_at,
  up.first_name,
  up.last_name,
  up.middle_name,
  s.id,
  s.status,
  s.provider_subscription_id

ORDER BY
  MIN(p.created_at) ASC,
  u.id ASC;

COMMENT ON VIEW active_member_queue_view IS
'Dynamic queue view that calculates member positions from subscriptions and payments.
Automatically excludes canceled subscriptions and past winners.
Queue positions are calculated in real-time based on tenure (first payment date).';

-- Step 5: Recreate helper functions (exact copies from create_queue_view.sql)
CREATE OR REPLACE FUNCTION get_queue_statistics()
RETURNS TABLE (
  total_members BIGINT,
  eligible_members BIGINT,
  members_meeting_time_req BIGINT,
  total_revenue NUMERIC,
  oldest_member_date TIMESTAMP WITH TIME ZONE,
  newest_member_date TIMESTAMP WITH TIME ZONE,
  potential_winners INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE is_eligible = true)::BIGINT as eligible_members,
    COUNT(*) FILTER (WHERE meets_time_requirement = true)::BIGINT as members_meeting_time_req,
    COALESCE(SUM(lifetime_payment_total), 0)::NUMERIC as total_revenue,
    MIN(tenure_start_date) as oldest_member_date,
    MAX(tenure_start_date) as newest_member_date,
    LEAST(
      FLOOR(COALESCE(SUM(lifetime_payment_total), 0) / 100000)::INTEGER,
      COUNT(*) FILTER (WHERE is_eligible = true)::INTEGER
    ) as potential_winners
  FROM active_member_queue_view;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_queue_statistics() IS
'Returns aggregated statistics from the active member queue view including total revenue and potential winners.';

CREATE OR REPLACE FUNCTION get_user_queue_position(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  queue_position BIGINT,
  tenure_start_date TIMESTAMP WITH TIME ZONE,
  total_payments BIGINT,
  lifetime_total NUMERIC,
  is_eligible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.user_id,
    v.queue_position,
    v.tenure_start_date,
    v.total_successful_payments,
    v.lifetime_payment_total,
    v.is_eligible
  FROM active_member_queue_view v
  WHERE v.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_queue_position(UUID) IS
'Returns queue position and statistics for a specific user from the active member queue view.';

-- Step 6: Grant permissions
GRANT SELECT ON active_member_queue_view TO authenticated;
GRANT SELECT ON active_member_queue_view TO service_role;

-- Step 7: Recreate the indexes that were dropped
CREATE INDEX IF NOT EXISTS idx_user_payments_created_at_status
ON user_payments(created_at, status)
WHERE status = 'succeeded';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_active
ON user_subscriptions(status)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_payout_management_user_status
ON payout_management(user_id, status)
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_user_payments_user_status_date
ON user_payments(user_id, status, created_at)
WHERE status = 'succeeded' AND amount > 0;

-- Verification queries
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'status';
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'status';
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'user_payments' AND column_name = 'status';
