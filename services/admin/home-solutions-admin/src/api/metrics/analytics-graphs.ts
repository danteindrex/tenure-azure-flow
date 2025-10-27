import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../payload.config'

// Simple in-memory cache with 5 minute TTL
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getFromCache(key: string) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function GET() {
  try {
    // Check cache first
    const cachedData = getFromCache('analytics-graphs')
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

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

    // Get date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // OPTIMIZED: Fetch all data at once instead of in loops
    const [allUsers, allPayments, allQueueEntries] = await Promise.all([
      safeQuery(() => payload.find({
        collection: 'users',
        limit: 10000,
        sort: '-createdAt'
      }), { docs: [], totalDocs: 0 }),
      safeQuery(() => payload.find({
        collection: 'user_payments',
        limit: 10000,
        sort: '-createdAt'
      }), { docs: [], totalDocs: 0 }),
      safeQuery(() => payload.find({
        collection: 'membership_queue',
        limit: 10000
      }), { docs: [], totalDocs: 0 })
    ])

    // Process user signups data
    const userSignupsData: Array<{ date: string; count: number }> = []
    const usersByDate = new Map<string, number>()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      usersByDate.set(dateStr, 0)
    }

    allUsers.docs.forEach((user: any) => {
      const userDate = new Date(user.createdAt).toISOString().split('T')[0]
      if (usersByDate.has(userDate)) {
        usersByDate.set(userDate, (usersByDate.get(userDate) || 0) + 1)
      }
    })

    usersByDate.forEach((count, date) => {
      userSignupsData.push({ date, count })
    })

    // Calculate user growth
    const lastMonthUsersCount = allUsers.docs.filter((u: any) =>
      new Date(u.createdAt) < thirtyDaysAgo
    ).length
    const userGrowth = lastMonthUsersCount > 0
      ? ((allUsers.totalDocs - lastMonthUsersCount) / lastMonthUsersCount) * 100
      : 0

    // Process payment data (daily)
    const payoutData: Array<{ date: string; amount: number; count: number }> = []
    const paymentsByDate = new Map<string, { amount: number; count: number }>()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      paymentsByDate.set(dateStr, { amount: 0, count: 0 })
    }

    allPayments.docs.forEach((payment: any) => {
      const paymentDate = new Date(payment.createdAt).toISOString().split('T')[0]
      if (paymentsByDate.has(paymentDate)) {
        const current = paymentsByDate.get(paymentDate)!
        paymentsByDate.set(paymentDate, {
          amount: current.amount + (parseFloat(payment.amount) || 0),
          count: current.count + 1
        })
      }
    })

    paymentsByDate.forEach((data, date) => {
      payoutData.push({ date, ...data })
    })

    // Process monthly payment data
    const monthlyPayoutData: Array<{ month: string; amount: number; count: number }> = []
    const paymentsByMonth = new Map<string, { amount: number; count: number }>()

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      paymentsByMonth.set(monthKey, { amount: 0, count: 0 })
    }

    allPayments.docs.forEach((payment: any) => {
      const paymentDate = new Date(payment.createdAt)
      const monthKey = paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (paymentsByMonth.has(monthKey)) {
        const current = paymentsByMonth.get(monthKey)!
        paymentsByMonth.set(monthKey, {
          amount: current.amount + (parseFloat(payment.amount) || 0),
          count: current.count + 1
        })
      }
    })

    paymentsByMonth.forEach((data, month) => {
      monthlyPayoutData.push({ month, ...data })
    })

    // Calculate payment totals
    const totalPayoutAmount = allPayments.docs.reduce((sum: number, p: any) =>
      sum + (parseFloat(p.amount) || 0), 0)
    const averagePayoutAmount = allPayments.totalDocs > 0 ? totalPayoutAmount / allPayments.totalDocs : 0

    // Queue position distribution
    const positionDistribution = [
      { range: '1-50', count: allQueueEntries.docs.filter((e: any) => {
        const pos = e.position || 0
        return pos >= 1 && pos <= 50
      }).length },
      { range: '51-100', count: allQueueEntries.docs.filter((e: any) => {
        const pos = e.position || 0
        return pos >= 51 && pos <= 100
      }).length },
      { range: '101+', count: allQueueEntries.docs.filter((e: any) => {
        const pos = e.position || 0
        return pos >= 101
      }).length }
    ]

    // Eligibility trend (simplified)
    const eligibilityTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const queueAtDate = allQueueEntries.docs.filter((e: any) =>
        new Date(e.createdAt) <= date
      ).length

      eligibilityTrend.push({
        date: dateStr,
        eligible: queueAtDate,
        total: queueAtDate
      })
    }

    // User activity data (users updated in last 30 days)
    const activeUsersData: Array<{ date: string; count: number }> = []
    const activityByDate = new Map<string, number>()

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      activityByDate.set(dateStr, 0)
    }

    allUsers.docs.forEach((user: any) => {
      if (user.updatedAt) {
        const updateDate = new Date(user.updatedAt).toISOString().split('T')[0]
        if (activityByDate.has(updateDate)) {
          activityByDate.set(updateDate, (activityByDate.get(updateDate) || 0) + 1)
        }
      }
    })

    activityByDate.forEach((count, date) => {
      activeUsersData.push({ date, count })
    })

    // Compile analytics data
    const analyticsData = {
      userSignups: {
        daily: userSignupsData,
        monthly: [],
        total: allUsers.totalDocs,
        growth: userGrowth
      },
      payouts: {
        daily: payoutData,
        monthly: monthlyPayoutData,
        totalAmount: totalPayoutAmount,
        totalCount: allPayments.totalDocs,
        averageAmount: averagePayoutAmount
      },
      tenurePayments: {
        daily: payoutData, // Same as payouts
        monthly: monthlyPayoutData,
        successRate: allPayments.totalDocs > 0 ? 100 : 0,
        totalRevenue: totalPayoutAmount
      },
      queueAnalytics: {
        positionDistribution,
        eligibilityTrend,
        averageWaitTime: allQueueEntries.totalDocs > 0 ? Math.floor(allQueueEntries.totalDocs / 2) : 0
      },
      userActivity: {
        activeUsers: activeUsersData,
        retentionRate: allUsers.totalDocs > 0 ? 100 : 0,
        churnRate: 0
      }
    }

    // Cache the result
    setCache('analytics-graphs', analyticsData)

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Analytics graphs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
