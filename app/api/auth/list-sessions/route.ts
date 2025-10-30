import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { session } from '@/drizzle/schema/auth'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const currentSession = await auth.api.getSession({ headers: req.headers })
    
    if (!currentSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all sessions for the current user
    const userSessions = await db
      .select()
      .from(session)
      .where(eq(session.userId, currentSession.user.id))
      .orderBy(desc(session.createdAt))

    return NextResponse.json({ 
      sessions: userSessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        isCurrent: s.id === currentSession.session.id
      }))
    })
  } catch (error) {
    console.error('Error listing sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}