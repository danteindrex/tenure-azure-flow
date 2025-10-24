-- Create missing tables for admin dashboard collections (Fixed version)

-- 1. Admin Alerts
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('system', 'security', 'payment', 'queue', 'compliance')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved')),
  related_entity JSONB,
  trigger_info JSONB,
  assigned_to INTEGER, -- References admin(id) but no FK constraint due to type mismatch
  acknowledged_by INTEGER, -- References admin(id) but no FK constraint
  acknowledged_at TIMESTAMPTZ,
  resolved_by INTEGER, -- References admin(id) but no FK constraint
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  notifications_sent JSONB DEFAULT '[]'::jsonb,
  escalation JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disputes (Chargebacks)
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id TEXT UNIQUE NOT NULL,
  payment_id UUID, -- References user_payments(id) but may not exist
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('chargeback', 'refund_request', 'fraud_claim', 'duplicate_charge')),
  status TEXT NOT NULL DEFAULT 'needs_response' CHECK (status IN ('needs_response', 'evidence_submitted', 'under_review', 'won', 'lost', 'warning_closed')),
  reason TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_dispute_id TEXT,
  customer_message TEXT,
  respond_by TIMESTAMPTZ NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb,
  assigned_to INTEGER, -- References admin(id) but no FK constraint
  internal_notes JSONB DEFAULT '[]'::jsonb,
  resolution JSONB,
  impact JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. KYC Verification
CREATE TABLE IF NOT EXISTS kyc_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'verified', 'rejected', 'expired')),
  verification_method TEXT CHECK (verification_method IN ('manual', 'stripe_identity', 'plaid', 'persona', 'onfido')),
  document_type TEXT CHECK (document_type IN ('passport', 'drivers_license', 'national_id', 'ssn')),
  document_number TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  verification_provider TEXT,
  provider_verification_id TEXT,
  verification_data JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rejection_reason TEXT,
  reviewer_id INTEGER, -- References admin(id) but no FK constraint
  reviewer_notes TEXT,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_factors JSONB DEFAULT '[]'::jsonb,
  ip_address INET,
  user_agent TEXT,
  geolocation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payout Management
CREATE TABLE IF NOT EXISTS payout_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES users(id),
  queue_position INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'scheduled', 'processing', 'completed', 'failed', 'cancelled')),
  eligibility_check JSONB DEFAULT '{}'::jsonb,
  approval_workflow JSONB DEFAULT '[]'::jsonb,
  scheduled_date TIMESTAMPTZ,
  payment_method TEXT NOT NULL DEFAULT 'ach' CHECK (payment_method IN ('ach', 'wire', 'check', 'paypal')),
  bank_details JSONB,
  tax_withholding JSONB,
  processing JSONB,
  receipt_url TEXT,
  internal_notes JSONB DEFAULT '[]'::jsonb,
  audit_trail JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tax Forms
CREATE TABLE IF NOT EXISTS tax_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES users(id),
  form_type TEXT NOT NULL CHECK (form_type IN ('W-9', '1099-MISC', '1099-NEC', '1099-K', 'W-8BEN')),
  tax_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'sent', 'filed_with_irs', 'corrected')),
  recipient_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  payer_info JSONB DEFAULT '{}'::jsonb,
  income_details JSONB DEFAULT '{}'::jsonb,
  w9_data JSONB DEFAULT '{}'::jsonb,
  generation JSONB DEFAULT '{}'::jsonb,
  delivery JSONB DEFAULT '{}'::jsonb,
  irs_filing JSONB DEFAULT '{}'::jsonb,
  corrections JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Transaction Monitoring (AML)
CREATE TABLE IF NOT EXISTS transaction_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'payout', 'refund', 'chargeback')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'flagged', 'blocked', 'escalated')),
  flags JSONB DEFAULT '[]'::jsonb,
  aml_check JSONB DEFAULT '{}'::jsonb,
  velocity_check JSONB DEFAULT '{}'::jsonb,
  device_fingerprint JSONB DEFAULT '{}'::jsonb,
  geographic_data JSONB DEFAULT '{}'::jsonb,
  reviewer_id INTEGER, -- References admin(id) but no FK constraint
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  sar_filed BOOLEAN DEFAULT FALSE,
  sar_filed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('financial', 'compliance', 'operations', 'analytics', 'custom')),
  data_source TEXT NOT NULL,
  query_config JSONB DEFAULT '{}'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  visualizations JSONB DEFAULT '[]'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  delivery JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  is_system_report BOOLEAN DEFAULT FALSE,
  created_by INTEGER, -- References admin(id) but no FK constraint
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity_status ON admin_alerts(severity, status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_category ON admin_alerts(category);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_user_id ON kyc_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verification_status ON kyc_verification(status);
CREATE INDEX IF NOT EXISTS idx_payout_management_user_id ON payout_management(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_management_status ON payout_management(status);
CREATE INDEX IF NOT EXISTS idx_tax_forms_user_id ON tax_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_forms_tax_year ON tax_forms(tax_year);
CREATE INDEX IF NOT EXISTS idx_transaction_monitoring_user_id ON transaction_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_monitoring_risk_level ON transaction_monitoring(risk_level, status);

-- Insert some sample data for testing
INSERT INTO admin_alerts (title, message, severity, category, status) VALUES
('High Payment Failure Rate', 'Payment failure rate has exceeded 5% in the last hour', 'warning', 'payment', 'new'),
('KYC Verification Backlog', 'Over 50 KYC verifications are pending review', 'critical', 'compliance', 'new'),
('System Performance Alert', 'Database response time is above normal thresholds', 'warning', 'system', 'acknowledged');

-- Insert KYC verification records
INSERT INTO kyc_verification (user_id, status, verification_method, document_type, risk_score) 
SELECT id, 'verified', 'manual', 'drivers_license', 85 FROM users LIMIT 5;

INSERT INTO kyc_verification (user_id, status, verification_method, document_type, risk_score) 
SELECT id, 'pending', 'stripe_identity', 'passport', NULL FROM users OFFSET 5 LIMIT 3;

-- Add some sample disputes
INSERT INTO disputes (dispute_id, user_id, type, status, reason, amount, respond_by)
SELECT 
  'dp_' || gen_random_uuid()::text,
  id,
  'chargeback',
  'needs_response',
  'fraudulent',
  299.00,
  NOW() + INTERVAL '7 days'
FROM users LIMIT 2;

-- Add sample payout management entries
INSERT INTO payout_management (user_id, queue_position, status, eligibility_check)
SELECT 
  u.id,
  ROW_NUMBER() OVER (ORDER BY u.created_at),
  CASE WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) <= 5 THEN 'approved' ELSE 'pending_approval' END,
  '{"tenure_verified": true, "payments_verified": true, "kyc_verified": true}'::jsonb
FROM users u
WHERE EXISTS (SELECT 1 FROM membership_queue mq WHERE u.id = mq.user_id)
LIMIT 10;