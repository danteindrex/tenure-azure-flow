-- =====================================================
-- Create Queue Table for Tenure System
-- =====================================================
-- This script creates the queue table that tracks member positions
-- and eligibility for payouts in the tenure system
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: CREATE QUEUE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.queue (
    id BIGSERIAL PRIMARY KEY,
    memberid BIGINT NOT NULL REFERENCES public.member(member_id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_active BOOLEAN NOT NULL DEFAULT FALSE,
    total_months_subscribed INTEGER DEFAULT 0,
    last_payment_date DATE,
    lifetime_payment_total NUMERIC(10, 2) DEFAULT 0,
    has_received_payout BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(memberid),
    UNIQUE(queue_position),
    CHECK (queue_position > 0),
    CHECK (total_months_subscribed >= 0),
    CHECK (lifetime_payment_total >= 0)
);

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_queue_memberid ON public.queue(memberid);
CREATE INDEX IF NOT EXISTS idx_queue_position ON public.queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_queue_eligible ON public.queue(is_eligible);
CREATE INDEX IF NOT EXISTS idx_queue_subscription_active ON public.queue(subscription_active);
CREATE INDEX IF NOT EXISTS idx_queue_joined_at ON public.queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_has_received_payout ON public.queue(has_received_payout);

-- =====================================================
-- STEP 3: ADD COMMENTS
-- =====================================================
COMMENT ON TABLE public.queue IS 'Queue management table for tenure system payout eligibility';
COMMENT ON COLUMN public.queue.memberid IS 'References member.member_id';
COMMENT ON COLUMN public.queue.queue_position IS 'Position in the queue (1-based)';
COMMENT ON COLUMN public.queue.joined_at IS 'When member joined the queue';
COMMENT ON COLUMN public.queue.is_eligible IS 'Whether member is eligible for payouts';
COMMENT ON COLUMN public.queue.subscription_active IS 'Whether member has active subscription';
COMMENT ON COLUMN public.queue.total_months_subscribed IS 'Total months of subscription';
COMMENT ON COLUMN public.queue.last_payment_date IS 'Date of last payment';
COMMENT ON COLUMN public.queue.lifetime_payment_total IS 'Total amount paid by member';
COMMENT ON COLUMN public.queue.has_received_payout IS 'Whether member has received any payouts';

-- =====================================================
-- STEP 4: CREATE TRIGGER FOR UPDATED_AT
-- =====================================================
-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at column
DROP TRIGGER IF EXISTS update_queue_updated_at ON public.queue;
CREATE TRIGGER update_queue_updated_at BEFORE UPDATE ON public.queue
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view queue data" ON public.queue
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage queue data" ON public.queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin 
            WHERE id = (SELECT id FROM public.admin WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        )
    );

-- =====================================================
-- STEP 6: CREATE FUNCTION TO AUTO-ADD MEMBERS TO QUEUE
-- =====================================================
-- Function to automatically add new members to queue
CREATE OR REPLACE FUNCTION public.add_member_to_queue()
RETURNS TRIGGER AS $$
DECLARE
    next_position INTEGER;
BEGIN
    -- Get the next available queue position
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO next_position
    FROM public.queue;
    
    -- Insert new member into queue
    INSERT INTO public.queue (
        memberid,
        queue_position,
        joined_at,
        is_eligible,
        subscription_active,
        total_months_subscribed,
        lifetime_payment_total,
        has_received_payout,
        created_at,
        updated_at
    )
    VALUES (
        NEW.member_id,
        next_position,
        NOW(),
        FALSE, -- Not eligible initially
        NEW.status = 'Active', -- Active if member status is Active
        0, -- No months subscribed initially
        0, -- No payments initially
        FALSE, -- No payouts received initially
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-add members to queue
DROP TRIGGER IF EXISTS on_member_created_add_to_queue ON public.member;
CREATE TRIGGER on_member_created_add_to_queue
    AFTER INSERT ON public.member
    FOR EACH ROW
    EXECUTE FUNCTION public.add_member_to_queue();

-- =====================================================
-- STEP 7: CREATE FUNCTION TO UPDATE QUEUE POSITIONS
-- =====================================================
-- Function to recalculate queue positions
CREATE OR REPLACE FUNCTION public.update_queue_positions()
RETURNS VOID AS $$
DECLARE
    queue_record RECORD;
    new_position INTEGER := 1;
BEGIN
    -- Update queue positions based on join date (FIFO)
    FOR queue_record IN 
        SELECT id FROM public.queue 
        ORDER BY joined_at ASC, id ASC
    LOOP
        UPDATE public.queue 
        SET queue_position = new_position,
            updated_at = NOW()
        WHERE id = queue_record.id;
        
        new_position := new_position + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: CREATE FUNCTION TO UPDATE MEMBER ELIGIBILITY
-- =====================================================
-- Function to update member eligibility based on subscription and payments
CREATE OR REPLACE FUNCTION public.update_member_eligibility()
RETURNS VOID AS $$
BEGIN
    -- Update eligibility based on subscription status and payment history
    UPDATE public.queue 
    SET 
        is_eligible = (
            subscription_active = TRUE AND 
            total_months_subscribed >= 3 AND 
            lifetime_payment_total >= 100
        ),
        updated_at = NOW()
    WHERE TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: INSERT SAMPLE DATA (OPTIONAL)
-- =====================================================
-- This will be populated automatically when members are created
-- due to the trigger, but we can add some sample data for testing

-- Note: Sample data will be added when members exist in the member table

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- List created table
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'queue';

-- Check if triggers are created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table = 'queue';

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'queue';

-- =====================================================
-- QUEUE TABLE CREATION COMPLETE
-- =====================================================
SELECT 
    'Queue table created successfully!' as status,
    'Table: queue (tracks member positions and eligibility)' as table_created,
    'Triggers: Auto-add members, updated_at timestamps' as triggers_created,
    'Functions: Update positions, update eligibility' as functions_created,
    'Security: Row Level Security enabled' as security_enabled,
    'Ready for queue dashboard!' as next_step;
