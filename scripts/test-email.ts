/**
 * Test Email Script
 * 
 * This script directly tests the Resend email integration
 * Usage: npx tsx scripts/test-email.ts
 */

import * as dotenv from 'dotenv'
import { Resend } from 'resend'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testEmail() {
  console.log('📧 Testing Resend email integration...')
  
  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in .env.local')
      process.exit(1)
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // Test email details - must use your verified Resend email
    const testEmail = 'trevorsdanny@gmail.com' // Your verified Resend email
    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
    
    console.log(`📤 Sending test email...`)
    console.log(`   From: ${fromEmail}`)
    console.log(`   To: ${testEmail}`)
    
    // Send test email
    const result = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: '🧪 Tenure Email Integration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">✅ Email Integration Test Successful!</h1>
          <p style="color: #666; font-size: 16px;">
            Your Resend email integration is working correctly! 🎉
          </p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Configuration:</strong><br>
            • Sender: ${fromEmail}<br>
            • Service: Resend API<br>
            • Time: ${new Date().toISOString()}
          </div>
          <p style="color: #28a745;">
            <strong>✓ Your signup email verification should now work!</strong>
          </p>
        </div>
      `
    })

    if (result.data) {
      console.log('✅ Email sent successfully!')
      console.log(`   Email ID: ${result.data.id}`)
      console.log(`   Status: Delivered to Resend`)
      console.log('')
      console.log('🎉 Email integration is working correctly!')
      console.log('📱 Check your inbox for the test email.')
    } else {
      console.error('❌ Email sending failed - no data returned')
      console.error('Response:', result)
    }

  } catch (error: any) {
    console.error('❌ Email test failed:')
    console.error('Error:', error.message)
    
    if (error.response) {
      console.error('Response:', error.response.body)
    }
    
    // Common error messages
    if (error.message.includes('API key')) {
      console.log('\n💡 Tip: Check your RESEND_API_KEY in .env.local')
    }
    if (error.message.includes('domain')) {
      console.log('\n💡 Tip: Make sure you\'re using onboarding@resend.dev for testing')
    }
    
    process.exit(1)
  }
}

testEmail()