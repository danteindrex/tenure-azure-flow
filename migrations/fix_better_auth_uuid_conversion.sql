-- Fix Better Auth UUID conversion issues
-- This clears conflicting data and allows proper UUID migration

BEGIN;

-- Step 1: Clear all Better Auth data (safe - doesn't affect your main user data)
TRUNCATE TABLE two_factor CASCADE;
TRUNCATE TABLE account CASCADE; 
TRUNCATE TABLE session CASCADE;
TRUNCATE TABLE verification CASCADE;

-- Step 2: Drop and recreate the problematic columns with correct UUID type
-- This avoids the automatic conversion issue

-- Fix session table
ALTER TABLE session DROP COLUMN IF EXISTS user_id;
ALTER TABLE session ADD COLUMN user_id UUID;

-- Fix account table  
ALTER TABLE account DROP COLUMN IF EXISTS user_id;
ALTER TABLE account ADD COLUMN user_id UUID;

-- Fix two_factor table
ALTER TABLE two_factor DROP COLUMN IF EXISTS user_id;
ALTER TABLE two_factor ADD COLUMN user_id UUID;

-- Step 3: Add the foreign key constraints
ALTER TABLE session 
ADD CONSTRAINT session_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE account 
ADD CONSTRAINT account_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE two_factor 
ADD CONSTRAINT two_factor_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;

-- Success message
SELECT 'Better Auth UUID migration completed successfully!' as status;