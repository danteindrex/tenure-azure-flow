const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupQueue() {
  try {
    console.log('Setting up queue table...');
    
    // First, let's check if the queue table already exists
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'queue');
    
    if (checkError) {
      console.log('Could not check existing tables, proceeding with creation...');
    } else if (existingTables && existingTables.length > 0) {
      console.log('✅ Queue table already exists!');
      return;
    }
    
    // Create the queue table using a simple approach
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.queue (
        id BIGSERIAL PRIMARY KEY,
        memberid BIGINT NOT NULL,
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
        UNIQUE(memberid),
        UNIQUE(queue_position),
        CHECK (queue_position > 0),
        CHECK (total_months_subscribed >= 0),
        CHECK (lifetime_payment_total >= 0)
      );
    `;
    
    // Try to execute the SQL
    const { error: createError } = await supabase.rpc('exec', { 
      sql: createTableSQL 
    });
    
    if (createError) {
      console.log('Direct SQL execution failed, trying alternative approach...');
      
      // Alternative: Use the REST API to create the table
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: createTableSQL })
      });
      
      if (!response.ok) {
        console.log('REST API approach also failed.');
        console.log('\n📋 Manual Setup Required:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the following SQL:');
        console.log('\n' + createTableSQL);
        console.log('\n4. Execute the script');
        return;
      }
    }
    
    // Create indexes
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_queue_memberid ON public.queue(memberid);
      CREATE INDEX IF NOT EXISTS idx_queue_position ON public.queue(queue_position);
      CREATE INDEX IF NOT EXISTS idx_queue_eligible ON public.queue(is_eligible);
      CREATE INDEX IF NOT EXISTS idx_queue_subscription_active ON public.queue(subscription_active);
    `;
    
    await supabase.rpc('exec', { sql: indexSQL });
    
    // Enable RLS
    const rlsSQL = `
      ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can view queue data" ON public.queue FOR SELECT USING (true);
    `;
    
    await supabase.rpc('exec', { sql: rlsSQL });
    
    console.log('✅ Queue table setup completed!');
    
    // Verify the table was created
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'queue');
    
    if (verifyError) {
      console.log('Could not verify table creation, but setup completed.');
    } else if (tables && tables.length > 0) {
      console.log('✅ Queue table verified and ready!');
    }
    
  } catch (error) {
    console.error('Error setting up queue table:', error);
    console.log('\n📋 Manual Setup Required:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL from create-queue-table.sql');
    console.log('4. Execute the script');
  }
}

setupQueue();
