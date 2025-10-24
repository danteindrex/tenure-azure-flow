import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Test basic collections
    const tests = []
    
    // Test users collection
    try {
      const users = await payload.count({ collection: 'users' })
      tests.push({ collection: 'users', status: 'success', count: users.totalDocs })
    } catch (error) {
      tests.push({ collection: 'users', status: 'error', error: error.message })
    }
    
    // Test user_payments collection
    try {
      const payments = await payload.count({ collection: 'user_payments' })
      tests.push({ collection: 'user_payments', status: 'success', count: payments.totalDocs })
    } catch (error) {
      tests.push({ collection: 'user_payments', status: 'error', error: error.message })
    }
    
    // Test membership_queue collection
    try {
      const queue = await payload.count({ collection: 'membership_queue' })
      tests.push({ collection: 'membership_queue', status: 'success', count: queue.totalDocs })
    } catch (error) {
      tests.push({ collection: 'membership_queue', status: 'error', error: error.message })
    }
    
    // Test kyc_verification collection
    try {
      const kyc = await payload.count({ collection: 'kyc_verification' })
      tests.push({ collection: 'kyc_verification', status: 'success', count: kyc.totalDocs })
    } catch (error) {
      tests.push({ collection: 'kyc_verification', status: 'error', error: error.message })
    }
    
    // Test admin_alerts collection
    try {
      const alerts = await payload.count({ collection: 'admin_alerts' })
      tests.push({ collection: 'admin_alerts', status: 'success', count: alerts.totalDocs })
    } catch (error) {
      tests.push({ collection: 'admin_alerts', status: 'error', error: error.message })
    }

    return NextResponse.json({
      message: 'Collection tests completed',
      tests,
      summary: {
        total: tests.length,
        success: tests.filter(t => t.status === 'success').length,
        errors: tests.filter(t => t.status === 'error').length
      }
    })
  } catch (error) {
    console.error('Test collections error:', error)
    return NextResponse.json(
      { error: 'Failed to test collections', details: error.message },
      { status: 500 }
    )
  }
}