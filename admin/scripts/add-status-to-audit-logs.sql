-- Add status column to audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'success';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
