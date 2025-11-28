-- Backup of active_member_queue_view before ENUM to VARCHAR migration
-- This view will be recreated after the migration with VARCHAR comparisons

CREATE MATERIALIZED VIEW active_member_queue_view AS
SELECT
  um.id AS membership_id,
  u.id AS user_id,
  u.email,
  u.created_at AS user_created_at,
  up.first_name,
  up.last_name,
  up.middle_name,
  concat_ws(' '::text, up.first_name, up.middle_name, up.last_name) AS full_name,
  s.id AS subscription_id,
  s.status AS subscription_status,
  s.provider_subscription_id,
  um.join_date,
  um.verification_status,
  min(p.created_at) AS tenure_start_date,
  max(p.created_at) AS last_payment_date,
  count(p.id) FILTER (WHERE p.status = 'succeeded') AS total_successful_payments,
  COALESCE(sum(p.amount) FILTER (WHERE p.status = 'succeeded'), 0::numeric) AS lifetime_payment_total,
  (EXISTS (
    SELECT 1
    FROM payout_management pm
    WHERE pm.membership_id = um.id AND pm.status = 'completed'::text
  )) AS has_received_payout,
  row_number() OVER (ORDER BY (min(p.created_at)), um.id) AS queue_position,
  s.status = 'active' AS is_eligible,
  count(p.id) FILTER (WHERE p.status = 'succeeded') >= 12 AS meets_time_requirement,
  now() AS calculated_at
FROM user_memberships um
JOIN users u ON u.id = um.user_id
JOIN user_subscriptions s ON s.id = um.subscription_id
JOIN user_payments p ON p.subscription_id = s.id
LEFT JOIN user_profiles up ON up.user_id = u.id
WHERE s.status = 'active'
  AND p.status = 'succeeded'
  AND p.amount > 0::numeric
  AND NOT (EXISTS (
    SELECT 1
    FROM payout_management pm
    WHERE pm.membership_id = um.id AND pm.status = 'completed'::text
  ))
GROUP BY um.id, u.id, u.email, u.created_at, up.first_name, up.last_name, up.middle_name,
         s.id, s.status, s.provider_subscription_id, um.join_date, um.verification_status
ORDER BY (min(p.created_at)), um.id;

-- Recreate the index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS active_member_queue_view_membership_id_idx
  ON active_member_queue_view (membership_id);
CREATE INDEX IF NOT EXISTS active_member_queue_view_user_id_idx
  ON active_member_queue_view (user_id);
CREATE INDEX IF NOT EXISTS active_member_queue_view_queue_position_idx
  ON active_member_queue_view (queue_position);
