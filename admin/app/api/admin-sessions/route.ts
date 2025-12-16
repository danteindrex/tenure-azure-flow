import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { adminSessionQueries } from '@/lib/db/queries';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// GET - Fetch sessions for current admin or all sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('admin_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    let sessions;
    if (adminId) {
      sessions = await adminSessionQueries.findByAdminId(parseInt(adminId));
    } else {
      sessions = await adminSessionQueries.getAll(limit, offset);
    }

    // Add is_active flag
    const sessionsWithStatus = sessions.map(session => {
      const isActive = new Date(session.expiresAt) > new Date();
      return {
        id: session.id,
        admin_id: session.adminId,
        session_token: session.token,
        ip_address: session.ipAddress,
        user_agent: session.userAgent,
        expires_at: session.expiresAt,
        created_at: session.createdAt,
        is_active: isActive,
        admin: {
          id: session.adminId,
          email: session.adminEmail,
          name: session.adminName
        }
      };
    });

    return NextResponse.json({ sessions: sessionsWithStatus });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// DELETE - Invalidate a specific session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    await adminSessionQueries.delete(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error invalidating session:', error);
    return NextResponse.json({ error: 'Failed to invalidate session' }, { status: 500 });
  }
}
