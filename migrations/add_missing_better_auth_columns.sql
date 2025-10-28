-- Add missing Better Auth columns to users table
-- These columns are required by Better Auth but missing from your current users table

BEGIN;

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- Ensure email_verified column exists (it should from previous migrations)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create indexes for Better Auth performance
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled);

COMMIT;

-- Success message
SELECT 'Better Auth columns added to users table successfully!' as status;