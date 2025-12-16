import { supabaseAdmin } from '../lib/supabase/admin';
import fs from 'fs';
import path from 'path';

async function setupMemberEligibilityStatuses() {
  try {
    console.log('🚀 Setting up member eligibility statuses table...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-member-eligibility-statuses.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Error executing SQL:', error);
      throw error;
    }

    console.log('✅ Successfully set up member eligibility statuses table!');

    // Verify the setup by fetching the statuses
    const { data: statuses, error: fetchError } = await supabaseAdmin
      .from('member_eligibility_statuses')
      .select('*')
      .order('id');

    if (fetchError) {
      console.error('❌ Error fetching statuses:', fetchError);
    } else {
      console.log('\n📋 Available member eligibility statuses:');
      statuses?.forEach(status => {
        console.log(`  ${status.id}. ${status.name} - ${status.description}`);
      });
    }

    // Check if user_memberships table has the new column
    const { data: sampleMembership } = await supabaseAdmin
      .from('user_memberships')
      .select('id, member_eligibility_status_id')
      .limit(1)
      .single();

    if (sampleMembership) {
      console.log('\n✅ user_memberships table updated successfully!');
      console.log('Sample record:', sampleMembership);
    }

  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupMemberEligibilityStatuses();