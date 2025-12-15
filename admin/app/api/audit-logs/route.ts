import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { auditLogQueries } from '@/lib/db/queries';

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action') || '';
    const resource = searchParams.get('resource') || '';

    const offset = (page - 1) * limit;

    // Build filters
    const filters: any = {};
    if (action && action !== 'all') {
      filters.action = action;
    }
    if (resource && resource !== 'all') {
      filters.resource = resource;
    }

    // Fetch audit logs
    const logs = await auditLogQueries.getAll(limit, offset, filters);
    const stats = await auditLogQueries.getStats();

    // Transform logs for frontend
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      user: log.adminEmail || 'System',
      user_email: log.adminEmail || '',
      action: log.action,
      details: `${log.resource}${log.resourceId ? ` (${log.resourceId})` : ''} | IP: ${log.ipAddress || 'N/A'}`,
      status: log.status,
    }));

    return NextResponse.json({
      logs: transformedLogs,
      pagination: {
        page,
        pages: Math.ceil((stats.total || 0) / limit),
        total: stats.total || 0,
        limit,
      },
    });
  } catch (error) {
    console.error('Error in audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
