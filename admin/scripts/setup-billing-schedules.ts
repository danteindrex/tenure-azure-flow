import { supabaseAdmin } from '../lib/supabase/admin';

async function setupBillingSchedules() {
  try {
    console.log('Setting up billing schedules...\n');
    
    // Step 1: Get users
    console.log('Step 1: Fetching users...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .limit(10);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Found ${users?.length || 0} users\n`);
    
    // Step 2: Add monthly billing schedules
    console.log('Step 2: Adding monthly billing schedules...');
    let monthlyAdded = 0;
    
    for (let i = 0; i < Math.min(5, users?.length || 0); i++) {
      const user = users![i];
      
      // Check if user already has a monthly schedule
      const { data: existing } = await supabaseAdmin
        .from('user_billing_schedules')
        .select('id')
        .eq('user_id', user.id)
        .eq('billing_cycle', 'monthly')
        .limit(1);
      
      if (!existing || existing.length === 0) {
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);
        
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - 30);
        
        const { error: insertError } = await supabaseAdmin
          .from('user_billing_schedules')
          .insert({
            user_id: user.id,
            billing_cycle: 'monthly',
            amount: '29.99',
            currency: 'USD',
            next_billing_date: nextBillingDate.toISOString(),
            is_active: true,
            created_at: createdAt.toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (!insertError) {
          console.log(`✅ Added monthly schedule for ${user.email}`);
          monthlyAdded++;
        } else {
          console.error(`❌ Failed for ${user.email}:`, insertError);
        }
      }
    }
    
    console.log(`\n✅ Added ${monthlyAdded} monthly schedules\n`);
    
    // Step 3: Add yearly billing schedules
    console.log('Step 3: Adding yearly billing schedules...');
    let yearlyAdded = 0;
    
    for (let i = 0; i < Math.min(3, users?.length || 0); i++) {
      const user = users![i];
      
      // Check if user already has a yearly schedule
      const { data: existing } = await supabaseAdmin
        .from('user_billing_schedules')
        .select('id')
        .eq('user_id', user.id)
        .eq('billing_cycle', 'yearly')
        .limit(1);
      
      if (!existing || existing.length === 0) {
        const nextBillingDate = new Date();
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        
        const createdAt = new Date();
        createdAt.setMonth(createdAt.getMonth() - 6);
        
        const { error: insertError } = await supabaseAdmin
          .from('user_billing_schedules')
          .insert({
            user_id: user.id,
            billing_cycle: 'yearly',
            amount: '299.99',
            currency: 'USD',
            next_billing_date: nextBillingDate.toISOString(),
            is_active: true,
            created_at: createdAt.toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (!insertError) {
          console.log(`✅ Added yearly schedule for ${user.email}`);
          yearlyAdded++;
        } else {
          console.error(`❌ Failed for ${user.email}:`, insertError);
        }
      }
    }
    
    console.log(`\n✅ Added ${yearlyAdded} yearly schedules\n`);
    
    // Step 4: Show results
    console.log('Step 4: Showing current billing schedules...');
    const { data: schedules } = await supabaseAdmin
      .from('user_billing_schedules')
      .select(`
        id,
        user_id,
        billing_cycle,
        amount,
        next_billing_date,
        is_active,
        created_at,
        users (email, name)
      `)
      .limit(10);
    
    if (schedules && schedules.length > 0) {
      console.table(schedules.map(s => ({
        user_email: (s.users as any)?.email,
        billing_cycle: s.billing_cycle,
        amount: `$${s.amount}`,
        next_billing: new Date(s.next_billing_date).toLocaleDateString(),
        last_payment: new Date(s.created_at).toLocaleDateString(),
        is_active: s.is_active,
      })));
    }
    
    console.log('\n✅ Setup complete! Refresh your users page to see payment dates.');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

setupBillingSchedules();
