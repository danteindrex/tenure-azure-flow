-- Clean up existing Better Auth tables that conflict with our schema
-- This removes the old Better Auth tables so we can recreate them properly

BEGIN;

-- Drop existing Better Auth tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS "organization_invitation" CASCADE;
DROP TABLE IF EXISTS "organization_member" CASCADE; 
DROP TABLE IF EXISTS "organization" CASCADE;
DROP TABLE IF EXISTS "two_factor" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "passkey" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE; -- This is the conflicting table (singular)

-- Note: We keep your existing "users" table (plural) which has your data

COMMIT;