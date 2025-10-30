-- Clear Better Auth tables to allow UUID migration
-- This is safe because Better Auth tables don't contain your main user data
-- Your 'users' table with actual user data will be preserved

BEGIN;

-- Clear data from Better Auth tables (in correct order to respect foreign keys)
DELETE FROM two_factor;
DELETE FROM account;
DELETE FROM session;
DELETE FROM verification;

-- Note: We're not deleting from 'users' table - that contains your actual user data

COMMIT;