import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: schedules, error } = await supabaseAdmin
      .from('user_billing_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ schedules: schedules || [] });
  } catch (error) {
    console.error('Error fetching billing schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch billing schedules' }, { status: 500 });
  }
}
