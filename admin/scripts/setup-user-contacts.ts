import { supabaseAdmin } from '../lib/supabase/admin';

async function setupUserContacts() {
  try {
    console.log('Setting up user_contacts table and data...\n');
    
    // Step 1: Check if table exists
    console.log('Step 1: Checking if user_contacts table exists...');
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('user_contacts')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST204') {
      console.log('❌ Table does not exist. Creating it...\n');
      
      // Create the table
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS user_contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            contact_type VARCHAR(50),
            contact_value VARCHAR(255),
            is_primary BOOLEAN DEFAULT false,
            is_verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON user_contacts(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_contacts_type ON user_contacts(contact_type);
        `
      });
      
      if (createError) {
        console.error('Error creating table:', createError);
        console.log('\nPlease run this SQL manually in your database:');
        console.log(`
CREATE TABLE user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_type VARCHAR(50),
  contact_value VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_contacts_user_id ON user_contacts(user_id);
CREATE INDEX idx_user_contacts_type ON user_contacts(contact_type);
        `);
        return;
      }
      
      console.log('✅ Table created successfully!\n');
    } else {
      console.log('✅ Table already exists\n');
    }
    
    // Step 2: Get users without phone contacts
    console.log('Step 2: Finding users without phone contacts...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .limit(20);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Found ${users?.length || 0} users\n`);
    
    // Step 3: Add sample phone numbers
    console.log('Step 3: Adding sample phone numbers...');
    let added = 0;
    
    for (const user of users || []) {
      // Check if user already has a phone contact
      const { data: existing } = await supabaseAdmin
        .from('user_contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_type', 'phone')
        .limit(1);
      
      if (!existing || existing.length === 0) {
        // Generate a random phone number
        const phoneNumber = `+1-555-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const { error: insertError } = await supabaseAdmin
          .from('user_contacts')
          .insert({
            user_id: user.id,
            contact_type: 'phone',
            contact_value: phoneNumber,
            is_primary: true,
            is_verified: true,
          });
        
        if (!insertError) {
          console.log(`✅ Added phone ${phoneNumber} for ${user.email}`);
          added++;
        } else {
          console.error(`❌ Failed to add phone for ${user.email}:`, insertError);
        }
      }
    }
    
    console.log(`\n✅ Added ${added} phone numbers\n`);
    
    // Step 4: Show results
    console.log('Step 4: Showing current contacts...');
    const { data: contacts } = await supabaseAdmin
      .from('user_contacts')
      .select(`
        id,
        user_id,
        contact_type,
        contact_value,
        is_primary,
        users (email, name)
      `)
      .eq('contact_type', 'phone')
      .limit(10);
    
    if (contacts && contacts.length > 0) {
      console.table(contacts.map(c => ({
        user_email: (c.users as any)?.email,
        user_name: (c.users as any)?.name || 'No name',
        phone: c.contact_value,
        is_primary: c.is_primary,
      })));
    }
    
    console.log('\n✅ Setup complete! Refresh your users page to see phone numbers.');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

setupUserContacts();
