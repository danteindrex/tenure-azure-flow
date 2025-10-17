-- =====================================================
-- Complete Database Migration
-- =====================================================
-- This script:
-- 1. Renames 'users' -> 'admin'
-- 2. Renames 'users_sessions' -> 'admin_sessions'
-- 3. Removes 'media' table
-- 4. Creates all required business tables
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: CLEANUP - Rename users to admin
-- =====================================================
DO $$
BEGIN
    -- Rename users table to admin if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE users RENAME TO admin;
        RAISE NOTICE 'Renamed users table to admin';
    END IF;

    -- Rename users_sessions to admin_sessions if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_sessions' AND table_schema = 'public') THEN
        ALTER TABLE users_sessions RENAME TO admin_sessions;
        RAISE NOTICE 'Renamed users_sessions to admin_sessions';
    END IF;
END $$;

-- Update sequences
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'users_id_seq' AND schemaname = 'public') THEN
        ALTER SEQUENCE users_id_seq RENAME TO admin_id_seq;
        RAISE NOTICE 'Renamed users_id_seq to admin_id_seq';
    END IF;
END $$;

-- Update indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_pkey' AND schemaname = 'public') THEN
        ALTER INDEX users_pkey RENAME TO admin_pkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_created_at_idx' AND schemaname = 'public') THEN
        ALTER INDEX users_created_at_idx RENAME TO admin_created_at_idx;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_idx' AND schemaname = 'public') THEN
        ALTER INDEX users_email_idx RENAME TO admin_email_idx;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users__status_idx' AND schemaname = 'public') THEN
        ALTER INDEX users__status_idx RENAME TO admin__status_idx;
    END IF;
END $$;

-- =====================================================
-- STEP 2: CLEANUP - Drop media table
-- =====================================================
DROP TABLE IF EXISTS media CASCADE;

-- =====================================================
-- STEP 3: CREATE BUSINESS TABLES
-- =====================================================

