import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { adminSessionQueries } from '@/lib/db/queries';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
          // Delete session
          await adminSessionQueries.deleteByToken(decoded.sessionId);
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