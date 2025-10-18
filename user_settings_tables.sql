-- User Settings Tables for Supabase
-- This file contains all the necessary tables for user settings functionality

-- 1. User Settings Table
CREATE TABLE public.user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Notification Settings
    email_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    push_notifications boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    
    -- Security Settings
    two_factor_auth boolean DEFAULT false,
    two_factor_secret text, -- Encrypted 2FA secret
    login_alerts boolean DEFAULT true,
    session_timeout integer DEFAULT 30, -- minutes
    
    -- Privacy Settings
    profile_visibility text DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'friends')),
    data_sharing boolean DEFAULT false,
    
    -- Appearance Settings
    theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language text DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko')),
    
    -- Payment Settings
    auto_renewal boolean DEFAULT true,
    payment_method text DEFAULT 'card' CHECK (payment_method IN ('card', 'bank', 'paypal', 'crypto')),
    billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
    
    -- Additional Settings
    timezone text DEFAULT 'UTC',
    date_format text DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
    currency text DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY')),
    
    -- Constraints
    UNIQUE(user_id)
);

-- 2. User Notification Preferences Table
CREATE TABLE public.user_notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Email Notification Types
    email_payment_reminders boolean DEFAULT true,
    email_tenure_updates boolean DEFAULT true,
    email_security_alerts boolean DEFAULT true,
    email_system_updates boolean DEFAULT false,
    email_newsletter boolean DEFAULT false,
    
    -- SMS Notification Types
    sms_payment_reminders boolean DEFAULT false,
    sms_security_alerts boolean DEFAULT true,
    sms_urgent_updates boolean DEFAULT true,
    
    -- Push Notification Types
    push_payment_reminders boolean DEFAULT true,
    push_tenure_updates boolean DEFAULT true,
    push_security_alerts boolean DEFAULT true,
    push_system_updates boolean DEFAULT false,
    
    -- Frequency Settings
    email_frequency text DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'monthly')),
    sms_frequency text DEFAULT 'urgent_only' CHECK (sms_frequency IN ('immediate', 'urgent_only', 'never')),
    push_frequency text DEFAULT 'immediate' CHECK (push_frequency IN ('immediate', 'daily', 'weekly', 'never')),
    
    -- Constraints
    UNIQUE(user_id)
);

-- 3. User Security Settings Table
CREATE TABLE public.user_security_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Two-Factor Authentication
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret text, -- Encrypted TOTP secret
    two_factor_backup_codes text[], -- Encrypted backup codes
    two_factor_last_used timestamp with time zone,
    
    -- Login Security
    login_alerts boolean DEFAULT true,
    session_timeout integer DEFAULT 30, -- minutes
    max_concurrent_sessions integer DEFAULT 3,
    
    -- Password Security
    password_last_changed timestamp with time zone,
    password_strength_score integer DEFAULT 0, -- 0-100
    require_password_change boolean DEFAULT false,
    
    -- Device Management
    trusted_devices jsonb DEFAULT '[]'::jsonb, -- Array of trusted device info
    device_fingerprint_required boolean DEFAULT false,
    
    -- Security Questions (encrypted)
    security_questions jsonb DEFAULT '[]'::jsonb,
    
    -- Constraints
    UNIQUE(user_id)
);

-- 4. User Payment Settings Table
CREATE TABLE public.user_payment_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Payment Preferences
    auto_renewal boolean DEFAULT true,
    payment_method text DEFAULT 'card' CHECK (payment_method IN ('card', 'bank', 'paypal', 'crypto', 'apple_pay', 'google_pay')),
    billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
    
    -- Billing Information
    billing_address jsonb, -- Encrypted billing address
    tax_id text, -- Encrypted tax ID for business accounts
    
    -- Payment Methods (encrypted)
    saved_payment_methods jsonb DEFAULT '[]'::jsonb,
    default_payment_method_id text,
    
    -- Billing Preferences
    invoice_delivery text DEFAULT 'email' CHECK (invoice_delivery IN ('email', 'mail', 'both')),
    payment_reminders boolean DEFAULT true,
    payment_reminder_days integer DEFAULT 3, -- days before due date
    
    -- Currency and Regional Settings
    currency text DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'BRL', 'MXN')),
    tax_rate decimal(5,4) DEFAULT 0.0000, -- 0.0000 to 1.0000 (0% to 100%)
    
    -- Constraints
    UNIQUE(user_id)
);

