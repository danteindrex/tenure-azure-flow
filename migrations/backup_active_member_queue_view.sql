-- Backup of active_member_queue_view materialized view definition
-- Created before modifying join_date column type

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
    ss.name AS subscription_status,
    s.provider_subscription_id,
    um.join_date,
    vs.name AS verification_status,
    mes.name AS member_status,
    um.member_status_id,
    min(p.created_at) AS tenure_start_date,
    max(p.created_at) AS last_payment_date,
    count(p.id) FILTER (WHERE p.payment_status_id = 2) AS total_successful_payments,
    COALESCE(sum(p.amount) FILTER (WHERE p.payment_status_id = 2), 0::numeric) AS lifetime_payment_total,
    (EXISTS ( 
        SELECT 1
        FROM payout_management pm
        WHERE pm.membership_id = um.id AND pm.payout_status_id = 5
    )) AS has_received_payout,
    row_number() OVER (ORDER BY (min(p.created_at)), um.id) AS queue_position,
    um.member_status_id = 2 AS is_eligible,
    count(p.id) FILTER (WHERE p.payment_status_id = 2) >= 12 AS meets_time_requirement,
    now() AS calculated_at
FROM user_memberships um
JOIN users u ON u.id = um.user_id
JOIN user_subscriptions s ON s.id = um.subscription_id
JOIN user_payments p ON p.subscription_id = s.id
LEFT JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN member_eligibility_statuses mes ON mes.id = um.member_status_id
LEFT JOIN subscription_statuses ss ON ss.id = s.subscription_status_id
LEFT JOIN verification_statuses vs ON vs.id = um.verification_status_id
WHERE um.member_status_id = 2 
    AND p.payment_status_id = 2 
    AND p.amount > 0::numeric 
    AND NOT (EXISTS ( 
        SELECT 1
        FROM payout_management pm
        WHERE pm.membership_id = um.id AND pm.payout_status_id = 5
    ))
GROUP BY um.id, u.id, u.email, u.created_at, up.first_name, up.last_name, up.middle_name, s.id, ss.name, s.provider_subscription_id, um.join_date, vs.name, mes.name, um.member_status_id
ORDER BY (min(p.created_at)), um.id;

-- Indexes that were on the materialized view:
-- CREATE INDEX idx_active_member_queue_view_is_eligible ON active_member_queue_view (is_eligible);
-- CREATE UNIQUE INDEX idx_active_member_queue_view_membership_id ON active_member_queue_view (membership_id);
-- CREATE INDEX idx_active_member_queue_view_queue_position ON active_member_queue_view (queue_position);
-- CREATE INDEX idx_active_member_queue_view_user_id ON active_member_queue_view (user_id);