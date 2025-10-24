import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Helper function to safely query collections
    const safeQuery = async (queryFn: () => Promise<any>, fallback: any = { docs: [], totalDocs: 0 }) => {
      try {
        return await queryFn()
      } catch (error) {
        console.error('Query failed:', error)
        return fallback
      }
    }

    // Get all users with basic information
    const users = await safeQuery(() => payload.find({
      collection: 'users',
      limit: 100, // Adjust as needed
      sort: '-created_at'
    }), { docs: [] })

    // For each user, we could optionally fetch additional info, but for performance
    // we'll keep the list view simple and fetch details on demand
    const userList = users.docs.map((user: any) => ({
      id: user.id,
      email: user.email,
      status: user.status,
      email_verified: user.email_verified,
      created_at: user.created_at
    }))

    return NextResponse.json({
      users: userList,
      total: users.totalDocs
    })
  } catch (error) {
    console.error('User management error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user management data' },
      { status: 500 }
    )
  }
}