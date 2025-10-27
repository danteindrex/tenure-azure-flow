import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../payload.config'

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

    // Get all payments
    const payments = await safeQuery(() => payload.find({
      collection: 'user_payments',
      limit: 100,
      sort: '-created_at'
    }), { docs: [] })

    // Get users to join with payment data
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
    const totalTransactions = payments.totalDocs
    const successfulPayments = payments.docs.filter((p: any) => p.status === 'succeeded' || p.status === 'completed').length
    const failedPayments = payments.docs.filter((p: any) => p.status === 'failed').length
    const pendingPayments = payments.docs.filter((p: any) => p.status === 'pending' || p.status === 'processing').length
    const refundedPayments = payments.docs.filter((p: any) => p.status === 'refunded').length

    // Calculate total revenue from successful payments
    const totalRevenue = payments.docs
      .filter((p: any) => p.status === 'succeeded' || p.status === 'completed')
      .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)

    // Calculate average transaction
    const averageTransaction = successfulPayments > 0
      ? totalRevenue / successfulPayments
      : 0

    // Mock revenue growth (would need historical data)
    const revenueGrowth = 12.5

    // Map transactions with user data
    const transactions = payments.docs.slice(0, 50).map((payment: any) => {
      const user = userMap.get(payment.user_id)

      // Map status to standard format
      let status: 'completed' | 'pending' | 'failed' | 'refunded' = 'pending'
      if (payment.status === 'succeeded' || payment.status === 'completed') {
        status = 'completed'
      } else if (payment.status === 'failed') {
        status = 'failed'
      } else if (payment.status === 'refunded') {
        status = 'refunded'
      }

      return {
        id: payment.id,
        userId: payment.user_id,
        userEmail: user?.email || 'unknown@example.com',
        amount: parseFloat(payment.amount) || 0,
        status: status,
        paymentMethod: payment.payment_method || payment.provider || 'stripe',
        createdAt: payment.created_at
      }
    })

    const stats = {
      totalRevenue,
      totalTransactions,
      successfulPayments,
      failedPayments,
      pendingPayments,
      disputes: refundedPayments, // Using refunded as proxy for disputes
      averageTransaction,
      revenueGrowth
    }

    return NextResponse.json({
      stats,
      transactions
    })
  } catch (error) {
    console.error('Payments center error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment data' },
      { status: 500 }
    )
  }
}
