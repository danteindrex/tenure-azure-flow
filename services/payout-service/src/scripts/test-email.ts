/**
 * Test Email Script
 * 
 * Simple script to test SMTP email configuration
 * Run with: npm run test:email
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { sendEmail, emailTransporter } from '../config/email';
import { logger } from '../utils/logger';

async function testEmail() {
  try {
    logger.info('Testing SMTP email configuration...');

    // Verify SMTP connection
    await emailTransporter.verify();
    logger.info('✓ SMTP connection verified successfully');

    // Send test email
    const testRecipient = process.env.SMTP_USER || 'test@example.com';
    
    await sendEmail({
      to: testRecipient,
      subject: 'Test Email from Payout Service',
      html: `
        <h2>SMTP Configuration Test</h2>
        <p>This is a test email from the Payout Service.</p>
        <p>If you're receiving this, your SMTP configuration is working correctly!</p>
        <ul>
          <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
          <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
          <li><strong>From:</strong> ${process.env.EMAIL_FROM}</li>
        </ul>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
      text: `
SMTP Configuration Test

This is a test email from the Payout Service.
If you're receiving this, your SMTP configuration is working correctly!

- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- From: ${process.env.EMAIL_FROM}

Timestamp: ${new Date().toISOString()}
      `,
    });

    logger.info('✓ Test email sent successfully to:', testRecipient);
    logger.info('Check your inbox to confirm receipt');
    
    process.exit(0);
  } catch (error) {
    logger.error('✗ Email test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmail();
