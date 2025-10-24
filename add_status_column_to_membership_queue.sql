-- Add status column to membership_queue table
-- This aligns the database with the Payload collection definition

-- Add status column with default value
ALTER TABLE membership_queue 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'waiting';

-- Set all existing records to 'waiting' status by default
UPDATE membership_queue 
SET status = 'waiting'
WHERE status IS NULL;

-- Add constraint to ensure valid status values
ALTER TABLE membership_queue 
ADD CONSTRAINT membership_queue_status_check 
CHECK (status IN ('waiting', 'eligible', 'processing', 'completed', 'suspended'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_membership_queue_status ON membership_queue(status);

-- Also add status column to kyc_verification table if it doesn't exist
ALTER TABLE kyc_verification 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Update existing KYC records
UPDATE kyc_verification 
SET status = CASE 
    WHEN verified_at IS NOT NULL THEN 'approved'
    ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';

-- Add constraint for KYC status
ALTER TABLE kyc_verification 
ADD CONSTRAINT kyc_verification_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'under_review'));

-- Create index for KYC status
CREATE INDEX IF NOT EXISTS idx_kyc_verification_status ON kyc_verification(status);

-- Verify the changes
SELECT 'membership_queue status column added' as result;
SELECT 'kyc_verification status column added' as result;