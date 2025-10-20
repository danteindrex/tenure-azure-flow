const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupNotifications() {
  console.log('🔧 Setting up notifications system...');
  
  try {
    // First, let's check if we can create a simple test notification
    console.log('📝 Testing notification creation...');
    
    // Try to insert a test notification directly
    const testNotification = {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the table exists.',
      priority: 'low',
      is_read: false,
      metadata: { test: true }
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (error) {
      console.error('❌ Notifications table does not exist or has issues:', error.message);
      console.log('📋 You need to create the notifications table in Supabase manually.');
      console.log('🔗 Go to your Supabase dashboard > SQL Editor and run the SQL from create-notifications-tables.sql');
      return false;
    } else {
      console.log('✅ Notifications table exists and working!');
      
      // Clean up test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', data.id);
      
      console.log('🧹 Test notification cleaned up');
      return true;
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return false;
  }
}

// Run the setup
setupNotifications().then(success => {
  if (success) {
    console.log('✅ Notifications system is ready!');
    console.log('🧪 You can now test notifications at: http://localhost:3005/dashboard/notifications');
  } else {
    console.log('⚠️  Manual setup required. Please run the SQL file in Supabase.');
  }
});