/**
 * SMTP Email Service
 * 
 * Handles email sending using Gmail SMTP with proper OTP templates
 * Replaces Resend functionality
 */

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

interface OTPEmailOptions {
  to: string
  token: string
  url?: string
  type: 'verification' | 'reset'
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com'
    const smtpPort = process.env.SMTP_PORT?.trim() || '587'
    const smtpUser = process.env.SMTP_USER?.trim() || ''
    const smtpPass = process.env.SMTP_PASS?.trim() || ''

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: process.env.SMTP_SECURE === 'true', // false for 587, true for 465
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }

  /**
   * Send generic email
   */
  async sendEmail({ to, subject, html, from }: EmailOptions) {
    try {
      const result = await this.transporter.sendMail({
        from: from || `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html
      })
      
      console.log('✅ Email sent successfully:', result.messageId)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('❌ Email send failed:', error)
      throw error
    }
  }

  /**
   * Send email verification OTP
   */
  async sendVerificationEmail({ to, token, url }: Omit<OTPEmailOptions, 'type'>) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Home Solutions</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <!-- Header -->
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0070f3;">
            <h1 style="color: #0070f3; margin: 0; font-size: 28px;">Home Solutions</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Secure Email Verification</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Verify Your Email Address</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">
              Welcome to Home Solutions! Please verify your email address to complete your account setup.
            </p>
            
            <!-- OTP Code Box -->
            <div style="background-color: #f8f9fa; border: 2px dashed #0070f3; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;">Your verification code:</p>
              <div style="font-size: 32px; font-weight: bold; color: #0070f3; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                ${token}
              </div>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">This code expires in 10 minutes</p>
            </div>
            
            ${url ? `
            <!-- Verify Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="
                display: inline-block;
                padding: 15px 30px;
                background-color: #0070f3;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
              ">Verify Email Address</a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin: 20px 0;">
              Or copy and paste this link in your browser:<br>
              <a href="${url}" style="color: #0070f3; word-break: break-all;">${url}</a>
            </p>
            ` : ''}
            
            <!-- Security Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Security Notice:</strong> If you didn't request this verification, please ignore this email. 
                Never share your verification code with anyone.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="border-top: 1px solid #eee; padding: 20px 0; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This email was sent by Home Solutions<br>
              If you have questions, contact our support team.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to,
      subject: `Verify your email - Code: ${token}`,
      html
    })
  }

  /**
   * Send password reset OTP
   */
  async sendPasswordResetEmail({ to, token, url }: Omit<OTPEmailOptions, 'type'>) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Home Solutions</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <!-- Header -->
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #dc3545;">
            <h1 style="color: #dc3545; margin: 0; font-size: 28px;">Home Solutions</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Password Reset Request</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Reset Your Password</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">
              We received a request to reset your password. Use the code below to create a new password.
            </p>
            
            <!-- OTP Code Box -->
            <div style="background-color: #fff5f5; border: 2px dashed #dc3545; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;">Your reset code:</p>
              <div style="font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                ${token}
              </div>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 12px;">This code expires in 15 minutes</p>
            </div>
            
            ${url ? `
            <!-- Reset Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="
                display: inline-block;
                padding: 15px 30px;
                background-color: #dc3545;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
              ">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin: 20px 0;">
              Or copy and paste this link in your browser:<br>
              <a href="${url}" style="color: #dc3545; word-break: break-all;">${url}</a>
            </p>
            ` : ''}
            
            <!-- Security Notice -->
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 25px 0;">
              <p style="color: #721c24; margin: 0; font-size: 14px;">
                <strong>Security Alert:</strong> If you didn't request this password reset, please ignore this email 
                and consider changing your password immediately. Never share your reset code with anyone.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="border-top: 1px solid #eee; padding: 20px 0; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This email was sent by Home Solutions<br>
              If you have questions, contact our support team.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to,
      subject: `Reset your password - Code: ${token}`,
      html
    })
  }

  /**
   * Send welcome/registration confirmation email
   */
  async sendWelcomeEmail({ to, name }: { to: string; name?: string }) {
    const userName = name || 'Member';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Home Solutions!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <!-- Header -->
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #10B981;">
            <h1 style="color: #10B981; margin: 0; font-size: 28px;">Welcome to Home Solutions!</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Your journey to financial freedom starts now</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Hello ${userName}!</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for joining Home Solutions! We're thrilled to have you as part of our community.
            </p>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Your account has been successfully created. Here's what happens next:
            </p>

            <!-- Steps -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 15px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <div style="background-color: #10B981; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 14px;">1</div>
                        </td>
                        <td>
                          <strong style="color: #333;">Verify Your Email</strong>
                          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Check your inbox for the verification code we sent.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 15px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <div style="background-color: #10B981; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 14px;">2</div>
                        </td>
                        <td>
                          <strong style="color: #333;">Complete Your Profile</strong>
                          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Add your personal details to get started.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 15px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <div style="background-color: #10B981; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 14px;">3</div>
                        </td>
                        <td>
                          <strong style="color: #333;">Verify Your Phone</strong>
                          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Secure your account with phone verification.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <div style="background-color: #10B981; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 14px;">4</div>
                        </td>
                        <td>
                          <strong style="color: #333;">Subscribe & Join the Queue</strong>
                          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Choose your plan and start your journey!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/signup" style="
                display: inline-block;
                padding: 15px 40px;
                background-color: #10B981;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
              ">Continue Your Registration</a>
            </div>

            <!-- Benefits Box -->
            <div style="background-color: #ecfdf5; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px;">What You'll Get as a Member:</h3>
              <ul style="color: #047857; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Priority queue position based on tenure</li>
                <li>Chance to win $100,000 payout</li>
                <li>Real-time dashboard tracking</li>
                <li>Secure payment processing</li>
                <li>24/7 account access</li>
              </ul>
            </div>

            <!-- Support Info -->
            <div style="background-color: #f0f9ff; border-left: 4px solid #0070f3; padding: 15px; margin: 25px 0;">
              <p style="color: #1e40af; margin: 0; font-size: 14px;">
                <strong>Need Help?</strong> Our support team is here for you. If you have any questions about getting started,
                feel free to reach out to us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@home-solutions.com'}" style="color: #0070f3;">${process.env.SUPPORT_EMAIL || 'support@home-solutions.com'}</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #eee; padding: 20px 0; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              Welcome aboard! We're excited to have you join our community.
            </p>
            <p style="color: #999; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Home Solutions. All rights reserved.<br>
              This email was sent to ${to}
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to,
      subject: 'Welcome to Home Solutions - Registration Successful!',
      html
    })
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify()
      console.log('✅ SMTP connection verified')
      return true
    } catch (error) {
      console.error('❌ SMTP connection failed:', error)
      return false
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string = process.env.SMTP_USER!) {
    return this.sendEmail({
      to,
      subject: '🎉 SMTP Test - Home Solutions Email Service',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0070f3;">🎉 SMTP Email Service Working!</h1>
          <p>Your Gmail SMTP configuration is working correctly.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Configuration:</strong><br>
            Host: ${process.env.SMTP_HOST}<br>
            Port: ${process.env.SMTP_PORT}<br>
            User: ${process.env.SMTP_USER}<br>
            From: ${process.env.EMAIL_FROM}
          </div>
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `
    })
  }
}

export const emailService = new EmailService()
export default EmailService