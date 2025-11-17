-- Migration: Add unique constraints to prevent duplicate payment records
-- Date: 2025-11-14
-- Purpose: Fix duplicate charging issue by preventing duplicate payment records

-- Add unique constraint on provider_payment_id to prevent duplicate payments
-- This ensures each Stripe payment_intent can only be recorded once
ALTER TABLE user_payments
ADD CONSTRAINT unique_provider_payment_id
UNIQUE (provider_payment_id)
WHERE provider_payment_id IS NOT NULL;

-- Add unique constraint on provider_invoice_id to prevent duplicate invoice payments
-- This ensures each Stripe invoice can only be recorded once
ALTER TABLE user_payments
ADD CONSTRAINT unique_provider_invoice_id
UNIQUE (provider_invoice_id)
WHERE provider_invoice_id IS NOT NULL;

-- Add index on provider_payment_id for faster lookups (idempotency checks)
CREATE INDEX IF NOT EXISTS idx_user_payments_provider_payment_id
ON user_payments(provider_payment_id)
WHERE provider_payment_id IS NOT NULL;

-- Add index on provider_invoice_id for faster lookups (idempotency checks)
CREATE INDEX IF NOT EXISTS idx_user_payments_provider_invoice_id
ON user_payments(provider_invoice_id)
WHERE provider_invoice_id IS NOT NULL;

-- Add comment explaining the constraints
COMMENT ON CONSTRAINT unique_provider_payment_id ON user_payments IS
'Prevents duplicate payment records from Stripe payment_intent webhooks';

COMMENT ON CONSTRAINT unique_provider_invoice_id ON user_payments IS
'Prevents duplicate payment records from Stripe invoice webhooks';
