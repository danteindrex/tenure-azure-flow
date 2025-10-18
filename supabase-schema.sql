-- =====================================================
-- Complete Supabase Database Schema
-- =====================================================
-- This script creates the complete database schema for the Tenure application
-- including authentication, profiles, and business logic tables
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 2: CREATE PROFILES TABLE (for frontend compatibility)
-- =====================================================
-- This table stores user profile information and is used by the frontend
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_state ON public.profiles(state);

-- Add comments
COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase auth.users';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users(id)';
COMMENT ON COLUMN public.profiles.email IS 'User email address';
COMMENT ON COLUMN public.profiles.full_name IS 'User full name';
COMMENT ON COLUMN public.profiles.phone IS 'User phone number';
COMMENT ON COLUMN public.profiles.street_address IS 'User street address';
COMMENT ON COLUMN public.profiles.city IS 'User city';
COMMENT ON COLUMN public.profiles.state IS 'User state (US state code)';
COMMENT ON COLUMN public.profiles.zip_code IS 'User ZIP/postal code';

-- =====================================================
-- STEP 3: CREATE ADMIN TABLE (for admin users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admin
CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admin(email);
CREATE INDEX IF NOT EXISTS idx_admin_status ON public.admin(status);
CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin(role);

COMMENT ON TABLE public.admin IS 'Administrative users for the system';
COMMENT ON COLUMN public.admin.role IS 'Admin role level';
COMMENT ON COLUMN public.admin.status IS 'Admin account status';

-- =====================================================
-- STEP 4: CREATE MEMBER TABLE (for business logic)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.member (
    member_id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Pending')),
    tenure INTEGER DEFAULT 0,
    admin_id BIGINT REFERENCES public.admin(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for member
CREATE INDEX IF NOT EXISTS idx_member_auth_user_id ON public.member(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_member_profile_id ON public.member(profile_id);
CREATE INDEX IF NOT EXISTS idx_member_email ON public.member(email);
CREATE INDEX IF NOT EXISTS idx_member_status ON public.member(status);
CREATE INDEX IF NOT EXISTS idx_member_admin_id ON public.member(admin_id);
CREATE INDEX IF NOT EXISTS idx_member_city ON public.member(city);
CREATE INDEX IF NOT EXISTS idx_member_state ON public.member(state);
CREATE INDEX IF NOT EXISTS idx_member_zip_code ON public.member(zip_code);

COMMENT ON TABLE public.member IS 'Program members (frontend users with Supabase auth)';
COMMENT ON COLUMN public.member.auth_user_id IS 'Links to Supabase auth.users(id)';
COMMENT ON COLUMN public.member.profile_id IS 'Links to profiles table';
COMMENT ON COLUMN public.member.admin_id IS 'Assigned administrator from admin table';
COMMENT ON COLUMN public.member.tenure IS 'Current tenure duration in months';

-- =====================================================
-- STEP 5: CREATE BUSINESS TABLES
-- =====================================================

-- Tenure table
CREATE TABLE IF NOT EXISTS public.tenure (
    tenure_id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES public.member(member_id) ON DELETE CASCADE,
    start_tenure DATE NOT NULL,
    end_tenure DATE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled', 'On Hold')),
    script_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenure_member_id ON public.tenure(member_id);
CREATE INDEX IF NOT EXISTS idx_tenure_status ON public.tenure(status);
CREATE INDEX IF NOT EXISTS idx_tenure_start_date ON public.tenure(start_tenure);

COMMENT ON TABLE public.tenure IS 'Tenure period records for each member';
COMMENT ON COLUMN public.tenure.script_no IS 'Customer/internal script reference';

-- Payment table
CREATE TABLE IF NOT EXISTS public.payment (
    payment_id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES public.member(member_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Mobile Money', 'Other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    transaction_reference TEXT,
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_member_id ON public.payment(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_date ON public.payment(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_status ON public.payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_stripe_id ON public.payment(stripe_payment_intent_id);

COMMENT ON TABLE public.payment IS 'Payment transactions from members';

-- Payout table
CREATE TABLE IF NOT EXISTS public.payout (
    payout_id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES public.payment(payment_id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES public.member(member_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
    trigger_condition_met BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Issued', 'Claimed', 'Expired')),
    payout_method TEXT CHECK (payout_method IN ('Bank Transfer', 'Mobile Money', 'Check', 'Cash', 'Store Credit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_payment_id ON public.payout(payment_id);
CREATE INDEX IF NOT EXISTS idx_payout_member_id ON public.payout(member_id);
CREATE INDEX IF NOT EXISTS idx_payout_date_issued ON public.payout(date_issued);
CREATE INDEX IF NOT EXISTS idx_payout_status ON public.payout(status);

COMMENT ON TABLE public.payout IS 'Reward payouts triggered by payments';
COMMENT ON COLUMN public.payout.trigger_condition_met IS 'Whether payout condition was satisfied';

-- News feed posts table
CREATE TABLE IF NOT EXISTS public.news_feed_post (
    post_id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    publish_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
    priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_feed_post_admin_id ON public.news_feed_post(admin_id);
CREATE INDEX IF NOT EXISTS idx_news_feed_post_publish_date ON public.news_feed_post(publish_date);
CREATE INDEX IF NOT EXISTS idx_news_feed_post_status ON public.news_feed_post(status);

COMMENT ON TABLE public.news_feed_post IS 'News/announcements created by admins';
COMMENT ON COLUMN public.news_feed_post.admin_id IS 'Admin who created the post';

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES public.admin(id) ON DELETE SET NULL,
    entity_changed TEXT NOT NULL,
    entity_id BIGINT,
    change_type TEXT NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON public.audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_changed ON public.audit_log(entity_changed);
CREATE INDEX IF NOT EXISTS idx_audit_log_change_type ON public.audit_log(change_type);

COMMENT ON TABLE public.audit_log IS 'Audit trail for all system changes';
COMMENT ON COLUMN public.audit_log.admin_id IS 'Admin who made the change';

-- =====================================================
-- STEP 6: CREATE TRIGGERS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_updated_at ON public.admin;
CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON public.admin
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_member_updated_at ON public.member;
CREATE TRIGGER update_member_updated_at BEFORE UPDATE ON public.member
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenure_updated_at ON public.tenure;
CREATE TRIGGER update_tenure_updated_at BEFORE UPDATE ON public.tenure
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_updated_at ON public.payment;
CREATE TRIGGER update_payment_updated_at BEFORE UPDATE ON public.payment
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_updated_at ON public.payout;
CREATE TRIGGER update_payout_updated_at BEFORE UPDATE ON public.payout
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_feed_post_updated_at ON public.news_feed_post;
CREATE TRIGGER update_news_feed_post_updated_at BEFORE UPDATE ON public.news_feed_post
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 7: CREATE PROFILE TRIGGER (for frontend compatibility)
-- =====================================================

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_phone TEXT;
  user_street_address TEXT;
  user_city TEXT;
  user_state TEXT;
  user_zip_code TEXT;
BEGIN
  -- Extract data from raw_user_meta_data
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  user_phone := NEW.raw_user_meta_data->>'phone';
  user_street_address := NEW.raw_user_meta_data->>'street_address';
  user_city := NEW.raw_user_meta_data->>'city';
  user_state := NEW.raw_user_meta_data->>'state';
  user_zip_code := NEW.raw_user_meta_data->>'zip_code';

  -- Insert into profiles table
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    street_address,
    city,
    state,
    zip_code,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    COALESCE(user_phone, ''),
    COALESCE(user_street_address, ''),
    COALESCE(user_city, ''),
    COALESCE(user_state, ''),
    COALESCE(user_zip_code, ''),
    NOW(),
    NOW()
  );

  -- Insert into member table
  INSERT INTO public.member (
    auth_user_id,
    profile_id,
    name,
    email,
    phone,
    street_address,
    city,
    state,
    zip_code,
    join_date,
    status,
    tenure,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id, -- profile_id same as auth_user_id
    user_name,
    NEW.email,
    COALESCE(user_phone, ''),
    COALESCE(user_street_address, ''),
    COALESCE(user_city, ''),
    COALESCE(user_state, ''),
    COALESCE(user_zip_code, ''),
    CURRENT_DATE,
    'Pending',
    0,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- =====================================================
-- STEP 8: SET UP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_feed_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Member policies
CREATE POLICY "Users can view own member record" ON public.member
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can view all members" ON public.member
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin 
            WHERE id = (SELECT id FROM public.admin WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        )
    );

-- Tenure policies
CREATE POLICY "Users can view own tenure" ON public.tenure
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.member 
            WHERE member_id = tenure.member_id AND auth_user_id = auth.uid()
        )
    );

-- Payment policies
CREATE POLICY "Users can view own payments" ON public.payment
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.member 
            WHERE member_id = payment.member_id AND auth_user_id = auth.uid()
        )
    );

-- Payout policies
CREATE POLICY "Users can view own payouts" ON public.payout
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.member 
            WHERE member_id = payout.member_id AND auth_user_id = auth.uid()
        )
    );

-- News feed policies
CREATE POLICY "Everyone can view published posts" ON public.news_feed_post
    FOR SELECT USING (status = 'Published');

-- =====================================================
-- STEP 9: CREATE SAMPLE DATA (optional)
-- =====================================================

-- Insert sample admin user
INSERT INTO public.admin (email, password_hash, full_name, role, status)
VALUES (
    'admin@tenure.com',
    crypt('admin123', gen_salt('bf')),
    'System Administrator',
    'super_admin',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- List all created tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check if triggers are created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================
SELECT 
    'Database schema created successfully!' as status,
    'Tables: profiles, admin, member, tenure, payment, payout, news_feed_post, audit_log' as tables_created,
    'Triggers: Profile creation, updated_at timestamps' as triggers_created,
    'Policies: Row Level Security enabled' as security_enabled;
