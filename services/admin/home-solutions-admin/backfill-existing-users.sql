-- =====================================================
-- Backfill: Create Members for Existing Auth Users
-- =====================================================
-- Run this ONCE to create Member records for users
-- who signed up before the trigger was created
-- =====================================================

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
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ) as name,
  u.email,
  COALESCE(u.raw_user_meta_data->>'phone', '') as phone,
  COALESCE(u.created_at::date, CURRENT_DATE) as join_date,
  'Active' as status,
  0 as tenure,
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.member m
  WHERE m.auth_user_id = u.id
)
AND u.email IS NOT NULL;

-- Show results
SELECT
  m."MemberID",
  m."Name",
  m."Email",
  m."Status",
  m.auth_user_id,
  'Backfilled from auth.users' as source
FROM public.member m
ORDER BY m.created_at DESC;
