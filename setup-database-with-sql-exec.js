const SupabaseSQLExecutor = require('./supabase-sql-executor');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database with SQL execution capabilities...');
    
    // Create SQL executor with service role key
    const executor = new SupabaseSQLExecutor(supabaseUrl, supabaseServiceKey);
    
    // Step 1: Create the exec_sql function
    console.log('📝 Creating SQL execution function...');
    const execFunctionSQL = fs.readFileSync('create-sql-exec-function.sql', 'utf8');
    const execResult = await executor.executeSQL(execFunctionSQL);
    
    if (!execResult.success) {
      console.error('❌ Failed to create exec_sql function:', execResult.error);
      return;
    }
    console.log('✅ SQL execution function created successfully');
    
    // Step 2: Create the queue table
    console.log('📊 Creating queue table...');
    const queueTableSQL = fs.readFileSync('create-queue-table.sql', 'utf8');
    const queueResult = await executor.executeSQL(queueTableSQL);
    
    if (!queueResult.success) {
      console.error('❌ Failed to create queue table:', queueResult.error);
      return;
    }
    console.log('✅ Queue table created successfully');
    
    // Step 3: Verify tables exist
    console.log('🔍 Verifying database setup...');
    const queueExists = await executor.tableExists('queue');
    const execFunctionExists = await executor.tableExists('exec_sql');
    
    console.log(`Queue table exists: ${queueExists ? '✅' : '❌'}`);
    console.log(`Exec function exists: ${execFunctionExists ? '✅' : '❌'}`);
    
    // Step 4: Test SQL execution
    console.log('🧪 Testing SQL execution...');
    const testResult = await executor.executeSQL('SELECT NOW() as current_time;');
    console.log('Test SQL execution:', testResult.success ? '✅' : '❌');
    
    if (testResult.success) {
      console.log('🎉 Database setup completed successfully!');
      console.log('You can now use the SupabaseSQLExecutor class for direct SQL execution.');
    }
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  }
}

// Example usage of the SQL executor
async function demonstrateUsage() {
  console.log('\n📚 Demonstrating SQL executor usage...');
  
  const executor = new SupabaseSQLExecutor(supabaseUrl, supabaseServiceKey);
  
  // Example 1: Check if queue table exists
  const queueExists = await executor.tableExists('queue');
  console.log('Queue table exists:', queueExists);
  
  // Example 2: Get table schema
  if (queueExists) {
    const schema = await executor.getTableSchema('queue');
    console.log('Queue table schema:', schema.success ? schema.schema : schema.error);
  }
  
  // Example 3: Insert sample data
  if (queueExists) {
    const sampleData = {
      memberid: 999,
      queue_position: 1,
      is_eligible: true,
      subscription_active: true,
      total_months_subscribed: 3,
      lifetime_payment_total: 500.00
    };
    
    const insertResult = await executor.insertData('queue', sampleData);
    console.log('Insert sample data:', insertResult.success ? '✅' : '❌');
  }
}

// Run the setup
setupDatabase().then(() => {
  console.log('\n' + '='.repeat(50));
  demonstrateUsage();
});
