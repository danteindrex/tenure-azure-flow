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

    // Get all KYC verifications
    const kycVerifications = await safeQuery(() => payload.find({
      collection: 'kyc_verification',
      limit: 1000,
      sort: '-created_at'
    }), { docs: [] })

    // Get users to join with KYC data
    const users = await safeQuery(() => payload.find({
      collection: 'users',
      limit: 1000
    }), { docs: [] })

    // Create a user lookup map
    const userMap = new Map()
    users.docs.forEach((user: any) => {
      userMap.set(user.id, user)
    })

    // Calculate stats
    const totalKycApplications = kycVerifications.totalDocs
    const kycVerified = kycVerifications.docs.filter((k: any) => k.status === 'verified').length
    const kycPending = kycVerifications.docs.filter((k: any) => k.status === 'pending').length
    const kycRejected = kycVerifications.docs.filter((k: any) => k.status === 'rejected').length
    const kycInReview = kycVerifications.docs.filter((k: any) => k.status === 'in_review').length

    // Get audit logs count for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const auditLogs = await safeQuery(() => payload.find({
      collection: 'user_audit_logs',
      where: {
        created_at: {
          greater_than_equal: today.toISOString()
        }
      }
    }), { docs: [], totalDocs: 0 })

    // Get high risk users (risk score > 70)
    const highRiskUsers = kycVerifications.docs.filter((k: any) => {
      // Calculate risk score based on status and other factors
      let riskScore = 0
      if (k.status === 'rejected') riskScore += 80
      if (k.status === 'pending') riskScore += 30
      if (k.status === 'in_review') riskScore += 50
      return riskScore > 70
    }).length

    // Calculate compliance score
    const complianceScore = totalKycApplications > 0
      ? ((kycVerified / totalKycApplications) * 100).toFixed(1)
      : 0

    // Map KYC applications with user data
    const applications = kycVerifications.docs.slice(0, 50).map((kyc: any) => {
      const user = userMap.get(kyc.user_id)

      // Calculate risk score
      let riskScore = 20
      if (kyc.status === 'rejected') riskScore = 85
      else if (kyc.status === 'in_review') riskScore = 45
      else if (kyc.status === 'pending') riskScore = 30
      else if (kyc.status === 'verified') riskScore = 15

      return {
        id: kyc.id,
        userId: kyc.user_id,
        userName: user?.email?.split('@')[0] || 'Unknown User',
        userEmail: user?.email || 'unknown@example.com',
        status: kyc.status || 'pending',
        submittedAt: kyc.created_at,
        reviewedAt: kyc.verified_at,
        riskScore: riskScore,
        documents: kyc.document_type ? [kyc.document_type] : []
      }
    })

    const stats = {
      totalKycApplications,
      kycVerified,
      kycPending,
      kycRejected,
      flaggedTransactions: highRiskUsers, // Using high risk count as proxy
      highRiskUsers,
      auditLogsToday: auditLogs.totalDocs,
      complianceScore: parseFloat(complianceScore as string)
    }

    return NextResponse.json({
      stats,
      applications
    })
  } catch (error) {
    console.error('Compliance center error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compliance data' },
      { status: 500 }
    )
  }
}
