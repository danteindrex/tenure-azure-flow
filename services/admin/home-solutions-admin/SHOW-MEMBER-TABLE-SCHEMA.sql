-- =====================================================
-- SHOW ACTUAL MEMBER TABLE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor to see the REAL column names

-- 1. Show all columns in member table with their exact names and types
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'member'
ORDER BY ordinal_position;

-- 2. Show a sample row if any exist
SELECT * FROM public.member LIMIT 1;

-- 3. Show the table structure with \d command equivalent
SELECT
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
    a.attnotnull as not_null,
    a.attnum as position
FROM pg_catalog.pg_attribute a
WHERE a.attrelid = 'public.member'::regclass
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY a.attnum;

-- 4. Check if table even exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'member'
) as member_table_exists;
