import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Clean up expired sessions
export async function POST() {
  try {
    const now = new Date().toISOString();

    // Mark expired sessions as inactive
    const { error } = await supabaseAdmin
      .from('session')
      .update({ 
        is_active: false,
        updated_at: now
      })
      .lt('expires_at', now)
      .eq('is_active', true);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Expired sessions cleaned up' });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return NextResponse.json({ error: 'Failed to cleanup sessions' }, { status: 500 });
  }
}
