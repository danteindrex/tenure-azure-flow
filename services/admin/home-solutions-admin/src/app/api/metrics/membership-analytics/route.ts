import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../payload.config'

export async function GET(_request: NextRequest) {
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

    // Get all memberships
    const [memberships, _queues] = await Promise.all([
      safeQuery(() => payload.find({
        collection: 'user_memberships',
        limit: 1000,
        sort: '-createdAt'
      })),
      safeQuery(() => payload.find({
        collection: 'membership_queue',
        limit: 1000,
        sort: '-joined_queue_at'
      }))
    ])

    // Process data for time-series charts
    const now = new Date()
    const _thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const _ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Daily new memberships (last 30 days)
    const dailyNewMembers: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dailyNewMembers[dateStr] = 0
    }

    // Weekly aggregations
    const weeklyNewMembers: Record<string, number> = {}
    for (let i = 0; i < 12; i++) {
      const _weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekKey = `Week ${12 - i}`
      weeklyNewMembers[weekKey] = 0
    }

    memberships.docs.forEach((membership: any) => {
      // Use createdAt timestamp or join_date
      const createdDate = membership.createdAt ? new Date(membership.createdAt) : 
                          membership.join_date ? new Date(membership.join_date) : new Date()
      const dateStr = createdDate.toISOString().split('T')[0]
      
      if (createdDate >= _thirtyDaysAgo && createdDate <= now) {
        dailyNewMembers[dateStr] = (dailyNewMembers[dateStr] || 0) + 1
      }
    })

    // Membership type distribution - use verification_status or tenure-based grouping
    const typeDistribution: Record<string, number> = {}
    let activeCount = 0
    let inactiveCount = 0

    memberships.docs.forEach((membership: any) => {
      // Use verification_status for type distribution
      const status = membership.verification_status || 'PENDING'
      typeDistribution[status] = (typeDistribution[status] || 0) + 1
      
      // Count verified as active, others as inactive
      if (status === 'VERIFIED') {
        activeCount++
      } else {
        inactiveCount++
      }
    })

    // Membership renewal rates - simplified based on existing data
    const renewalData = {
      totalRenewals: 0,
      totalEligible: 0,
      renewalRate: 0
    }

    memberships.docs.forEach((membership: any) => {
      renewalData.totalEligible++
      // Check if tenure indicates renewal (tenure > 1 month suggests renewal)
      if (membership.tenure && membership.tenure > 1) {
        renewalData.totalRenewals++
      }
    })

    renewalData.renewalRate = renewalData.totalEligible > 0 
      ? (renewalData.totalRenewals / renewalData.totalEligible) * 100 
      : 0

    // Format data for charts
    const dailyData = Object.entries(dailyNewMembers)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const typeDistributionData = Object.entries(typeDistribution)
      .map(([type, count]) => ({ type, count }))

    const analytics = {
      newMembershipsOverTime: {
        daily: dailyData,
        total: dailyData.reduce((sum, d) => sum + d.count, 0),
        growth: dailyData.length > 1 
          ? ((dailyData[dailyData.length - 1].count - dailyData[0].count) / Math.max(dailyData[0].count, 1)) * 100 
          : 0
      },
      membershipTypeDistribution: typeDistributionData,
      activeVsInactive: {
        active: activeCount,
        inactive: inactiveCount,
        total: activeCount + inactiveCount
      },
      renewalRates: {
        rate: renewalData.renewalRate,
        totalRenewals: renewalData.totalRenewals,
        eligibleMemberships: renewalData.totalEligible,
        averageRenewalCount: renewalData.totalRenewals > 0
          ? renewalData.totalRenewals / Math.max(activeCount + inactiveCount, 1)
          : 0
      }
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Membership analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch membership analytics' },
      { status: 500 }
    )
  }
}

