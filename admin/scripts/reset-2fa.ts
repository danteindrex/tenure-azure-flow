/**
 * Reset 2FA for an admin (for testing purposes)
 * Run with: npx ts-node scripts/reset-2fa.ts admin@example.com
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reset2FA(email: string) {
  console.log(`🔄 Resetting 2FA for ${email}...\n`);

  try {
    // Find admin
    const { data: admin, error: findError } = await supabase
      .from('admin')
      .select('id, email, two_factor_enabled')
      .eq('email', email)
      .single();

    if (findError || !admin) {
      console.error('❌ Admin not found:', email);
      process.exit(1);
    }

    console.log(`Found admin: ${admin.email}`);
    console.log(`Current 2FA status: ${admin.two_factor_enabled ? 'Enabled' : 'Disabled'}\n`);

    // Reset 2FA
    const { error: updateError } = await supabase
      .from('admin')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null,
      })
      .eq('id', admin.id);

    if (updateError) {
      console.error('❌ Error resetting 2FA:', updateError);
      process.exit(1);
    }

    // Delete any pending codes
    const { error: deleteError } = await supabase
      .from('admin_2fa_codes')
      .delete()
      .eq('admin_id', admin.id);

    if (deleteError) {
      console.warn('⚠️  Warning: Could not delete pending codes:', deleteError);
    }

    console.log('✅ 2FA has been reset successfully!');
    console.log('   - 2FA disabled');
    console.log('   - Backup codes cleared');
    console.log('   - Pending codes deleted');
    console.log('\nThe admin can now set up 2FA again on next login.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage: npx ts-node scripts/reset-2fa.ts admin@example.com');
  process.exit(1);
}

reset2FA(email).catch(console.error);
