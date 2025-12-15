import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // Get token from cookie
    const cookieHeader = request.headers.get('cookie');
    const tokenMatch = cookieHeader?.match(/admin_token=([^;]+)/);
    const token = tokenMatch?.[1];

    // If token exists, invalidate the session
    if (token) {
      try {
        const decoded: any = verify(token, JWT_SECRET);
        
        if (decoded.sessionId) {
          // Mark session as inactive
          await supabaseAdmin
            .from('session')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('session_token', decoded.sessionId);
        }
      } catch (err) {
        console.error('Error invalidating session:', err);
      }
    }

    const response = NextResponse.json({ success: true });
    
    // Clear the admin token cookie
    response.cookies.set('admin_token', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}