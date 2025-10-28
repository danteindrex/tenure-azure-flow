/**
 * Test SMS API Endpoint
 * 
 * POST /api/sms/test
 * Tests Twilio SMS functionality by sending a test message
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { testSMS, sendSMS, sendVerificationCode } from '@/lib/twilio'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, phoneNumber, message, code } = req.body

    switch (action) {
      case 'test':
        // Send test SMS to predefined number
        console.log('Testing SMS with predefined test number...')
        const testResult = await testSMS()
        
        return res.status(200).json({
          success: testResult.success,
          message: testResult.success 
            ? 'Test SMS sent successfully!' 
            : 'Failed to send test SMS',
          data: testResult
        })

      case 'send':
        // Send custom SMS
        if (!phoneNumber || !message) {
          return res.status(400).json({ error: 'Phone number and message are required' })
        }

        console.log(`Sending custom SMS to ${phoneNumber}`)
        const sendResult = await sendSMS(phoneNumber, message)
        
        return res.status(200).json({
          success: sendResult.success,
          message: sendResult.success 
            ? 'SMS sent successfully!' 
            : 'Failed to send SMS',
          data: sendResult
        })

      case 'verify':
        // Send verification code
        if (!phoneNumber) {
          return res.status(400).json({ error: 'Phone number is required' })
        }

        console.log(`Sending verification code to ${phoneNumber}`)
        const verifyResult = await sendVerificationCode(phoneNumber)
        
        return res.status(200).json({
          success: verifyResult.success,
          message: verifyResult.success 
            ? 'Verification code sent successfully!' 
            : 'Failed to send verification code',
          data: verifyResult
        })

      default:
        return res.status(400).json({ error: 'Invalid action. Use: test, send, or verify' })
    }
  } catch (error: any) {
    console.error('SMS API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}