const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupNotificationsTables() {
  console.log('🔧 Setting up notifications tables...');
  
  try {
    // Create notifications table
    const notificationsTableSQL = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'queue', 'milestone', 'reminder', 'system', 'bonus', 'security', 'profile', 'support')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        is_read BOOLEAN DEFAULT FALSE,
        is_archived BOOLEAN DEFAULT FALSE,
        action_url VARCHAR(500),
        action_text VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        archived_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE
      );
    `;

    const { error: notificationsError } = await supabase.rpc('exec_sql', {
      sql: notificationsTableSQL
    });

    if (notificationsError) {
      console.error('❌ Error creating notifications table:', notificationsError);
    } else {
      console.log('✅ Notifications table created/verified');
    }

    // Create notification preferences table
    const preferencesTableSQL = `
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        sms_notifications BOOLEAN DEFAULT FALSE,
        in_app_notifications BOOLEAN DEFAULT TRUE,
        payment_notifications BOOLEAN DEFAULT TRUE,
        queue_notifications BOOLEAN DEFAULT TRUE,
        milestone_notifications BOOLEAN DEFAULT TRUE,
        reminder_notifications BOOLEAN DEFAULT TRUE,
        system_notifications BOOLEAN DEFAULT TRUE,
        bonus_notifications BOOLEAN DEFAULT TRUE,
        security_notifications BOOLEAN DEFAULT TRUE,
        profile_notifications BOOLEAN DEFAULT TRUE,
        support_notifications BOOLEAN DEFAULT TRUE,
        digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        timezone VARCHAR(50) DEFAULT 'UTC',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: preferencesError } = await supabase.rpc('exec_sql', {
      sql: preferencesTableSQL
    });

    if (preferencesError) {
      console.error('❌ Error creating notification preferences table:', preferencesError);
    } else {
      console.log('✅ Notification preferences table created/verified');
    }

    // Create notification templates table
    const templatesTableSQL = `
      CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'queue', 'milestone', 'reminder', 'system', 'bonus', 'security', 'profile', 'support')),
        title_template VARCHAR(255) NOT NULL,
        message_template TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: templatesError } = await supabase.rpc('exec_sql', {
      sql: templatesTableSQL
    });

    if (templatesError) {
      console.error('❌ Error creating notification templates table:', templatesError);
    } else {
      console.log('✅ Notification templates table created/verified');
    }

    // Create indexes for better performance
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
    `;

    const { error: indexesError } = await supabase.rpc('exec_sql', {
      sql: indexesSQL
    });

    if (indexesError) {
      console.error('❌ Error creating indexes:', indexesError);
    } else {
      console.log('✅ Database indexes created/verified');
    }

    // Test the tables by checking if they exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['notifications', 'notification_preferences', 'notification_templates']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📋 Available notification tables:', tables.map(t => t.table_name));
    }

    console.log('✅ Notifications database setup complete!');
    console.log('🧪 You can now test notifications at: http://localhost:3005/dashboard/notifications');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupNotificationsTables();