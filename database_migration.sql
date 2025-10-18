-- Database Migration for 5-Screen Member Onboarding Workflow
-- This script updates the existing schema to support the new workflow

-- 1. Keep existing member status enum (Active, Pending, Inactive, Suspended)
-- No changes needed to status enum

-- 2. Add missing columns to member table for enhanced profile support
ALTER TABLE member 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS address_line_2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS administrative_area VARCHAR(100), -- State/Province
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country_code CHAR(2) DEFAULT 'US',
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING';

-- 3. Create member_agreements table for T&C tracking
CREATE TABLE IF NOT EXISTS member_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id BIGINT REFERENCES member(id) ON DELETE CASCADE,
    agreement_type VARCHAR(50) NOT NULL, -- 'TERMS_CONDITIONS', 'PAYMENT_AUTHORIZATION'
    version_number VARCHAR(20) NOT NULL,
    agreed_at_ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id BIGINT REFERENCES member(id) ON DELETE CASCADE,
    method_type VARCHAR(20) NOT NULL, -- 'CREDIT_CARD', 'MOBILE_MONEY', 'BANK_TRANSFER'
    source_token TEXT, -- Encrypted payment source token
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create id_verification_logs table (SKIPPED FOR NOW)
-- Will be implemented later when ID verification is needed

-- 6. Create financial_schedules table
CREATE TABLE IF NOT EXISTS financial_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id BIGINT REFERENCES member(id) ON DELETE CASCADE,
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY', -- 'MONTHLY', 'QUARTERLY', 'YEARLY'
    next_billing_date DATE,
    amount DECIMAL(10,2),
    currency CHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create queue_entries table (rename from queue for clarity)
CREATE TABLE IF NOT EXISTS queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id BIGINT REFERENCES member(id) ON DELETE CASCADE,
    queue_position INTEGER,
    joined_queue_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_eligible BOOLEAN DEFAULT TRUE,
    priority_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_agreements_member_id ON member_agreements(member_id);
CREATE INDEX IF NOT EXISTS idx_member_agreements_type ON member_agreements(agreement_type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_member_id ON payment_methods(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(member_id, is_active);
CREATE INDEX IF NOT EXISTS idx_id_verification_logs_member_id ON id_verification_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_financial_schedules_member_id ON financial_schedules(member_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_member_id ON queue_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_position ON queue_entries(queue_position);

-- 9. Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_schedules_updated_at 
    BEFORE UPDATE ON financial_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_entries_updated_at 
    BEFORE UPDATE ON queue_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Enable RLS on new tables
ALTER TABLE member_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies
-- Member agreements policies
CREATE POLICY "Users can view their own agreements" ON member_agreements 
    FOR SELECT USING (member_id IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own agreements" ON member_agreements 
    FOR INSERT WITH CHECK (member_id IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods" ON payment_methods 
    FOR SELECT USING (member_id IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own payment methods" ON payment_methods 
    FOR INSERT WITH CHECK (member_id IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own payment methods" ON payment_methods 
    FOR UPDATE USING (member_id IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

-- ID verification logs policies (SKIPPED FOR NOW)

-- Financial schedules policies
CREATE POLICY "Users can view their own financial schedules" ON financial_schedules 
    FOR SELECT USING (member_id IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

-- Queue entries policies
CREATE POLICY "Users can view their own queue entries" ON queue_entries 
    FOR SELECT USING (member_id IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

-- 12. Insert default agreement versions
INSERT INTO member_agreements (member_id, agreement_type, version_number, agreed_at_ts) 
VALUES 
    (0, 'TERMS_CONDITIONS', '1.0', NOW()),
    (0, 'PAYMENT_AUTHORIZATION', '1.0', NOW())
ON CONFLICT DO NOTHING;

COMMENT ON TABLE member_agreements IS 'Tracks user agreements to terms and conditions';
COMMENT ON TABLE payment_methods IS 'Stores user payment method preferences and tokens';
COMMENT ON TABLE id_verification_logs IS 'Logs identity verification attempts and results';
COMMENT ON TABLE financial_schedules IS 'Manages billing cycles and payment schedules';
COMMENT ON TABLE queue_entries IS 'Manages membership queue positions and eligibility';
-
- Additional tables needed for subscription service

-- 13. Create subscription table
CREATE TABLE IF NOT EXISTS subscription (
    subscriptionid SERIAL PRIMARY KEY,
    memberid BIGINT REFERENCES member(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'unpaid')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Create payment table
CREATE TABLE IF NOT EXISTS payment (
    paymentid SERIAL PRIMARY KEY,
    memberid BIGINT REFERENCES member(id) ON DELETE CASCADE,
    subscriptionid INTEGER REFERENCES subscription(subscriptionid) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('initial', 'recurring', 'one_time')),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded', 'canceled')),
    is_first_payment BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Create queue table (enhanced version)
CREATE TABLE IF NOT EXISTS queue (
    queueid SERIAL PRIMARY KEY,
    memberid BIGINT REFERENCES member(id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_eligible BOOLEAN DEFAULT TRUE,
    subscription_active BOOLEAN DEFAULT FALSE,
    total_months_subscribed INTEGER DEFAULT 0,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    lifetime_payment_total DECIMAL(10,2) DEFAULT 0.00,
    has_received_payout BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Create indexes for subscription service tables
CREATE INDEX IF NOT EXISTS idx_subscription_memberid ON subscription(memberid);
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_id ON subscription(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_payment_memberid ON payment(memberid);
CREATE INDEX IF NOT EXISTS idx_payment_subscriptionid ON payment(subscriptionid);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_date ON payment(payment_date);
CREATE INDEX IF NOT EXISTS idx_queue_memberid ON queue(memberid);
CREATE INDEX IF NOT EXISTS idx_queue_position ON queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_queue_eligible ON queue(is_eligible);

-- 17. Add updated_at triggers for subscription service tables
CREATE TRIGGER update_subscription_updated_at 
    BEFORE UPDATE ON subscription 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_updated_at 
    BEFORE UPDATE ON payment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_updated_at 
    BEFORE UPDATE ON queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. Enable RLS on subscription service tables
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;

-- 19. Create RLS policies for subscription service tables
-- Subscription policies
CREATE POLICY "Users can view their own subscriptions" ON subscription 
    FOR SELECT USING (memberid IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage subscriptions" ON subscription 
    FOR ALL USING (true);

-- Payment policies  
CREATE POLICY "Users can view their own payments" ON payment 
    FOR SELECT USING (memberid IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage payments" ON payment 
    FOR ALL USING (true);

-- Queue policies
CREATE POLICY "Users can view their own queue entries" ON queue 
    FOR SELECT USING (memberid IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage queue" ON queue 
    FOR ALL USING (true);

-- 20. Add comments for subscription service tables
COMMENT ON TABLE subscription IS 'Stores Stripe subscription information for members';
COMMENT ON TABLE payment IS 'Tracks all payment transactions and their status';
COMMENT ON TABLE queue IS 'Enhanced queue management with subscription tracking';