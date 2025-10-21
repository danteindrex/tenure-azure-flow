-- COMPLETE DATABASE NORMALIZATION MIGRATION
-- This script normalizes the entire database schema and migrates all existing data
-- Execute in transaction for safety

BEGIN;

-- ============================================================================
-- PHASE 1: CREATE NORMALIZED SCHEMA
-- ============================================================================

-- 1. Core Identity & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    status enum_member_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Personal Information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100), 
    middle_name VARCHAR(100),
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Contact Information
CREATE TABLE user_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL, -- 'phone', 'email', 'emergency'
    contact_value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contact_type, contact_value)
);

-- 4. Address Information
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address_type VARCHAR(20) DEFAULT 'primary',
    street_address VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country_code CHAR(2) DEFAULT 'US',
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Membership Data
CREATE TABLE user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tenure NUMERIC DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'PENDING',
    assigned_admin_id INTEGER REFERENCES admin(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Queue Management (consolidated)
CREATE TABLE membership_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    queue_position INTEGER,
    joined_queue_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_eligible BOOLEAN DEFAULT TRUE,
    priority_score INTEGER DEFAULT 0,
    subscription_active BOOLEAN DEFAULT FALSE,
    total_months_subscribed INTEGER DEFAULT 0,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    lifetime_payment_total DECIMAL(10,2) DEFAULT 0.00,
    has_received_payout BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Payment Methods (enhanced)
CREATE TABLE user_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL DEFAULT 'stripe',
    method_type VARCHAR(20) NOT NULL,
    method_subtype VARCHAR(20),
    provider_payment_method_id TEXT,
    last_four VARCHAR(4),
    brand VARCHAR(20),
    expires_month INTEGER,
    expires_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider_payment_method_id)
);

-- 8. Subscriptions (updated)
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL DEFAULT 'stripe',
    provider_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    provider_customer_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Payments (enhanced)
CREATE TABLE user_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES user_payment_methods(id) ON DELETE SET NULL,
    provider VARCHAR(20) NOT NULL DEFAULT 'stripe',
    provider_payment_id VARCHAR(255),
    provider_invoice_id VARCHAR(255),
    provider_charge_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(20) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL,
    is_first_payment BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    receipt_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Billing Schedules
CREATE TABLE user_billing_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
    next_billing_date DATE,
    amount DECIMAL(10,2),
    currency CHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. User Agreements
CREATE TABLE user_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agreement_type VARCHAR(50) NOT NULL,
    version_number VARCHAR(20) NOT NULL,
    agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    document_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, agreement_type, version_number)
);

-- 12. Enhanced Audit Logging
CREATE TABLE system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_id INTEGER REFERENCES admin(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 2: CREATE INDEXES AND CONSTRAINTS
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_name ON user_profiles(first_name, last_name);

-- User contacts indexes
CREATE INDEX idx_user_contacts_user_id ON user_contacts(user_id);
CREATE INDEX idx_user_contacts_type ON user_contacts(contact_type);
CREATE INDEX idx_user_contacts_primary ON user_contacts(user_id, is_primary);

-- User addresses indexes
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_primary ON user_addresses(user_id, is_primary);

-- User memberships indexes
CREATE INDEX idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_join_date ON user_memberships(join_date);

-- Membership queue indexes
CREATE INDEX idx_membership_queue_user_id ON membership_queue(user_id);
CREATE INDEX idx_membership_queue_position ON membership_queue(queue_position);
CREATE INDEX idx_membership_queue_eligible ON membership_queue(is_eligible);

-- Payment methods indexes
CREATE INDEX idx_user_payment_methods_user_id ON user_payment_methods(user_id);
CREATE INDEX idx_user_payment_methods_default ON user_payment_methods(user_id, is_default);
CREATE INDEX idx_user_payment_methods_active ON user_payment_methods(user_id, is_active);

-- Subscriptions indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_provider_id ON user_subscriptions(provider_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Payments indexes
CREATE INDEX idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX idx_user_payments_subscription_id ON user_payments(subscription_id);
CREATE INDEX idx_user_payments_date ON user_payments(payment_date);
CREATE INDEX idx_user_payments_status ON user_payments(status);

-- Billing schedules indexes
CREATE INDEX idx_user_billing_schedules_user_id ON user_billing_schedules(user_id);
CREATE INDEX idx_user_billing_schedules_next_billing ON user_billing_schedules(next_billing_date);

-- Agreements indexes
CREATE INDEX idx_user_agreements_user_id ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_type ON user_agreements(agreement_type);

-- Audit logs indexes
CREATE INDEX idx_system_audit_logs_user_id ON system_audit_logs(user_id);
CREATE INDEX idx_system_audit_logs_entity ON system_audit_logs(entity_type, entity_id);
CREATE INDEX idx_system_audit_logs_created_at ON system_audit_logs(created_at);

-- ============================================================================
-- PHASE 3: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_contacts_updated_at 
    BEFORE UPDATE ON user_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at 
    BEFORE UPDATE ON user_addresses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memberships_updated_at 
    BEFORE UPDATE ON user_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_queue_updated_at 
    BEFORE UPDATE ON membership_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_payment_methods_updated_at 
    BEFORE UPDATE ON user_payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_payments_updated_at 
    BEFORE UPDATE ON user_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_billing_schedules_updated_at 
    BEFORE UPDATE ON user_billing_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;