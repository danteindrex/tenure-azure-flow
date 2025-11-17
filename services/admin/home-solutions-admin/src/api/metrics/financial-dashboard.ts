import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../payload.config'

export async function GET(_request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const _weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const _monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Helper function to safely query collections
    const safeQuery = async (queryFn: () => Promise<any>, fallback: any = { docs: [], totalDocs: 0 }) => {
      try {
        return await queryFn()
      } catch (error) {
        console.error('Query failed:', error)
        return fallback
      }
    }

    // Fetch all payment data
    const [
      allPayments,
      monthlyPayments,
      dailyPayments,
      recentPayments,
      totalUsers,
      activeUsers,
      queueEntries,
      eligiblePayouts,
      pendingKyc,
      criticalAlerts
    ] = await Promise.all([
      safeQuery(() => payload.find({ 
        collection: 'user_payments', 
        limit: 0,
        where: { status: { equals: 'succeeded' } }
      })),
      safeQuery(() => payload.find({
        collection: 'user_payments',
        limit: 0,
        where: { 
          createdAt: { greater_than: thisMonth },
          status: { equals: 'succeeded' }
        }
      })),
      safeQuery(() => payload.find({
        collection: 'user_payments',
        limit: 0,
        where: { 
          createdAt: { greater_than: today },
          status: { equals: 'succeeded' }
        }
      })),
      safeQuery(() => payload.find({
        collection: 'user_payments',
        limit: 10,
        sort: '-createdAt'
      })),
      safeQuery(() => payload.count({ collection: 'users' })),
      safeQuery(() => payload.count({ 
        collection: 'users',
        where: { status: { equals: 'Active' } }
      })),
      safeQuery(() => payload.count({ collection: 'membership_queue' })),
      safeQuery(() => payload.count({
        collection: 'membership_queue'
        // No eligibility filtering - just count all queue entries
      })),
      safeQuery(() => payload.count({
        collection: 'kyc_verification',
        where: { status: { equals: 'pending' } }
      })),
      safeQuery(() => payload.count({
        collection: 'admin_alerts',
        where: { 
          severity: { equals: 'critical' },
          status: { not_equals: 'resolved' }
        }
      }))
    ])

    // Calculate financial metrics
    const totalRevenue = allPayments.docs.reduce((sum: number, payment: any) => 
      sum + (payment.amount || 0), 0)

    const monthlyRevenue = monthlyPayments.docs.reduce((sum: number, payment: any) => 
      sum + (payment.amount || 0), 0)

    const dailyRevenue = dailyPayments.docs.reduce((sum: number, payment: any) => 
      sum + (payment.amount || 0), 0)

    const transactionCount = allPayments.totalDocs
    const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0

    // Calculate success rate from all transactions (including failed ones)
    const allTransactions = await payload.count({ collection: 'user_payments' })
    const successRate = allTransactions.totalDocs > 0 
      ? (allPayments.totalDocs / allTransactions.totalDocs) * 100 
      : 0

    // Get user emails for recent transactions
    const userIds = recentPayments.docs.map((payment: any) => payment.user_id).filter(Boolean)
    let userEmails: Record<string, string> = {}
    
    if (userIds.length > 0) {
      const users = await safeQuery(() => payload.find({
        collection: 'users',
        where: { id: { in: userIds } },
        limit: userIds.length
      }))
      userEmails = users.docs.reduce((acc: any, user: any) => {
        acc[user.id] = user.email
        return acc
      }, {})
    }

    // Format recent transactions
    const recentTransactions = recentPayments.docs.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount || 0,
      status: payment.status || 'unknown',
      user_email: userEmails[payment.user_id] || payment.user_id || 'Unknown',
      created_at: payment.createdAt
    }))

    // Generate 7-day payment trends
    const paymentTrends = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      
      const dayPayments = await safeQuery(() => payload.find({
        collection: 'user_payments',
        limit: 0,
        where: {
          createdAt: {
            greater_than: date,
            less_than: nextDate
          },
          status: { equals: 'succeeded' }
        }
      }))
      
      const dayAmount = dayPayments.docs.reduce((sum: number, payment: any) => 
        sum + (payment.amount || 0), 0)

      paymentTrends.push({
        date: date.toISOString().split('T')[0],
        amount: dayAmount,
        count: dayPayments.totalDocs
      })
    }

    const metrics = {
      totalRevenue,
      monthlyRevenue,
      dailyRevenue,
      transactionCount,
      successRate,
      averageTransactionValue,
      totalUsers: totalUsers.totalDocs,
      activeUsers: activeUsers.totalDocs,
      queueSize: queueEntries.totalDocs,
      eligiblePayouts: eligiblePayouts.totalDocs,
      pendingKyc: pendingKyc.totalDocs,
      criticalAlerts: criticalAlerts.totalDocs,
      recentTransactions,
      paymentTrends
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Financial dashboard metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial metrics' },
      { status: 500 }
    )
  }
}