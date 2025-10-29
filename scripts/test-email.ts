/**
 * Test SMTP Email Script
 * 
 * Tests Gmail SMTP email functionality
 */

import { config } from 'dotenv'
import { resolve } from 'path'

async function testEmail() {
  // Load environment variables
  config({ path: resolve(process.cwd(), '.env.local') })
  
  console.log('🧪 Testing SMTP Email Integration...\n')
  
  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ SMTP credentials not found in .env.local')
      console.error('Required: SMTP_HOST, SMTP_USER, SMTP_PASS')
      process.exit(1)
    }

    // Initialize Email Service
    const { emailService } = await import('../src/lib/email')
    
    // Test email details
    const testEmail = 'nakisisageorge@gmail.com'
    
    console.log('📧 Testing SMTP connection...')
    const connectionValid = await emailService.verifyConnection()
    
    if (!connectionValid) {
      console.error('❌ SMTP connection failed!')
      console.error('💡 Check your SMTP credentials in .env.local')
      process.exit(1)
    }
    
    console.log('✅ SMTP connection verified!')
    console.log('📧 Sending test email...')
    console.log(`   From: ${process.env.EMAIL_FROM}`)
    console.log(`   To: ${testEmail}`)
    
    const result = await emailService.sendTestEmail(testEmail)

    console.log('✅ Email sent successfully!')
    console.log(`   Message ID: ${result.messageId}`)
    console.log(`   Check your inbox at ${testEmail}`)
    
    // Test OTP email templates
    console.log('\n📧 Testing OTP email templates...')
    
    // Test verification email
    await emailService.sendVerificationEmail({
      to: testEmail,
      token: '123456',
      url: 'https://example.com/verify?token=123456'
    })
    
    console.log('✅ Verification email template sent!')
    
    // Test password reset email
    await emailService.sendPasswordResetEmail({
      to: testEmail,
      token: '789012',
      url: 'https://example.com/reset?token=789012'
    })
    
    console.log('✅ Password reset email template sent!')
    
    console.log('\n🎯 All email tests completed successfully!')
    console.log('📧 Check your inbox for:')
    console.log('   1. SMTP test email')
    console.log('   2. Email verification template (with OTP: 123456)')
    console.log('   3. Password reset template (with OTP: 789012)')
    
  } catch (error: any) {
    console.error('❌ Email test failed:', error.message)
    
    // Common error messages
    if (error.message.includes('authentication')) {
      console.log('\n💡 Tip: Check your Gmail app password in .env.local')
      console.log('   Make sure you\'re using an app password, not your regular password')
    }
    if (error.message.includes('connection')) {
      console.log('\n💡 Tip: Check your SMTP host and port settings')
      console.log('   Gmail SMTP: smtp.gmail.com:587')
    }
    
    process.exit(1)
  }
}

testEmail().catch(console.error)