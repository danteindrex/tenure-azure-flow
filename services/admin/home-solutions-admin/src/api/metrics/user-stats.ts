import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Helper function to safely query collections
    const safeQuery = async (queryFn: () => Promise<any>, fallback: any = { totalDocs: 0, docs: [] }) => {
      try {
        return await queryFn()
      } catch (error) {
        console.error('Query failed:', error)
        return fallback
      }
    }

    // Get user statistics
    const [totalUsers, activeUsers, pendingUsers, allPayments] = await Promise.all([
      safeQuery(() => payload.count({ collection: 'users' }), { totalDocs: 0 }),
      safeQuery(() => payload.count({
        collection: 'users',
        where: { status: { equals: 'Active' } }
      }), { totalDocs: 0 }),
      safeQuery(() => payload.count({
        collection: 'users',
        where: { status: { equals: 'Pending' } }
      }), { totalDocs: 0 }),
      safeQuery(() => payload.find({
        collection: 'user_payments',
        limit: 0
      }), { docs: [], totalDocs: 0 })
    ])

    // Calculate financial statistics
    const totalRevenue = allPayments.docs.reduce((sum: number, payment: any) => 
      sum + (payment.amount || 0), 0)
    
    const averagePayments = totalUsers.totalDocs > 0 
      ? allPayments.totalDocs / totalUsers.totalDocs 
      : 0

    const stats = {
      totalUsers: totalUsers.totalDocs,
      activeUsers: activeUsers.totalDocs,
      pendingUsers: pendingUsers.totalDocs,
      totalRevenue,
      averagePayments
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('User stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
}