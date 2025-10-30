import nodemailer from 'nodemailer';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

console.log('🧪 Testing SMTP Connection...\n');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.log('Configuration:');
console.log(`Host: ${process.env.SMTP_HOST}`);
console.log(`Port: ${process.env.SMTP_PORT}`);
console.log(`User: ${process.env.SMTP_USER}`);
console.log(`From: ${process.env.EMAIL_FROM}`);
console.log(`Secure: ${process.env.SMTP_SECURE}`);
console.log('');

try {
  // Test connection
  console.log('📧 Verifying SMTP connection...');
  await transporter.verify();
  console.log('✅ SMTP connection verified!');
  
  // Send test email
  console.log('📧 Sending test email...');
  const result = await transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to: process.env.SMTP_USER,
    subject: '🎉 SMTP Test - Success!',
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
  });
  
  console.log('✅ Email sent successfully!');
  console.log(`   Message ID: ${result.messageId}`);
  console.log(`   Check your inbox at ${process.env.SMTP_USER}`);
  
} catch (error) {
  console.error('❌ SMTP test failed:', error.message);
  
  if (error.message.includes('535')) {
    console.log('\n💡 Gmail Authentication Error:');
    console.log('   1. Make sure 2-Factor Authentication is enabled on your Gmail account');
    console.log('   2. Generate a new App Password: https://myaccount.google.com/apppasswords');
    console.log('   3. Use the App Password (not your regular password) in SMTP_PASS');
    console.log('   4. Update .env.local with the new App Password');
  }
  
  if (error.message.includes('connection')) {
    console.log('\n💡 Connection Error:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify SMTP_HOST and SMTP_PORT settings');
    console.log('   3. Try using port 465 with SMTP_SECURE=true');
  }
  
  process.exit(1);
}