-- 5. User Privacy Settings Table
CREATE TABLE public.user_privacy_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Profile Visibility
    profile_visibility text DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'friends', 'members_only')),
    show_tenure_months boolean DEFAULT true,
    show_join_date boolean DEFAULT true,
    show_activity_status boolean DEFAULT true,
    
    -- Data Sharing
    data_sharing boolean DEFAULT false,
    analytics_consent boolean DEFAULT false,
    marketing_consent boolean DEFAULT false,
    third_party_sharing boolean DEFAULT false,
    
    -- Contact Information Privacy
    show_email boolean DEFAULT false,
    show_phone boolean DEFAULT false,
    show_address boolean DEFAULT false,
    
    -- Activity Privacy
    show_login_activity boolean DEFAULT false,
    show_payment_history boolean DEFAULT false,
    show_tenure_progress boolean DEFAULT true,
    
    -- Search and Discovery
    searchable boolean DEFAULT true,
    appear_in_leaderboards boolean DEFAULT true,
    show_in_member_directory boolean DEFAULT false,
    
    -- Data Retention
    data_retention_period integer DEFAULT 365, -- days
    auto_delete_inactive boolean DEFAULT false,
    inactive_period integer DEFAULT 730, -- days
    
    -- Constraints
    UNIQUE(user_id)
);

-- 6. User Appearance Settings Table
CREATE TABLE public.user_appearance_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Theme Settings
    theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    accent_color text DEFAULT 'blue' CHECK (accent_color IN ('blue', 'green', 'purple', 'red', 'orange', 'pink', 'indigo', 'teal')),
    
    -- Language and Localization
    language text DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ru', 'ar', 'hi')),
    timezone text DEFAULT 'UTC',
    date_format text DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
    time_format text DEFAULT '12' CHECK (time_format IN ('12', '24')),
    
    -- Display Preferences
    font_size text DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'extra_large')),
    compact_mode boolean DEFAULT false,
    show_animations boolean DEFAULT true,
    reduce_motion boolean DEFAULT false,
    
    -- Dashboard Preferences
    dashboard_layout text DEFAULT 'default' CHECK (dashboard_layout IN ('default', 'compact', 'detailed')),
    sidebar_collapsed boolean DEFAULT false,
    show_tooltips boolean DEFAULT true,
    
    -- Notifications Display
    notification_position text DEFAULT 'top-right' CHECK (notification_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
    notification_duration integer DEFAULT 5000, -- milliseconds
    
    -- Constraints
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_settings_user_id ON public.user_settings (user_id);
CREATE INDEX idx_user_notification_preferences_user_id ON public.user_notification_preferences (user_id);
CREATE INDEX idx_user_security_settings_user_id ON public.user_security_settings (user_id);
CREATE INDEX idx_user_payment_settings_user_id ON public.user_payment_settings (user_id);
CREATE INDEX idx_user_privacy_settings_user_id ON public.user_privacy_settings (user_id);
CREATE INDEX idx_user_appearance_settings_user_id ON public.user_appearance_settings (user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_security_settings_updated_at BEFORE UPDATE ON public.user_security_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_payment_settings_updated_at BEFORE UPDATE ON public.user_payment_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_privacy_settings_updated_at BEFORE UPDATE ON public.user_privacy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_appearance_settings_updated_at BEFORE UPDATE ON public.user_appearance_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_appearance_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settings" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_notification_preferences
CREATE POLICY "Users can view their own notification preferences" ON public.user_notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notification preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notification preferences" ON public.user_notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notification preferences" ON public.user_notification_preferences FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_security_settings
CREATE POLICY "Users can view their own security settings" ON public.user_security_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own security settings" ON public.user_security_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own security settings" ON public.user_security_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own security settings" ON public.user_security_settings FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_payment_settings
CREATE POLICY "Users can view their own payment settings" ON public.user_payment_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payment settings" ON public.user_payment_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payment settings" ON public.user_payment_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payment settings" ON public.user_payment_settings FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_privacy_settings
CREATE POLICY "Users can view their own privacy settings" ON public.user_privacy_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own privacy settings" ON public.user_privacy_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own privacy settings" ON public.user_privacy_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own privacy settings" ON public.user_privacy_settings FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_appearance_settings
CREATE POLICY "Users can view their own appearance settings" ON public.user_appearance_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own appearance settings" ON public.user_appearance_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own appearance settings" ON public.user_appearance_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own appearance settings" ON public.user_appearance_settings FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.user_settings IS 'Main user settings table containing general preferences';
COMMENT ON TABLE public.user_notification_preferences IS 'Detailed notification preferences for different types of alerts';
COMMENT ON TABLE public.user_security_settings IS 'Security-related settings including 2FA and login preferences';
COMMENT ON TABLE public.user_payment_settings IS 'Payment method and billing preferences';
COMMENT ON TABLE public.user_privacy_settings IS 'Privacy and data sharing preferences';
COMMENT ON TABLE public.user_appearance_settings IS 'UI/UX appearance and localization preferences';
