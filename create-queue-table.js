const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function createQueueTable() {
  try {
    console.log('Creating queue table...');
    
    // Read the SQL file
    const sql = fs.readFileSync('create-queue-table.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      
      // If the exec_sql function doesn't exist, try running the SQL directly
      console.log('Trying alternative approach...');
      
      // Split the SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing:', statement.substring(0, 100) + '...');
          const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
          if (stmtError) {
            console.error('Statement error:', stmtError);
          }
        }
      }
    } else {
      console.log('SQL executed successfully:', data);
    }
    
    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'queue');
    
    if (tableError) {
      console.error('Error checking tables:', tableError);
    } else if (tables && tables.length > 0) {
      console.log('✅ Queue table created successfully!');
    } else {
      console.log('❌ Queue table not found. You may need to run the SQL manually in Supabase dashboard.');
    }
    
  } catch (error) {
    console.error('Error creating queue table:', error);
    console.log('\nPlease run the SQL script manually in your Supabase dashboard:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of create-queue-table.sql');
    console.log('4. Execute the script');
  }
}

createQueueTable();
