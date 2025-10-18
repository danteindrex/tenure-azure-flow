-- =====================================================
-- Minimal Supabase Schema for Frontend Compatibility
-- =====================================================
-- This script creates the minimal database schema needed
-- for the frontend login/signup functionality to work
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 2: CREATE PROFILES TABLE (required by frontend)
-- =====================================================
-- This table is used by the /api/profiles/upsert endpoint
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
-- STEP 3: CREATE TRIGGER FOR AUTOMATIC PROFILE CREATION
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
-- STEP 4: SET UP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- STEP 5: CREATE FUNCTION TO UPDATE UPDATED_AT
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- List created tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check if trigger is created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table = 'profiles';

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================
SELECT 
    'Minimal database schema created successfully!' as status,
    'Table: profiles (linked to auth.users)' as table_created,
    'Trigger: Automatic profile creation on user signup' as trigger_created,
    'Security: Row Level Security enabled' as security_enabled,
    'Ready for frontend login/signup testing!' as next_step;
