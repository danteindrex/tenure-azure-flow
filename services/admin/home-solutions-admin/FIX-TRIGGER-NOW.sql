-- =====================================================
-- FIX: Correct trigger with ACTUAL column names
-- =====================================================
-- Based on real database schema query

-- Drop existing broken trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function with CORRECT column names (all lowercase)
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
  -- Extract metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  user_phone := NEW.raw_user_meta_data->>'phone';
  user_street := NEW.raw_user_meta_data->'address'->>'street';
  user_city := NEW.raw_user_meta_data->'address'->>'city';
  user_state := NEW.raw_user_meta_data->'address'->>'state';
  user_zip := NEW.raw_user_meta_data->'address'->>'zip';

  -- Insert with EXACT column names from database
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
    NEW.id,
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
    RAISE NOTICE 'Trigger error: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Confirm success
SELECT 'Trigger fixed! Column names match database.' AS status;
