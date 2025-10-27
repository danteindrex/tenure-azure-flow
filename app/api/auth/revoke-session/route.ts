import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { session } from '@/drizzle/schema/auth'
import { eq, and } from 'drizzle-orm'

/**
 * POST /api/auth/revoke-session
 * Revoke a specific session (logout from another device)
 */
export async function POST(req: NextRequest) {
  try {
    // Get current session
    const currentSession = await auth.api.getSession({ headers: req.headers })

    if (!currentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = currentSession.user.id
    const currentSessionId = currentSession.session.id

    const body = await req.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Prevent revoking current session
    if (sessionId === currentSessionId) {
      return NextResponse.json(
        { error: 'Cannot revoke current session. Use logout instead.' },
        { status: 400 }
      )
    }

    // Delete the session (only if it belongs to this user)
    const result = await db
      .delete(session)
      .where(
        and(
          eq(session.id, sessionId),
          eq(session.userId, userId)
        )
      )

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully'
    })
  } catch (error: any) {
    console.error('Error revoking session:', error)
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    )
  }
}
