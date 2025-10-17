-- =====================================================
-- Stripe Subscription & Payout System Migration
-- =====================================================
-- Business Rules:
-- - First month: $325, then $25/month (Stripe)
-- - Winners awarded when company hits 12 months + $100k revenue
-- - Each winner gets $100,000 (from first signup)
-- - $300 deducted for next year renewal
-- =====================================================

BEGIN;

-- =====================================================
-- TABLE 1: Subscription (Stripe Integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS Subscription (
    SubscriptionID BIGSERIAL PRIMARY KEY,
    MemberID BIGINT NOT NULL REFERENCES member(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(100) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'unpaid')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_member_id ON Subscription(MemberID);
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_id ON Subscription(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON Subscription(status);

COMMENT ON TABLE Subscription IS 'Stripe subscription tracking ($325 first month, $25/month after)';
COMMENT ON COLUMN Subscription.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN Subscription.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';

-- =====================================================
-- TABLE 2: Payment (Transaction Records)
-- =====================================================
CREATE TABLE IF NOT EXISTS Payment (
    PaymentID BIGSERIAL PRIMARY KEY,
    MemberID BIGINT NOT NULL REFERENCES member(id) ON DELETE CASCADE,
    SubscriptionID BIGINT REFERENCES Subscription(SubscriptionID) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(100) UNIQUE,
    stripe_invoice_id VARCHAR(100),
    stripe_charge_id VARCHAR(100),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('initial', 'recurring', 'one_time')),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded', 'canceled')),
    is_first_payment BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_member_id ON Payment(MemberID);
CREATE INDEX IF NOT EXISTS idx_payment_subscription_id ON Payment(SubscriptionID);
CREATE INDEX IF NOT EXISTS idx_payment_date ON Payment(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_status ON Payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_stripe_intent ON Payment(stripe_payment_intent_id);

COMMENT ON TABLE Payment IS 'Individual payment transactions from Stripe';
COMMENT ON COLUMN Payment.is_first_payment IS 'TRUE for $325 initial payment';
COMMENT ON COLUMN Payment.payment_type IS 'initial=$325, recurring=$25/month';

-- =====================================================
-- TABLE 3: Company (Business Metrics)
-- =====================================================
CREATE TABLE IF NOT EXISTS Company (
    CompanyID BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'Home Solutions',
    production_date DATE NOT NULL,
    current_revenue NUMERIC(12, 2) DEFAULT 0 CHECK (current_revenue >= 0),
    revenue_threshold NUMERIC(12, 2) DEFAULT 100000.00,
    payout_enabled BOOLEAN DEFAULT FALSE,
    last_payout_round INTEGER DEFAULT 0,
    total_payouts_issued NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_production_date ON Company(production_date);

COMMENT ON TABLE Company IS 'Company production date and revenue tracking for payout eligibility';
COMMENT ON COLUMN Company.production_date IS 'When company went live (determines 12-month mark)';
COMMENT ON COLUMN Company.last_payout_round IS 'Last payout round number (1=first year, 2=second year, etc.)';

-- Insert default company record if not exists
INSERT INTO Company (company_name, production_date, current_revenue)
VALUES ('Home Solutions', CURRENT_DATE, 0)
ON CONFLICT DO NOTHING;

-- =====================================================
-- TABLE 4: Payout (Winner Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS Payout (
    PayoutID BIGSERIAL PRIMARY KEY,
    MemberID BIGINT NOT NULL REFERENCES member(id) ON DELETE CASCADE,
    CompanyID BIGINT NOT NULL REFERENCES Company(CompanyID) ON DELETE CASCADE,
    payout_round INTEGER NOT NULL CHECK (payout_round > 0),
    queue_position INTEGER NOT NULL CHECK (queue_position > 0),
    base_amount NUMERIC(10, 2) NOT NULL DEFAULT 100000.00 CHECK (base_amount > 0),
    renewal_deduction NUMERIC(10, 2) DEFAULT 300.00 CHECK (renewal_deduction >= 0),
    net_amount NUMERIC(10, 2) GENERATED ALWAYS AS (base_amount - COALESCE(renewal_deduction, 0)) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'canceled')),
    awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    approved_by_admin_id INTEGER REFERENCES admin(id) ON DELETE SET NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('bank_transfer', 'check', 'wire', 'cash', 'other')),
    payment_date DATE,
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(MemberID, payout_round)
);

CREATE INDEX IF NOT EXISTS idx_payout_member_id ON Payout(MemberID);
CREATE INDEX IF NOT EXISTS idx_payout_company_id ON Payout(CompanyID);
CREATE INDEX IF NOT EXISTS idx_payout_round ON Payout(payout_round);
CREATE INDEX IF NOT EXISTS idx_payout_status ON Payout(status);
CREATE INDEX IF NOT EXISTS idx_payout_queue_position ON Payout(queue_position);

COMMENT ON TABLE Payout IS 'Winner payouts ($100k per winner, $300 deduction for renewal)';
COMMENT ON COLUMN Payout.payout_round IS 'Payout round (1=first year, 2=second year, etc.)';
COMMENT ON COLUMN Payout.queue_position IS 'Member position in queue (1=first signup)';
COMMENT ON COLUMN Payout.base_amount IS 'Base payout amount ($100,000)';
COMMENT ON COLUMN Payout.renewal_deduction IS 'Deduction for next year ($300)';
COMMENT ON COLUMN Payout.net_amount IS 'Net payout: $100,000 - $300 = $99,700';

-- =====================================================
-- TABLE 5: Queue (Member Signup Order)
-- =====================================================
CREATE TABLE IF NOT EXISTS Queue (
    QueueID BIGSERIAL PRIMARY KEY,
    MemberID BIGINT NOT NULL UNIQUE REFERENCES member(id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL UNIQUE CHECK (queue_position > 0),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_eligible BOOLEAN DEFAULT TRUE,
    subscription_active BOOLEAN DEFAULT FALSE,
    total_months_subscribed INTEGER DEFAULT 0 CHECK (total_months_subscribed >= 0),
    last_payment_date TIMESTAMP WITH TIME ZONE,
    lifetime_payment_total NUMERIC(10, 2) DEFAULT 0 CHECK (lifetime_payment_total >= 0),
    has_received_payout BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_position ON Queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_queue_member_id ON Queue(MemberID);
CREATE INDEX IF NOT EXISTS idx_queue_eligible ON Queue(is_eligible);
CREATE INDEX IF NOT EXISTS idx_queue_subscription_active ON Queue(subscription_active);

COMMENT ON TABLE Queue IS 'Member signup order for winner determination';
COMMENT ON COLUMN Queue.queue_position IS 'Position in queue (1=first member, 2=second, etc.)';
COMMENT ON COLUMN Queue.is_eligible IS 'Eligible for payout (active subscription + requirements met)';
COMMENT ON COLUMN Queue.subscription_active IS 'Current subscription status';
COMMENT ON COLUMN Queue.total_months_subscribed IS 'Total months member has been subscribed';

-- Backfill existing members into Queue
INSERT INTO Queue (MemberID, queue_position, joined_at, is_eligible, subscription_active)
SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY join_date, created_at) as queue_position,
    created_at,
    true,
    false
FROM member
ON CONFLICT (MemberID) DO NOTHING;

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Update Subscription updated_at
DROP TRIGGER IF EXISTS update_subscription_updated_at ON Subscription;
CREATE TRIGGER update_subscription_updated_at
    BEFORE UPDATE ON Subscription
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update Payment updated_at
DROP TRIGGER IF EXISTS update_payment_updated_at ON Payment;
CREATE TRIGGER update_payment_updated_at
    BEFORE UPDATE ON Payment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update Company updated_at
DROP TRIGGER IF EXISTS update_company_updated_at ON Company;
CREATE TRIGGER update_company_updated_at
    BEFORE UPDATE ON Company
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update Payout updated_at
DROP TRIGGER IF EXISTS update_payout_updated_at ON Payout;
CREATE TRIGGER update_payout_updated_at
    BEFORE UPDATE ON Payout
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update Queue updated_at
DROP TRIGGER IF EXISTS update_queue_updated_at ON Queue;
CREATE TRIGGER update_queue_updated_at
    BEFORE UPDATE ON Queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate next payout winners
CREATE OR REPLACE FUNCTION get_next_payout_winners(p_company_id BIGINT, p_max_winners INTEGER DEFAULT 1)
RETURNS TABLE (
    member_id BIGINT,
    member_name VARCHAR,
    queue_position INTEGER,
    months_subscribed INTEGER,
    lifetime_total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.MemberID,
        m.name,
        q.queue_position,
        q.total_months_subscribed,
        q.lifetime_payment_total
    FROM Queue q
    JOIN member m ON q.MemberID = m.id
    WHERE q.is_eligible = TRUE
      AND q.subscription_active = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM Payout p
          WHERE p.MemberID = q.MemberID
            AND p.CompanyID = p_company_id
            AND p.status != 'canceled'
      )
    ORDER BY q.queue_position
    LIMIT p_max_winners;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_payout_winners IS 'Returns eligible members for next payout based on queue position';

-- Function to check if payouts can be issued
CREATE OR REPLACE FUNCTION can_issue_payouts(p_company_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_eligible BOOLEAN;
BEGIN
    SELECT is_eligible_for_payout INTO v_eligible
    FROM Company
    WHERE CompanyID = p_company_id;

    RETURN COALESCE(v_eligible, FALSE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_issue_payouts IS 'Check if company meets criteria for issuing payouts (12 months + $100k revenue)';

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
SELECT 'Migration completed successfully!' as status,
       'New tables: Subscription, Payment, Company, Payout, Queue' as tables_created;

-- Show current state
SELECT 'Company eligibility status:' as info;
SELECT
    company_name,
    production_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, production_date)) * 12 +
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, production_date)) as months_since_production,
    current_revenue,
    revenue_threshold,
    (EXTRACT(YEAR FROM AGE(CURRENT_DATE, production_date)) * 12 +
     EXTRACT(MONTH FROM AGE(CURRENT_DATE, production_date))) >= 12
    AND current_revenue >= revenue_threshold as is_eligible_for_payout
FROM Company;

SELECT 'Current queue:' as info;
SELECT
    q.queue_position,
    m.name as member_name,
    m.email,
    q.joined_at,
    q.is_eligible,
    q.subscription_active
FROM Queue q
JOIN member m ON q.MemberID = m.id
ORDER BY q.queue_position;
