-- =====================================================
-- CHECK ALL TRIGGERS IN DATABASE
-- =====================================================
-- Run this in Supabase SQL Editor to see all triggers

-- 1. Check all triggers on auth.users table
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Check all functions related to triggers
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'auth')
AND p.proname LIKE '%user%'
ORDER BY function_name;

-- 3. Check if member table exists and its structure
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'member'
ORDER BY ordinal_position;

-- 4. Check RLS policies on member table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'member';

-- 5. Check if there are any constraints on member table that might fail
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
AND tc.table_name = 'member';

-- 6. Test if we can manually insert into member table
-- (Comment this out if you don't want to test)
-- INSERT INTO public.member (
--     auth_user_id,
--     name,
--     email,
--     phone,
--     join_date,
--     status,
--     tenure,
--     created_at,
--     updated_at
-- )
-- VALUES (
--     gen_random_uuid(),
--     'Test User',
--     'test@example.com',
--     '+1234567890',
--     CURRENT_DATE,
--     'Pending',
--     0,
--     NOW(),
--     NOW()
-- );
