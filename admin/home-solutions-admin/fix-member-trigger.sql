-- =====================================================
-- Fix: Update trigger to use correct column names
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function with correct column names
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

  -- Insert new member record (using lowercase column names)
  INSERT INTO public.member (
    auth_user_id,
    name,
    email,
    phone,
    join_date,
    status,
    tenure,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::VARCHAR,
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

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a Member record when a user signs up via Supabase auth';

-- Backfill existing users
INSERT INTO public.member (
  auth_user_id,
  name,
  email,
  phone,
  join_date,
  status,
  tenure,
  created_at,
  updated_at
)
SELECT
  u.id::VARCHAR,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  u.email,
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.created_at::date, CURRENT_DATE),
  'Active',
  0,
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.member m
  WHERE m.auth_user_id = u.id::VARCHAR
)
AND u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Show results
SELECT
  id as member_id,
  name,
  email,
  status,
  auth_user_id,
  join_date
FROM public.member
ORDER BY created_at DESC;
