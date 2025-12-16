import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Fetch from user_memberships table with user data
    console.log('Fetching from user_memberships table...');
    const { data: members, error } = await supabaseAdmin
      .from('user_memberships')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          image,
          email_verified,
          created_at,
          updated_at,
          user_status_id
        )
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error from Supabase (user_memberships):', error);
      throw error;
    }

    // Enrich user_memberships data with phone and address
    const enrichedMembers = await Promise.all(
      (members || []).map(async (member) => {
        const userId = member.user_id;
        
        // Fetch phone number from user_contacts
        const { data: contacts } = await supabaseAdmin
          .from('user_contacts')
          .select('contact_value, contact_type, is_primary')
          .eq('user_id', userId)
          .eq('contact_type', 'phone')
          .order('is_primary', { ascending: false })
          .limit(1);
        
        // Fetch address from user_addresses
        const { data: addresses } = await supabaseAdmin
          .from('user_addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_primary', { ascending: false })
          .limit(1);

        // Get member eligibility status name from member_eligibility_statuses
        const { data: statusData } = await supabaseAdmin
          .from('member_eligibility_statuses')
          .select('name')
          .eq('id', member.member_eligibility_status_id || 1)
          .single();
        
        return {
          ...member,
          // Map fields to match expected structure
          membership_id: member.id,
          user_id: member.user_id,
          email: member.users?.email,
          user_created_at: member.users?.created_at,
          first_name: member.users?.name?.split(' ')[0] || '',
          last_name: member.users?.name?.split(' ').slice(1).join(' ') || '',
          full_name: member.users?.name,
          member_status: statusData?.name || 'Active',
          member_status_id: member.users?.user_status_id || 1,
          queue_position: member.position || 1,
          phone: contacts?.[0]?.contact_value || null,
          address: addresses?.[0] ? 
            `${addresses[0].street_address}${addresses[0].address_line_2 ? ', ' + addresses[0].address_line_2 : ''}` : null,
          city: addresses?.[0]?.city || null,
          state: addresses?.[0]?.state || null,
          postal_code: addresses?.[0]?.postal_code || null,
          country_code: addresses?.[0]?.country_code || null,
        };
      })
    );

    console.log('Fetched members from user_memberships:', enrichedMembers?.length || 0);
    if (enrichedMembers && enrichedMembers.length > 0) {
      console.log('Sample member data:', JSON.stringify(enrichedMembers[0], null, 2));
    }

    return NextResponse.json({
      members: enrichedMembers || [],
      source: 'user_memberships'
    });
  } catch (error: any) {
    console.error('Error fetching membership queue:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch membership queue',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}