import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { adminSessionQueries } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const cookieHeader = request.headers.get('cookie');
    const tokenMatch = cookieHeader?.match(/admin_token=([^;]+)/);
    const token = tokenMatch?.[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get session statistics
    const stats = await adminSessionQueries.getStats();

    // Get all sessions with details
    const allSessions = await adminSessionQueries.getAll(100, 0);

    // Filter active sessions
    const now = new Date();
    const activeSessions = allSessions
      .filter(s => new Date(s.expiresAt) > now)
      .map(s => ({
        id: s.id,
        admin_id: s.adminId,
        ip_address: s.ipAddress,
        user_agent: s.userAgent,
        expires_at: s.expiresAt,
        created_at: s.createdAt,
        admin: {
          id: s.adminId,
          email: s.adminEmail,
          name: s.adminName
        }
      }));

    return NextResponse.json({
      stats: {
        total: stats.total,
        active: stats.active,
        expired: stats.total - stats.active
      },
      activeSessions: activeSessions,
      recentActivity: {
        last24Hours: 0,
        summary: {}
      }
    });
  } catch (error) {
    console.error('Error in session stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
