/**
 * Test Email to Trevor
 * 
 * Sends a test email to trevorsdanny@gmail.com to verify SMTP configuration
 */

import { config } from 'dotenv'
import { resolve } from 'path'

async function sendTestEmailToTrevor() {
  // Load environment variables
  config({ path: resolve(process.cwd(), '.env.local') })
  
  console.log('📧 Sending test email to trevorsdanny@gmail.com...\n')
  
  try {
    // Check SMTP configuration
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']
    const missing = requiredVars.filter(varName => !process.env[varName])
    
    if (missing.length > 0) {
      console.error('❌ Missing SMTP environment variables:', missing.join(', '))
      process.exit(1)
    }
    
    console.log('✅ SMTP configuration found')
    console.log(`   From: ${process.env.EMAIL_FROM}`)
    console.log(`   Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)
    
    // Import email service
    const { emailService } = await import('../src/lib/email.ts')
    
    // Test SMTP connection first
    console.log('\n🔗 Testing SMTP connection...')
    const connectionValid = await emailService.verifyConnection()
    
    if (!connectionValid) {
      console.error('❌ SMTP connection failed!')
      console.error('💡 Check your Gmail app password and settings')
      process.exit(1)
    }
    
    console.log('✅ SMTP connection verified!')
    
    // Send test email
    console.log('\n📨 Sending test email...')
    
    const result = await emailService.sendEmail({
      to: 'trevorsdanny@gmail.com',
      subject: '🎉 SMTP Test - Tenure Email System Working!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SMTP Test - Tenure</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
            <!-- Header -->
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0070f3;">
              <h1 style="color: #0070f3; margin: 0; font-size: 28px;">🎉 Tenure</h1>
              <p style="color: #666; margin: 5px 0 0 0;">SMTP Email System Test</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 0;">
              <h2 style="color: #333; margin: 0 0 20px 0;">Email System Migration Successful!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">
                Hi Trevor! 👋
              </p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">
                This email confirms that our migration from Resend to Gmail SMTP is working perfectly! 
                The Tenure email system is now fully operational with the new configuration.
              </p>
              
              <!-- Success Box -->
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #155724; margin: 0 0 15px 0;">✅ Migration Complete</h3>
                <ul style="color: #155724; margin: 0; padding-left: 20px;">
                  <li>Gmail SMTP configured and working</li>
                  <li>OTP email templates ready</li>
                  <li>Email verification system operational</li>
                  <li>Password reset emails functional</li>
                </ul>
              </div>
              
              <!-- Technical Details -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #0070f3; padding: 15px; margin: 25px 0;">
                <h4 style="color: #333; margin: 0 0 10px 0;">Technical Details:</h4>
                <p style="color: #666; margin: 0; font-size: 14px; font-family: 'Courier New', monospace;">
                  <strong>From:</strong> ${process.env.EMAIL_FROM}<br>
                  <strong>SMTP Host:</strong> ${process.env.SMTP_HOST}<br>
                  <strong>Port:</strong> ${process.env.SMTP_PORT}<br>
                  <strong>Security:</strong> TLS Enabled<br>
                  <strong>Sent:</strong> ${new Date().toISOString()}
                </p>
              </div>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 25px 0 0 0;">
                The system is now ready for production use! Users will receive properly formatted 
                verification codes and password reset emails through our Gmail SMTP service.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding: 20px 0; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This test email was sent by the Tenure email system<br>
                Migration from Resend to Gmail SMTP completed successfully
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })
    
    console.log('✅ Email sent successfully!')
    console.log(`   Message ID: ${result.messageId}`)
    console.log(`   Recipient: trevorsdanny@gmail.com`)
    
    // Also send OTP template examples
    console.log('\n🔐 Sending OTP template examples...')
    
    // Send verification email template
    await emailService.sendVerificationEmail({
      to: 'trevorsdanny@gmail.com',
      token: '123456',
      url: 'https://tenure.com/verify?token=123456'
    })
    
    console.log('✅ Verification email template sent!')
    
    // Send password reset email template
    await emailService.sendPasswordResetEmail({
      to: 'trevorsdanny@gmail.com',
      token: '789012',
      url: 'https://tenure.com/reset?token=789012'
    })
    
    console.log('✅ Password reset email template sent!')
    
    console.log('\n🎯 Test completed successfully!')
    console.log('📧 Trevor should receive 3 emails:')
    console.log('   1. SMTP test confirmation')
    console.log('   2. Email verification template (OTP: 123456)')
    console.log('   3. Password reset template (OTP: 789012)')
    
    console.log('\n💡 The SMTP migration is working perfectly!')
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message)
    
    if (error.message.includes('authentication') || error.message.includes('535')) {
      console.log('\n💡 Gmail Authentication Issue:')
      console.log('   - Make sure you\'re using the correct App Password')
      console.log('   - Verify 2-Factor Authentication is enabled on Gmail')
      console.log('   - Check that the app password hasn\'t expired')
    }
    
    if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection Issue:')
      console.log('   - Check internet connection')
      console.log('   - Verify SMTP settings: smtp.gmail.com:587')
      console.log('   - Ensure TLS is enabled')
    }
    
    process.exit(1)
  }
}

sendTestEmailToTrevor().catch(console.error)