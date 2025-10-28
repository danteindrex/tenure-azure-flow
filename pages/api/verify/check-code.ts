/**
 * Check Verification Code API
 * 
 * POST /api/verify/check-code
 * Verifies SMS code using Twilio Verify service
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { verifyPhoneNumber, formatPhoneNumber } from '@/lib/twilio'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    })
  }

  try {
    const { phone, code, countryCode } = req.body

    // Validate input
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and verification code are required',
        code: 'MISSING_FIELDS'
      })
    }

    // Validate code format (should be 6 digits)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Verification code must be 6 digits',
        code: 'INVALID_CODE_FORMAT'
      })
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone, countryCode || '+256')

    console.log(`🔍 Verifying code ${code} for: ${formattedPhone}`)

    // Verify code using Twilio Verify
    const result = await verifyPhoneNumber(formattedPhone, code)

    if (result.success) {
      console.log(`✅ Phone verification successful for: ${formattedPhone}`)
      
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Phone number verified successfully',
        data: {
          phone: formattedPhone,
          status: result.status,
          valid: result.valid,
          verifiedAt: new Date().toISOString()
        }
      })
    } else {
      console.log(`❌ Phone verification failed for: ${formattedPhone} - ${result.error}`)
      
      return res.status(400).json({
        success: false,
        verified: false,
        error: result.error || 'Invalid or expired verification code',
        code: result.status === 'max_attempts_reached' ? 'MAX_ATTEMPTS' : 'INVALID_CODE'
      })
    }
  } catch (error: any) {
    console.error('Verification check API error:', error)
    return res.status(500).json({
      success: false,
      verified: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    })
  }
}