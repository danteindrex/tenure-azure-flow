-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'queue', 'milestone', 'reminder', 'system', 'bonus', 'security', 'profile', 'support')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  action_text VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  in_app_notifications BOOLEAN DEFAULT TRUE,
  payment_notifications BOOLEAN DEFAULT TRUE,
  queue_notifications BOOLEAN DEFAULT TRUE,
  milestone_notifications BOOLEAN DEFAULT TRUE,
  reminder_notifications BOOLEAN DEFAULT TRUE,
  system_notifications BOOLEAN DEFAULT TRUE,
  bonus_notifications BOOLEAN DEFAULT TRUE,
  security_notifications BOOLEAN DEFAULT TRUE,
  profile_notifications BOOLEAN DEFAULT TRUE,
  support_notifications BOOLEAN DEFAULT TRUE,
  digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'queue', 'milestone', 'reminder', 'system', 'bonus', 'security', 'profile', 'support')),
  title_template VARCHAR(255) NOT NULL,
  message_template TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Insert some default notification templates
INSERT INTO notification_templates (name, type, title_template, message_template, priority) VALUES
('joining_fee_required', 'payment', 'Joining Fee Required', 'Please complete your joining fee of ${{amount}} to activate your membership and start your tenure tracking.', 'urgent'),
('monthly_payment_due', 'payment', 'Monthly Payment Due Soon', 'Your monthly payment of ${{amount}} is due in {{days}} days. Ensure payment to maintain continuous tenure.', 'high'),
('payment_overdue', 'payment', 'Monthly Payment Overdue', 'Your monthly payment of ${{amount}} is {{days}} days overdue. You have {{grace_days}} days remaining before default.', 'urgent'),
('payment_failed', 'payment', 'Payment Failed', 'Your recent payment of ${{amount}} failed. {{reason}} Please update your payment method and try again.', 'high'),
('payout_ready', 'milestone', 'Payout Conditions Met!', 'Fund has reached ${{fund_amount}} with {{potential_winners}} potential winners. Payout process can begin.', 'high'),
('queue_position_update', 'queue', 'Queue Position Updated', 'You are now {{position}} in line for payout based on your continuous tenure.', 'medium'),
('tenure_milestone', 'milestone', 'Tenure Milestone Reached', 'Congratulations! You have completed {{months}} months of continuous tenure.', 'medium'),
('fund_progress', 'system', 'Fund Building Progress', 'Current fund: ${{current_fund}}. Need ${{remaining}} more to reach minimum payout threshold.', 'low')
ON CONFLICT (name) DO NOTHING;