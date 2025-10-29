import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { session } from '@/drizzle/schema/auth'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const currentSession = await auth.api.getSession({ headers: req.headers })
    
    if (!currentSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await req.json()
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Delete the specified session (only if it belongs to the current user)
    await db
      .delete(session)
      .where(
        and(
          eq(session.id, sessionId),
          eq(session.userId, currentSession.user.id)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}