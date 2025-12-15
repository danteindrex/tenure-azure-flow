-- Note: subscription_status_id column already exists in user_subscriptions table
-- Note: subscription_statuses lookup table already exists in your database
-- This script is just for reference - no changes needed!

-- The user_subscriptions table already has:
-- - subscription_status_id column that references subscription_statuses(id)

-- Create index for better query performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_status_id ON user_subscriptions(subscription_status_id);
