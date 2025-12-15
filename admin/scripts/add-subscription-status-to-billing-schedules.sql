-- Note: subscription_statuses table already exists in your database
-- This script adds subscription_status_id to user_billing_schedules and migrates data

-- Insert subscription statuses (if they don't already exist)
INSERT INTO subscription_statuses (id, name, description, color) VALUES
  (1, 'Active', 'Subscription is active and current', '#10B981'),
  (2, 'Trialing', 'Subscription is in trial period', '#3B82F6'),
  (3, 'Past Due', 'Payment failed, subscription awaiting payment retry', '#F59E0B'),
  (4, 'Canceled', 'Subscription has been canceled', '#EF4444'),
  (5, 'Incomplete', 'Initial payment for subscription failed', '#9CA3AF'),
  (6, 'Unpaid', 'Payment failed after all retry attempts', '#DC2626')
ON CONFLICT (id) DO NOTHING;

-- Add subscription_status_id column to user_billing_schedules table
ALTER TABLE user_billing_schedules 
ADD COLUMN IF NOT EXISTS subscription_status_id INTEGER REFERENCES subscription_statuses(id);

-- Migrate existing is_active data to subscription_status_id
-- Maps: is_active=true → 1 (Active), is_active=false → 4 (Canceled)
UPDATE user_billing_schedules 
SET subscription_status_id = CASE 
  WHEN is_active = true THEN 1  -- Active
  ELSE 4  -- Canceled
END
WHERE subscription_status_id IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_billing_schedules_subscription_status_id ON user_billing_schedules(subscription_status_id);