-- =====================================================
-- TABLE 1: Member
-- =====================================================
CREATE TABLE IF NOT EXISTS Member (
    MemberID BIGSERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Phone VARCHAR(20),
    JoinDate DATE NOT NULL DEFAULT CURRENT_DATE,
    Status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Active', 'Inactive', 'Suspended', 'Pending')),
    Tenure INTEGER DEFAULT 0,
    AdminID BIGINT REFERENCES admin(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_auth_user_id ON Member(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_member_email ON Member(Email);
CREATE INDEX IF NOT EXISTS idx_member_status ON Member(Status);
CREATE INDEX IF NOT EXISTS idx_member_admin_id ON Member(AdminID);

COMMENT ON TABLE Member IS 'Program members (frontend users with Supabase auth)';
COMMENT ON COLUMN Member.auth_user_id IS 'Links to Supabase auth.users(id)';
COMMENT ON COLUMN Member.AdminID IS 'Assigned administrator from admin table';
COMMENT ON COLUMN Member.Tenure IS 'Current tenure duration in months';

-- =====================================================
-- TABLE 2: Tenure
-- =====================================================
CREATE TABLE IF NOT EXISTS Tenure (
    TenureID BIGSERIAL PRIMARY KEY,
    MemberID BIGINT NOT NULL REFERENCES Member(MemberID) ON DELETE CASCADE,
    StartTenure DATE NOT NULL,
    EndTenure DATE,
    Status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active', 'Completed', 'Cancelled', 'On Hold')),
    ScriptNo VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenure_member_id ON Tenure(MemberID);
CREATE INDEX IF NOT EXISTS idx_tenure_status ON Tenure(Status);
CREATE INDEX IF NOT EXISTS idx_tenure_start_date ON Tenure(StartTenure);

COMMENT ON TABLE Tenure IS 'Tenure period records for each member';
COMMENT ON COLUMN Tenure.ScriptNo IS 'Customer/internal script reference';

-- =====================================================
-- TABLE 3: Payment
-- =====================================================
CREATE TABLE IF NOT EXISTS Payment (
    PaymentID BIGSERIAL PRIMARY KEY,
    MemberID BIGINT NOT NULL REFERENCES Member(MemberID) ON DELETE CASCADE,
    Amount NUMERIC(10, 2) NOT NULL CHECK (Amount > 0),
    PaymentType VARCHAR(50) NOT NULL CHECK (PaymentType IN ('Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Mobile Money', 'Other')),
    PaymentDate DATE NOT NULL DEFAULT CURRENT_DATE,
    Status VARCHAR(20) DEFAULT 'Completed' CHECK (Status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    TransactionReference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_member_id ON Payment(MemberID);
CREATE INDEX IF NOT EXISTS idx_payment_date ON Payment(PaymentDate);
CREATE INDEX IF NOT EXISTS idx_payment_status ON Payment(Status);

COMMENT ON TABLE Payment IS 'Payment transactions from members';

-- =====================================================
-- TABLE 4: Payout
-- =====================================================
CREATE TABLE IF NOT EXISTS Payout (
    PayoutID BIGSERIAL PRIMARY KEY,
    PaymentID BIGINT NOT NULL REFERENCES Payment(PaymentID) ON DELETE CASCADE,
    MemberID BIGINT NOT NULL REFERENCES Member(MemberID) ON DELETE CASCADE,
    Amount NUMERIC(10, 2) NOT NULL CHECK (Amount > 0),
    DateIssued DATE NOT NULL DEFAULT CURRENT_DATE,
    TriggerConditionMet BOOLEAN NOT NULL DEFAULT FALSE,
    Status VARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Issued', 'Claimed', 'Expired')),
    PayoutMethod VARCHAR(50) CHECK (PayoutMethod IN ('Bank Transfer', 'Mobile Money', 'Check', 'Cash', 'Store Credit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_payment_id ON Payout(PaymentID);
CREATE INDEX IF NOT EXISTS idx_payout_member_id ON Payout(MemberID);
CREATE INDEX IF NOT EXISTS idx_payout_date_issued ON Payout(DateIssued);
CREATE INDEX IF NOT EXISTS idx_payout_status ON Payout(Status);

COMMENT ON TABLE Payout IS 'Reward payouts triggered by payments';
COMMENT ON COLUMN Payout.TriggerConditionMet IS 'Whether payout condition was satisfied';

-- =====================================================
-- TABLE 5: NewsFeedPost
-- =====================================================
CREATE TABLE IF NOT EXISTS NewsFeedPost (
    PostID BIGSERIAL PRIMARY KEY,
    AdminID BIGINT NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
    Title VARCHAR(255) NOT NULL,
    Content TEXT NOT NULL,
    PublishDate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    Status VARCHAR(20) DEFAULT 'Published' CHECK (Status IN ('Draft', 'Published', 'Archived')),
    Priority VARCHAR(20) DEFAULT 'Normal' CHECK (Priority IN ('Low', 'Normal', 'High', 'Urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsfeedpost_admin_id ON NewsFeedPost(AdminID);
CREATE INDEX IF NOT EXISTS idx_newsfeedpost_publish_date ON NewsFeedPost(PublishDate);
CREATE INDEX IF NOT EXISTS idx_newsfeedpost_status ON NewsFeedPost(Status);

COMMENT ON TABLE NewsFeedPost IS 'News/announcements created by admins';
COMMENT ON COLUMN NewsFeedPost.AdminID IS 'Admin who created the post';

-- =====================================================
-- TABLE 6: AuditLog
-- =====================================================
CREATE TABLE IF NOT EXISTS AuditLog (
    AuditID BIGSERIAL PRIMARY KEY,
    AdminID BIGINT REFERENCES admin(id) ON DELETE SET NULL,
    EntityChanged VARCHAR(50) NOT NULL,
    EntityID BIGINT,
    ChangeType VARCHAR(20) NOT NULL CHECK (ChangeType IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
    Timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ChangeDetails TEXT,
    IPAddress VARCHAR(45),
    UserAgent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditlog_admin_id ON AuditLog(AdminID);
CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON AuditLog(Timestamp);
CREATE INDEX IF NOT EXISTS idx_auditlog_entity_changed ON AuditLog(EntityChanged);
CREATE INDEX IF NOT EXISTS idx_auditlog_change_type ON AuditLog(ChangeType);

COMMENT ON TABLE AuditLog IS 'Audit trail for all system changes';
COMMENT ON COLUMN AuditLog.AdminID IS 'Admin who made the change';

-- =====================================================
-- STEP 4: CREATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_member_updated_at ON Member;
CREATE TRIGGER update_member_updated_at BEFORE UPDATE ON Member
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenure_updated_at ON Tenure;
CREATE TRIGGER update_tenure_updated_at BEFORE UPDATE ON Tenure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_updated_at ON Payment;
CREATE TRIGGER update_payment_updated_at BEFORE UPDATE ON Payment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_updated_at ON Payout;
CREATE TRIGGER update_payout_updated_at BEFORE UPDATE ON Payout
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_newsfeedpost_updated_at ON NewsFeedPost;
CREATE TRIGGER update_newsfeedpost_updated_at BEFORE UPDATE ON NewsFeedPost
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
SELECT 'Migration completed successfully!' as status,
       'Tables created: Member, Tenure, Payment, Payout, NewsFeedPost, AuditLog' as tables_created,
       'Renamed: users -> admin, users_sessions -> admin_sessions' as renamed,
       'Removed: media table' as removed;

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- NEXT STEPS
-- =====================================================
-- 1. Update src/collections/Users.ts -> Admin.ts (change slug to 'admin')
-- 2. Remove src/collections/Media.ts
-- 3. Create Payload collections for Member, Tenure, Payment, Payout, NewsFeedPost, AuditLog
-- 4. Update src/payload.config.ts to use new collections
-- =====================================================
