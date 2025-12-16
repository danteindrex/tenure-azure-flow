-- First, let's check if admin table exists and create admin_sessions without foreign key constraint
-- We'll add the constraint after verifying the admin table structure

-- Drop table if it exists (to start fresh)
DROP TABLE IF EXISTS admin_sessions CASCADE;

-- Create admin_sessions table for tracking admin login sessions
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_admin_sessions_is_active ON admin_sessions(is_active);

-- Try to add foreign key constraint if admin table exists
-- This will fail silently if the admin table doesn't exist or has different structure
DO $$
BEGIN
  -- Check if admin table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin') THEN
    -- Try to add foreign key constraint
    BEGIN
      ALTER TABLE admin_sessions 
        ADD CONSTRAINT fk_admin_sessions_admin 
        FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint. Admin table may have different structure.';
    END;
  END IF;
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_sessions_updated_at
  BEFORE UPDATE ON admin_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_sessions_updated_at();

-- Add RLS policies
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON admin_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: System can insert sessions
CREATE POLICY "System can insert sessions"
  ON admin_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: System can update sessions
CREATE POLICY "System can update sessions"
  ON admin_sessions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: System can delete sessions
CREATE POLICY "System can delete sessions"
  ON admin_sessions
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON admin_sessions TO authenticated;
GRANT ALL ON admin_sessions TO service_role;
