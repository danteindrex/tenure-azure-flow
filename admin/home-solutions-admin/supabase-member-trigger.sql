-- =====================================================
-- Supabase Trigger: Auto-Create Member on User Signup
-- =====================================================
-- This trigger automatically creates a Member record
-- when a user signs up via Supabase authentication
-- =====================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_phone TEXT;
BEGIN
  -- Extract name from raw_user_meta_data
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract phone from raw_user_meta_data
  user_phone := NEW.raw_user_meta_data->>'phone';

  -- Insert new member record
  INSERT INTO public.member (
    auth_user_id,
    "Name",
    "Email",
    "Phone",
    "JoinDate",
    "Status",
    "Tenure",
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_name,
    NEW.email,
    COALESCE(user_phone, ''),
    CURRENT_DATE,
    'Pending',
    0,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after user insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a Member record when a user signs up via Supabase auth';

-- =====================================================
-- Test the trigger (optional - uncomment to test)
-- =====================================================
-- SELECT * FROM auth.users LIMIT 1;
-- SELECT * FROM public.member;

-- =====================================================
-- How it works:
-- =====================================================
-- 1. User signs up via frontend (Supabase auth.signUp)
-- 2. Supabase creates record in auth.users table
-- 3. Trigger fires automatically
-- 4. Function extracts data from auth.users
-- 5. Member record created with:
--    - auth_user_id: UUID from auth.users
--    - Name: from metadata or email
--    - Email: from auth.users.email
--    - Phone: from metadata (if provided)
--    - Status: 'Pending' (default)
--    - JoinDate: current date
-- 6. Member visible in admin dashboard immediately
-- =====================================================

-- =====================================================
-- Frontend Signup Data Mapping:
-- =====================================================
-- The frontend passes this data to Supabase:
-- options: {
--   data: {
--     full_name: formData.fullName,     -> mapped to Name
--     phone: `${code}${number}`,        -> mapped to Phone
--     address: { street, city, state }  -> available in raw_user_meta_data
--   }
-- }
-- =====================================================
