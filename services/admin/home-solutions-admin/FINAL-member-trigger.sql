-- =====================================================
-- FINAL: Correct Member Trigger with Address Fields
-- =====================================================
-- This trigger creates a member record with lowercase column names
-- matching the actual database schema
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function with correct lowercase column names and address fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_phone TEXT;
  user_street TEXT;
  user_city TEXT;
  user_state TEXT;
  user_zip TEXT;
BEGIN
  -- Extract name from raw_user_meta_data
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract phone from raw_user_meta_data
  user_phone := NEW.raw_user_meta_data->>'phone';

  -- Extract address from raw_user_meta_data->address object
  user_street := NEW.raw_user_meta_data->'address'->>'street';
  user_city := NEW.raw_user_meta_data->'address'->>'city';
  user_state := NEW.raw_user_meta_data->'address'->>'state';
  user_zip := NEW.raw_user_meta_data->'address'->>'zip';

  -- Insert new member record (using lowercase column names to match actual schema)
  INSERT INTO public.member (
    auth_user_id,
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
    NEW.id,  -- Keep as UUID, don't cast to VARCHAR
    user_name,
    NEW.email,
    COALESCE(user_phone, ''),
    COALESCE(user_street, ''),
    COALESCE(user_city, ''),
    COALESCE(user_state, ''),
    COALESCE(user_zip, ''),
    CURRENT_DATE,
    'Pending',
    0,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a Member record with full address when a user signs up via Supabase auth. Uses lowercase column names.';

-- Test query to verify column names (run this after creating trigger)
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'member'
-- ORDER BY ordinal_position;
