-- ============================================
-- Setup 2FA Tables and Columns
-- ============================================

BEGIN;

-- Step 1: Add 2FA columns to admin table
ALTER TABLE admin ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Step 2: Create 2FA codes table (supports both 5 and 6 digit codes)
CREATE TABLE IF NOT EXISTS admin_2fa_codes (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,  -- Stores hashed code
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_2fa_codes_admin_id ON admin_2fa_codes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_codes_expires_at ON admin_2fa_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_codes_code ON admin_2fa_codes(code);

-- Step 4: Create cleanup function for expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_2fa_codes
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verify tables
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin' 
    AND column_name IN ('two_factor_enabled', 'two_factor_secret', 'backup_codes');

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'admin_2fa_codes'
ORDER BY ordinal_position;

SELECT '✅ 2FA tables created successfully!' as status;
