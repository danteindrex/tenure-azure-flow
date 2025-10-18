-- =====================================================
-- DROP ALL USER-RELATED TRIGGERS
-- =====================================================
-- Run this ONLY if you want to remove all triggers
-- CAUTION: This will remove automatic member creation

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify they're gone
SELECT
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Show message
SELECT 'All triggers on auth.users have been dropped' AS status;
