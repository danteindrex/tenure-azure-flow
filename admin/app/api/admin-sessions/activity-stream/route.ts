import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { auditLogQueries } from '@/lib/db/queries';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify authentication
  const cookieHeader = request.headers.get('cookie');
  const tokenMatch = cookieHeader?.match(/admin_token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    verify(token, JWT_SECRET);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  // For now, return recent audit logs as polling endpoint
  // Real-time streaming would require WebSocket or SSE with database triggers
  try {
    const logs = await auditLogQueries.getAll(50, 0);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching activity stream:', error);
    return NextResponse.json({ error: 'Failed to fetch activity stream' }, { status: 500 });
  }
}
