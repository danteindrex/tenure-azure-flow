-- =====================================================
-- Add Address Fields to Member Table
-- =====================================================

BEGIN;

-- Add address columns
ALTER TABLE member ADD COLUMN IF NOT EXISTS street_address VARCHAR(255);
ALTER TABLE member ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE member ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE member ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

-- Add indexes for searching
CREATE INDEX IF NOT EXISTS idx_member_city ON member(city);
CREATE INDEX IF NOT EXISTS idx_member_state ON member(state);
CREATE INDEX IF NOT EXISTS idx_member_zip_code ON member(zip_code);

-- Add comments
COMMENT ON COLUMN member.street_address IS 'Member street address';
COMMENT ON COLUMN member.city IS 'Member city';
COMMENT ON COLUMN member.state IS 'Member state (US state code)';
COMMENT ON COLUMN member.zip_code IS 'Member ZIP/postal code';

COMMIT;

-- Verify columns were added
\d member
