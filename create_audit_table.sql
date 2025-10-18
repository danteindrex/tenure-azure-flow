-- Create user_audit_logs table
CREATE TABLE IF NOT EXISTS user_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    action VARCHAR(100) NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_success ON user_audit_logs(success);

-- Enable RLS
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own audit logs" ON user_audit_logs 
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Service can insert audit logs" ON user_audit_logs 
    FOR INSERT WITH CHECK (true);

-- Add comment
COMMENT ON TABLE user_audit_logs IS 'Tracks user actions and system events for auditing purposes';