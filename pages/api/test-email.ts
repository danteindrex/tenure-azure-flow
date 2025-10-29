/**
 * Test Email API Endpoint
 * 
 * Tests SMTP email integration
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { emailService } from '@/lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      })
    }

    console.log(`📧 Testing SMTP email send to: ${email}`)

    // Verify SMTP connection first
    const connectionValid = await emailService.verifyConnection()
    if (!connectionValid) {
      return res.status(500).json({ 
        success: false,
        error: 'SMTP connection failed',
        details: 'Check your SMTP credentials'
      })
    }

    // Send test email using SMTP
    const result = await emailService.sendTestEmail(email)

    console.log('✅ Test email sent successfully!')

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully via SMTP!',
      messageId: result.messageId,
      provider: 'Gmail SMTP',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Test email failed:', error)
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
      details: 'Check server logs for more information'
    })
  }
}