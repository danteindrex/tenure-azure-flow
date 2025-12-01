/**
 * SMTP Email Service for Subscription Service
 *
 * Handles email sending using SMTP with professional templates
 */

import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface WelcomeEmailOptions {
  to: string;
  name?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const smtpPort = process.env.SMTP_PORT?.trim() || '587';
    const smtpUser = process.env.SMTP_USER?.trim() || '';
    const smtpPass = process.env.SMTP_PASS?.trim() || '';

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Send generic email
   */
  async sendEmail({ to, subject, html, from }: EmailOptions) {
    try {
      const result = await this.transporter.sendMail({
        from: from || `${process.env.EMAIL_FROM_NAME || 'Home Solutions'} <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html
      });

      logger.info('Email sent successfully', { messageId: result.messageId, to });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Email send failed:', error);
      throw error;
    }
  }

  /**
   * Send welcome email after successful first payment
   */
  async sendWelcomeEmail({ to, name }: WelcomeEmailOptions) {
    const userName = name || 'Member';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@home-solutions.com';

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
            <p style="color: #666; margin: 5px 0 0 0;">Your membership is now active</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Congratulations, ${userName}!</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Your payment has been successfully processed and your membership is now <strong style="color: #10B981;">ACTIVE</strong>.
              You are now officially part of the Home Solutions community!
            </p>

            <!-- Success Box -->
            <div style="background-color: #ecfdf5; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
              <h3 style="color: #065f46; margin: 0 0 10px 0;">You're in the Queue!</h3>
              <p style="color: #047857; margin: 0; font-size: 14px;">
                Your position is based on your join date and payment history.
                Check your dashboard for real-time updates.
              </p>
            </div>

            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Here's what you can do now:
            </p>

            <!-- What's Next Steps -->
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
                          <strong style="color: #333;">View Your Dashboard</strong>
                          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">See your queue position, payment history, and membership stats.</p>
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
                          <strong style="color: #333;">Track the Prize Pool</strong>
                          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Watch as the community fund grows towards the $100,000 payout threshold.</p>
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
                          <div style="background-color: #10B981; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 14px;">3</div>
                        </td>
                        <td>
                          <strong style="color: #333;">Stay Subscribed</strong>
                          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Keep your membership active to maintain your queue position and eligibility.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard" style="
                display: inline-block;
                padding: 15px 40px;
                background-color: #10B981;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                font-size: 16px;
              ">Go to Your Dashboard</a>
            </div>

            <!-- Payment Summary -->
            <div style="background-color: #f0f9ff; border-left: 4px solid #0070f3; padding: 15px; margin: 25px 0;">
              <p style="color: #1e40af; margin: 0; font-size: 14px;">
                <strong>Payment Confirmed</strong><br>
                Your subscription includes monthly ($25/mo) and annual ($300/yr) payments.
                All future payments will be processed automatically.
              </p>
            </div>

            <!-- Support Info -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Need Help?</strong> Our support team is here for you. If you have any questions,
                feel free to reach out to us at <a href="mailto:${supportEmail}" style="color: #b45309;">${supportEmail}</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #eee; padding: 20px 0; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              Welcome to the community! Your journey to financial freedom starts now.
            </p>
            <p style="color: #999; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Home Solutions. All rights reserved.<br>
              This email was sent to ${to}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to Home Solutions - Your Membership is Active!',
      html
    });
  }
}

export const emailService = new EmailService();
export default EmailService;
