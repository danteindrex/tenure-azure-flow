-- Add status column to admin table
ALTER TABLE admin 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_status ON admin(status);
