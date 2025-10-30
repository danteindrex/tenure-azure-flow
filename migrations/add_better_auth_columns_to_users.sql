-- Add Better Auth required columns to existing users table
-- This allows Better Auth to work with your existing users table structure

BEGIN;

-- Add missing columns that Better Auth expects
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- Update the id column to be TEXT (Better Auth expects TEXT, not UUID)
-- We'll keep the UUID but cast it as needed
-- No need to change the column type, just ensure Better Auth can work with it

-- Ensure email_verified column exists (it should from your migration)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create indexes for Better Auth performance
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled);

COMMIT;