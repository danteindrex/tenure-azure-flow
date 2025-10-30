import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { users, userProfiles, userContacts, userAddresses, userMemberships } from '@/drizzle/schema/users'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile data
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        profiles: true,
        contacts: true,
        addresses: true,
        memberships: true
      }
    })

    return NextResponse.json({ profile: userProfile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileData = await req.json()
    
    // TODO: Implement profile update logic
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  // Alias for POST
  return POST(req)
}