-- Add keith@gmail.com as a paid member to the membership queue
-- This script creates a complete member record with all required fields

BEGIN;

-- Step 1: Create the user record
INSERT INTO users (
    id,
    email,
    email_verified,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'keith@gmail.com',
    true,
    'Active',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID for subsequent inserts
DO $$
DECLARE
    keith_user_id UUID;
    keith_queue_position INTEGER;
BEGIN
    -- Get Keith's user ID
    SELECT id INTO keith_user_id FROM users WHERE email = 'keith@gmail.com';
    
    -- Get next queue position
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO keith_queue_position FROM membership_queue;
    
    -- Step 2: Create user profile
    INSERT INTO user_profiles (
        user_id,
        first_name,
        last_name,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'Keith',
        'Twesigye',
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW();
    
    -- Step 3: Create contact information
    INSERT INTO user_contacts (
        user_id,
        contact_type,
        contact_value,
        is_primary,
        is_verified,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'email',
        'keith@gmail.com',
        true,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (user_id, contact_type, contact_value) DO UPDATE SET
        is_primary = EXCLUDED.is_primary,
        is_verified = EXCLUDED.is_verified,
        updated_at = NOW();
    
    -- Step 4: Create address information
    INSERT INTO user_addresses (
        user_id,
        address_type,
        street_address,
        city,
        state,
        postal_code,
        country_code,
        is_primary,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'primary',
        '123 Main Street',
        'Kampala',
        'Central',
        '00000',
        'UG',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Step 5: Create membership record
    INSERT INTO user_memberships (
        user_id,
        join_date,
        tenure,
        verification_status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        CURRENT_DATE,
        1, -- 1 month tenure
        'VERIFIED',
        'Test member - Keith Twesigye',
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        tenure = EXCLUDED.tenure,
        verification_status = EXCLUDED.verification_status,
        notes = EXCLUDED.notes,
        updated_at = NOW();
    
    -- Step 6: Add to membership queue with paid status
    INSERT INTO membership_queue (
        user_id,
        queue_position,
        joined_queue_at,
        is_eligible,
        priority_score,
        subscription_active,
        total_months_subscribed,
        last_payment_date,
        lifetime_payment_total,
        has_received_payout,
        notes,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        keith_queue_position,
        NOW(),
        true,
        100, -- High priority
        true, -- Active subscription
        1, -- 1 month subscribed
        NOW(), -- Paid today
        325.00, -- Initial payment amount ($300 joining + $25 monthly)
        false,
        'Test member with paid status for current month',
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        queue_position = EXCLUDED.queue_position,
        is_eligible = EXCLUDED.is_eligible,
        subscription_active = EXCLUDED.subscription_active,
        total_months_subscribed = EXCLUDED.total_months_subscribed,
        last_payment_date = EXCLUDED.last_payment_date,
        lifetime_payment_total = EXCLUDED.lifetime_payment_total,
        notes = EXCLUDED.notes,
        updated_at = NOW();
    
    -- Step 7: Create payment method (simulated Stripe)
    INSERT INTO user_payment_methods (
        user_id,
        provider,
        method_type,
        method_subtype,
        provider_payment_method_id,
        last_four,
        brand,
        expires_month,
        expires_year,
        is_default,
        is_active,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'stripe',
        'card',
        'credit',
        'pm_test_keith_' || extract(epoch from now())::text,
        '4242',
        'visa',
        12,
        2025,
        true,
        true,
        '{"test": true, "member": "keith"}',
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Step 8: Create subscription record
    INSERT INTO user_subscriptions (
        user_id,
        provider,
        provider_subscription_id,
        provider_customer_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'stripe',
        'sub_test_keith_' || extract(epoch from now())::text,
        'cus_test_keith_' || extract(epoch from now())::text,
        'active',
        NOW(),
        NOW() + INTERVAL '1 month',
        false,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Step 9: Create payment records
    -- Initial joining fee payment
    INSERT INTO user_payments (
        user_id,
        provider,
        provider_payment_id,
        provider_invoice_id,
        amount,
        currency,
        payment_type,
        payment_date,
        status,
        is_first_payment,
        receipt_url,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'stripe',
        'pi_test_keith_joining_' || extract(epoch from now())::text,
        'in_test_keith_joining_' || extract(epoch from now())::text,
        300.00,
        'USD',
        'joining_fee',
        NOW(),
        'succeeded',
        true,
        'https://stripe.com/receipts/test_keith_joining',
        '{"test": true, "type": "joining_fee"}',
        NOW(),
        NOW()
    );
    
    -- Monthly subscription payment
    INSERT INTO user_payments (
        user_id,
        provider,
        provider_payment_id,
        provider_invoice_id,
        amount,
        currency,
        payment_type,
        payment_date,
        status,
        is_first_payment,
        receipt_url,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'stripe',
        'pi_test_keith_monthly_' || extract(epoch from now())::text,
        'in_test_keith_monthly_' || extract(epoch from now())::text,
        25.00,
        'USD',
        'monthly_fee',
        NOW(),
        'succeeded',
        false,
        'https://stripe.com/receipts/test_keith_monthly',
        '{"test": true, "type": "monthly_fee"}',
        NOW(),
        NOW()
    );
    
    -- Step 10: Create billing schedule
    INSERT INTO user_billing_schedules (
        user_id,
        billing_cycle,
        next_billing_date,
        amount,
        currency,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        keith_user_id,
        'MONTHLY',
        CURRENT_DATE + INTERVAL '1 month',
        25.00,
        'USD',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Step 11: Create user agreements
    INSERT INTO user_agreements (
        user_id,
        agreement_type,
        version_number,
        agreed_at,
        ip_address,
        document_url,
        is_active,
        created_at
    ) VALUES (
        keith_user_id,
        'terms_of_service',
        '1.0',
        NOW(),
        '127.0.0.1',
        'https://example.com/terms',
        true,
        NOW()
    ),
    (
        keith_user_id,
        'privacy_policy',
        '1.0',
        NOW(),
        '127.0.0.1',
        'https://example.com/privacy',
        true,
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Step 12: Create audit log entry
    INSERT INTO system_audit_logs (
        user_id,
        entity_type,
        entity_id,
        action,
        new_values,
        success,
        metadata,
        created_at
    ) VALUES (
        keith_user_id,
        'membership_queue',
        keith_user_id,
        'member_added',
        jsonb_build_object(
            'email', 'keith@gmail.com',
            'queue_position', keith_queue_position,
            'subscription_active', true,
            'payment_status', 'paid'
        ),
        true,
        jsonb_build_object(
            'source', 'manual_addition',
            'admin_action', true,
            'reason', 'Test member setup'
        ),
        NOW()
    );
    
    -- Output confirmation
    RAISE NOTICE 'Successfully added keith@gmail.com to membership queue at position %', keith_queue_position;
    RAISE NOTICE 'User ID: %', keith_user_id;
    RAISE NOTICE 'Subscription Status: Active';
    RAISE NOTICE 'Payment Status: Paid (Joining: $300, Monthly: $25)';
    RAISE NOTICE 'Total Lifetime Payment: $325.00';
    
END $$;

COMMIT;

-- Verification query to confirm the member was added correctly
SELECT 
    u.email,
    u.status as user_status,
    up.first_name,
    up.last_name,
    mq.queue_position,
    mq.subscription_active,
    mq.total_months_subscribed,
    mq.last_payment_date,
    mq.lifetime_payment_total,
    mq.is_eligible,
    um.tenure,
    um.verification_status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN membership_queue mq ON u.id = mq.user_id
LEFT JOIN user_memberships um ON u.id = um.user_id
WHERE u.email = 'keith@gmail.com';

-- Show payment history
SELECT 
    payment_type,
    amount,
    currency,
    payment_date,
    status,
    is_first_payment
FROM user_payments up
JOIN users u ON up.user_id = u.id
WHERE u.email = 'keith@gmail.com'
ORDER BY payment_date DESC;