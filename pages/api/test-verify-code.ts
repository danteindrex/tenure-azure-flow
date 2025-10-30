/**
 * Test Email Verification Code API
 * 
 * POST /api/test-verify-code
 * Tests email verification code validation
 */
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const { email, code } = req.body

    // Validate input
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and verification code are required',
        code: 'MISSING_PARAMS'
      })
    }

    console.log(`🔍 Testing verification code for email: ${email}`)
    console.log(`📧 Code received: "${code}"`)

    // Validate code format (6 digits)
    const codeStr = code.toString().trim()
    
    if (!/^\d{6}$/.test(codeStr)) {
      return res.status(400).json({
        success: false,
        error: 'Verification code must be exactly 6 digits',
        code: 'INVALID_FORMAT',
        data: {
          received: codeStr,
          length: codeStr.length,
          isNumeric: /^\d+$/.test(codeStr)
        }
      })
    }

    // In a real scenario, you would:
    // 1. Look up the verification record in the database
    // 2. Check if the code matches and hasn't expired
    // 3. Mark the email as verified
    
    // For testing purposes, we'll simulate this
    console.log('✅ Code format validation passed')
    
    return res.status(200).json({
      success: true,
      message: 'Verification code format is valid',
      data: {
        email: email,
        code: codeStr,
        length: codeStr.length,
        format: 'valid',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Test verification API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    })
  }
}