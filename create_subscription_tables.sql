-- Create missing subscription service tables

-- Create subscription table
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

-- Create payment table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_memberid ON subscription(memberid);
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_id ON subscription(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_payment_memberid ON payment(memberid);
CREATE INDEX IF NOT EXISTS idx_payment_subscriptionid ON payment(subscriptionid);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_date ON payment(payment_date);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_updated_at 
    BEFORE UPDATE ON subscription 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_updated_at 
    BEFORE UPDATE ON payment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscriptions" ON subscription 
    FOR SELECT USING (memberid IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage subscriptions" ON subscription 
    FOR ALL USING (true);

CREATE POLICY "Users can view their own payments" ON payment 
    FOR SELECT USING (memberid IN (SELECT id FROM member WHERE auth_user_id = auth.uid()::text));

CREATE POLICY "Service can manage payments" ON payment 
    FOR ALL USING (true);

-- Add comments
COMMENT ON TABLE subscription IS 'Stores Stripe subscription information for members';
COMMENT ON TABLE payment IS 'Tracks all payment transactions and their status';