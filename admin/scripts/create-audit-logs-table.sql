-- Create user_audit_logs table for tracking all user and admin actions
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_entity_type ON user_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_success ON user_audit_logs(success);

-- Enable Row Level Security
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to access all logs (drop if exists first)
DROP POLICY IF EXISTS "Service role can access all audit logs" ON user_audit_logs;
CREATE POLICY "Service role can access all audit logs" ON user_audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_audit_logs TO service_role;
GRANT SELECT ON user_audit_logs TO authenticated;

COMMENT ON TABLE user_audit_logs IS 'Audit log for tracking all user and admin actions in the system';
