import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../payload.config'

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const payload = await getPayload({ config })
    const { userId } = params
    
    // Helper function to safely query collections
    const safeQuery = async (queryFn: () => Promise<any>, fallback: any = null) => {
      try {
        return await queryFn()
      } catch (error) {
        console.error('Query failed:', error)
        return fallback
      }
    }

    // Get user profile information
    const profile = await safeQuery(() => payload.find({
      collection: 'user_profiles',
      where: { user_id: { equals: userId } },
      limit: 1
    }), { docs: [] })

    const profileData = profile.docs[0]
    const fullName = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : ''

    // Get user contact information
    const contact = await safeQuery(() => payload.find({
      collection: 'user_contacts',
      where: { user_id: { equals: userId } },
      limit: 1
    }), { docs: [] })

    const phoneNumber = contact.docs[0]?.phone_number || ''

    // Get user address information
    const address = await safeQuery(() => payload.find({
      collection: 'user_addresses',
      where: { user_id: { equals: userId } },
      limit: 1
    }), { docs: [] })

    const addressData = address.docs[0]
    const fullAddress = addressData ? 
      `${addressData.street_address || ''}\n${addressData.city || ''}, ${addressData.state || ''} ${addressData.postal_code || ''}\n${addressData.country || ''}`.trim() : ''

    // Get payment information
    const payments = await safeQuery(() => payload.find({
      collection: 'user_payments',
      where: { user_id: { equals: userId } },
      limit: 10,
      sort: '-created_at'
    }), { docs: [] })

    const totalPayments = payments.docs.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
    const paymentCount = payments.docs.length
    const lastPaymentDate = payments.docs[0]?.created_at?.split('T')[0] || ''

    const paymentHistory = payments.docs.slice(0, 5).map((payment: any) => ({
      date: payment.created_at?.split('T')[0] || 'Unknown',
      amount: payment.amount || 0,
      status: payment.status || 'unknown'
    }))

    // Get subscription information
    const subscription = await safeQuery(() => payload.find({
      collection: 'user_subscriptions',
      where: { user_id: { equals: userId } },
      limit: 1,
      sort: '-created_at'
    }), { docs: [] })

    const subscriptionData = subscription.docs[0]
    const subscriptionInfo = {
      status: subscriptionData?.status || 'No Subscription',
      provider: subscriptionData?.provider || 'N/A',
      currentPeriodStart: subscriptionData?.current_period_start?.split('T')[0] || '',
      currentPeriodEnd: subscriptionData?.current_period_end?.split('T')[0] || ''
    }

    // Get queue information
    const queueEntry = await safeQuery(() => payload.find({
      collection: 'membership_queue',
      where: { user_id: { equals: userId } },
      limit: 1
    }), { docs: [] })

    const queueData = queueEntry.docs[0]
    const queueInfo = {
      position: queueData?.position || 0,
      status: queueData?.status || 'Not in queue',
      isEligible: queueData?.is_eligible || false,
      joinedDate: queueData?.created_at?.split('T')[0] || ''
    }

    // Get KYC information
    const kyc = await safeQuery(() => payload.find({
      collection: 'kyc_verification',
      where: { user_id: { equals: userId } },
      limit: 1,
      sort: '-created_at'
    }), { docs: [] })

    const kycData = kyc.docs[0]
    const kycInfo = {
      status: kycData?.status || 'Not Verified',
      verifiedAt: kycData?.verified_at?.split('T')[0] || ''
    }

    // Compile user details
    const userDetails = {
      profile: {
        fullName,
        phoneNumber,
        address: fullAddress
      },
      financial: {
        totalPayments,
        paymentCount,
        lastPaymentDate,
        paymentHistory
      },
      subscription: subscriptionInfo,
      queue: queueInfo,
      kyc: kycInfo
    }

    return NextResponse.json(userDetails)
  } catch (error) {
    console.error('User details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}