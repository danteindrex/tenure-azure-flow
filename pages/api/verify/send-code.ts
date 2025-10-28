/**
 * Send Verification Code API
 * 
 * POST /api/verify/send-code
 * Sends SMS verification code using Twilio Verify service
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { sendVerificationCode, formatPhoneNumber } from '@/lib/twilio'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    })
  }

  try {
    const { phone, countryCode } = req.body

    // Validate input
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        code: 'MISSING_PHONE'
      })
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone, countryCode || '+256')

    console.log(`📱 Sending verification code to: ${formattedPhone}`)

    // Send verification code using Twilio Verify
    const result = await sendVerificationCode(formattedPhone)

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
        data: {
          phone: formattedPhone,
          status: result.status,
          verificationSid: result.verificationSid,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
        }
      })
    } else {
      console.error('Failed to send verification code:', result.error)
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to send verification code',
        code: 'SEND_FAILED'
      })
    }
  } catch (error: any) {
    console.error('Verification code API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    })
  }
}