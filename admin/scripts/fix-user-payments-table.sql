-- Add missing columns to user_payments table
ALTER TABLE user_payments 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'completed';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);
