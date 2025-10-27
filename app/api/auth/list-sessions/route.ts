import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { session } from '@/drizzle/schema/auth'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/auth/list-sessions
 * List all active sessions for the current user
 */
export async function GET(req: NextRequest) {
  try {
    // Get current session
    const currentSession = await auth.api.getSession({ headers: req.headers })

    if (!currentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = currentSession.user.id
    const currentSessionId = currentSession.session.id

    // Fetch all sessions for this user
    const userSessions = await db
      .select()
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.updatedAt))

    // Format sessions for frontend
    const formattedSessions = userSessions.map((s) => ({
      id: s.id,
      deviceType: parseDeviceType(s.userAgent || ''),
      browser: s.userAgent || 'Unknown',
      ipAddress: s.ipAddress || 'Unknown',
      location: 'Unknown', // Would need IP geolocation service
      lastActive: s.updatedAt?.toISOString() || '',
      current: s.id === currentSessionId
    }))

    return NextResponse.json({
      sessions: formattedSessions,
      currentSessionId
    })
  } catch (error: any) {
    console.error('Error listing sessions:', error)
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    )
  }
}

/**
 * Parse user agent to determine device type
 */
function parseDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'Mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet'
  } else {
    return 'Desktop'
  }
}
