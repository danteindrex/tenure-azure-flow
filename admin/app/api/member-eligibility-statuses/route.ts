import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Get the actual statuses from member_eligibility_statuses table
    const { data: statuses, error } = await supabaseAdmin
      .from('member_eligibility_statuses')
      .select('id, name, description')
      .order('id');

    if (error) {
      console.error('Error fetching statuses from database:', error);
      throw error;
    }

    // Format for the frontend
    const formattedStatuses = (statuses || []).map(status => ({
      id: status.name,
      name: status.name,
      description: status.description || `Member is ${status.name.toLowerCase()}`
    }));

    return NextResponse.json({
      statuses: formattedStatuses,
      success: true
    });

  } catch (error: any) {
    console.error('Error fetching member eligibility statuses:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch member eligibility statuses',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}