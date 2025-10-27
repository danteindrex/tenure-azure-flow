-- Performance Optimization Indexes
-- Add indexes to frequently queried fields to improve dashboard performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- User payments table indexes
CREATE INDEX IF NOT EXISTS idx_user_payments_created_at ON user_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);
CREATE INDEX IF NOT EXISTS idx_user_payments_amount ON user_payments(amount);

-- Membership queue table indexes
CREATE INDEX IF NOT EXISTS idx_membership_queue_created_at ON membership_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_queue_queue_position ON membership_queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_membership_queue_user_id ON membership_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_queue_is_eligible ON membership_queue(is_eligible);

-- KYC verification table indexes
CREATE INDEX IF NOT EXISTS idx_kyc_verification_created_at ON kyc_verification(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_user_id ON kyc_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_status ON kyc_verification(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_verified_at ON kyc_verification(verified_at DESC);

-- User audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_payments_user_status ON user_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_payments_created_status ON user_payments(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_membership_queue_user_eligible ON membership_queue(user_id, is_eligible);

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE user_payments;
ANALYZE membership_queue;
ANALYZE kyc_verification;
ANALYZE user_audit_logs;
