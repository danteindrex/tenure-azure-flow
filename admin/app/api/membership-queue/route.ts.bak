import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // First, try to fetch from the view
    const { data: members, error } = await supabaseAdmin
      .from('active_member_queue_view')
      .select('*')
      .order('queue_position', { ascending: true });

    if (error) {
      console.error('Error from Supabase (active_member_queue_view):', error);
      
      // If view doesn't exist or has issues, fall back to the table with join
      console.log('Falling back to membership_queue table...');
      const { data: fallbackMembers, error: fallbackError } = await supabaseAdmin
        .from('membership_queue')
        .select(`
          *,
          users!inner(
            id,
            name,
            email,
            image
          )
        `)
        .eq('status', 'active')
        .order('queue_position', { ascending: true });

      if (fallbackError) {
        console.error('Fallback error:', fallbackError);
        throw fallbackError;
      }

      console.log('Fetched members from membership_queue (fallback):', fallbackMembers?.length || 0);
      return NextResponse.json({
        members: fallbackMembers || [],
        source: 'membership_queue'
      });
    }

    console.log('Fetched members from active_member_queue_view:', members?.length || 0);
    if (members && members.length > 0) {
      console.log('Sample member data:', JSON.stringify(members[0], null, 2));
    }

    return NextResponse.json({
      members: members || [],
      source: 'active_member_queue_view'
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