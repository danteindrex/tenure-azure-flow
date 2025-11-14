import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Load SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_TLS = process.env.SMTP_TLS !== 'false'; // Default to true
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Home Solutions';

// Validate required SMTP credentials
if (!SMTP_USER || !SMTP_PASS) {
  logger.error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
  throw new Error('SMTP credentials missing');
}

// Create reusable transporter object using SMTP transport
export const emailTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: SMTP_TLS ? {
    // Do not fail on invalid certs (useful for development)
    rejectUnauthorized: false,
  } : undefined,
});

// Verify SMTP connection configuration
emailTransporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP connection error:', error);
  } else {
    logger.info('SMTP server is ready to send emails');
  }
});

// Email configuration
export const emailConfig = {
  from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
  fromAddress: EMAIL_FROM,
  fromName: EMAIL_FROM_NAME,
};

// Helper function to send email
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    const info = await emailTransporter.sendMail({
      from: emailConfig.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    logger.info(`Email sent successfully: ${info.messageId}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}
