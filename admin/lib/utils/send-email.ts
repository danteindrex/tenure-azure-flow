import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD, // Support both variable names
  },
});

export async function send2FAEmail(email: string, code: string, type: 'login' | 'setup') {
  const subject = type === 'login' 
    ? 'Your Login Verification Code' 
    : 'Your 2FA Setup Verification Code';
  
  const codeLength = type === 'login' ? '5-digit' : '6-digit';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; letter-spacing: 8px; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Home Solutions Admin</h1>
          </div>
          <div class="content">
            <h2>Verification Code</h2>
            <p>Your ${codeLength} verification code is:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Home Solutions. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Development mode: Log verification code to console (but still try to send email)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 DEVELOPMENT MODE - Verification Code for', email, ':', code);
    console.log('📧 Attempting to send email with subject:', subject);
  }

  try {
    await transporter.sendMail({
      from: `"Home Solutions Admin" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    
    // Fallback: Log the code to console even in production if email fails
    console.log('🔑 EMAIL FAILED - Verification Code for', email, ':', code);
    console.log('📧 Use this code to continue:', code);
    
    return { success: false, error };
  }
}
