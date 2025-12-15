-- Add member_eligibility_status_id column to user_memberships table if it doesn't exist
ALTER TABLE user_memberships 
ADD COLUMN IF NOT EXISTS member_eligibility_status_id INTEGER 
REFERENCES member_eligibility_statuses(id) DEFAULT 1;

-- Update existing records to have a default status (Inactive = 1)
UPDATE user_memberships 
SET member_eligibility_status_id = 1 
WHERE member_eligibility_status_id IS NULL;