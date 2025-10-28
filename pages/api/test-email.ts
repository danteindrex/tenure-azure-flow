/**
 * Test Email API
 * 
 * POST /api/test-email
 * Tests Resend email integration
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

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

    console.log(`📧 Testing email send to: ${email}`)

    // Send test email using Resend
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: '🧪 Test Email - Tenure Email Integration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">✅ Email Integration Test</h1>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #28a745; margin-top: 0;">Success!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Your Resend email integration is working correctly! 🎉
            </p>
            <ul style="color: #666; line-height: 1.6;">
              <li><strong>Sender:</strong> ${process.env.EMAIL_FROM || 'onboarding@resend.dev'}</li>
              <li><strong>Recipient:</strong> ${email}</li>
              <li><strong>Service:</strong> Resend API</li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1976d2;">
              <strong>Next Steps:</strong> Your signup email verification should now work properly!
            </p>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; text-align: center;">
            This is a test email from your Tenure application.<br>
            If you received this, your email integration is configured correctly.
          </p>
        </div>
      `
    })

    console.log('✅ Email sent successfully:', result)

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully!',
      data: {
        id: result.data?.id,
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject: '🧪 Test Email - Tenure Email Integration'
      }
    })

  } catch (error: any) {
    console.error('❌ Email test failed:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
      details: error.response?.body || error
    })
  }
}