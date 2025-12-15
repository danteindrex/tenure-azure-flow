import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface EmailAnalytics {
  totalEmails: number;
  emailStats: {
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
  };
  dailyEmails: Array<{ date: string; count: number; success: number; failed: number }>;
  emailTypes: Array<{ type: string; count: number; successRate: number }>;
  topRecipients: Array<{ email: string; count: number }>;
}

// Create transporter for testing connection
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export async function getEmailAnalytics(): Promise<EmailAnalytics> {
  try {
    // In a real implementation, you would fetch this data from your email logs table
    // For now, we'll simulate data based on user activity and provide a structure
    // that can be populated with real data from your email logging system

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get users to simulate email activity
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('email, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.warn('Could not fetch users for email analytics:', error);
    }

    // Simulate email analytics based on user activity
    const totalUsers = users?.length || 0;
    const estimatedEmailsPerUser = 5; // Welcome, verification, notifications, etc.
    
    const emailStats = {
      sent: totalUsers * estimatedEmailsPerUser,
      delivered: Math.floor(totalUsers * estimatedEmailsPerUser * 0.95), // 95% delivery rate
      failed: Math.floor(totalUsers * estimatedEmailsPerUser * 0.03), // 3% failure rate
      pending: Math.floor(totalUsers * estimatedEmailsPerUser * 0.02), // 2% pending
    };

    // Generate daily email stats for the last 7 days
    const dailyEmails = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dailyCount = Math.floor(Math.random() * 50) + 10; // Random between 10-60
      
      dailyEmails.push({
        date: date.toISOString().split('T')[0],
        count: dailyCount,
        success: Math.floor(dailyCount * 0.95),
        failed: Math.floor(dailyCount * 0.05)
      });
    }

    // Email types breakdown
    const emailTypes = [
      { type: 'Welcome', count: Math.floor(totalUsers * 0.8), successRate: 98 },
      { type: 'Verification', count: Math.floor(totalUsers * 1.2), successRate: 96 },
      { type: 'Password Reset', count: Math.floor(totalUsers * 0.3), successRate: 97 },
      { type: 'Notifications', count: Math.floor(totalUsers * 2.5), successRate: 94 },
      { type: 'Marketing', count: Math.floor(totalUsers * 1.5), successRate: 92 },
    ];

    // Top recipients (anonymized)
    const topRecipients = users?.slice(0, 10).map((user, index) => ({
      email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Anonymize email
      count: Math.floor(Math.random() * 10) + 5
    })) || [];

    return {
      totalEmails: emailStats.sent,
      emailStats,
      dailyEmails,
      emailTypes,
      topRecipients
    };
  } catch (error) {
    console.error('Error fetching email analytics:', error);
    
    // Return fallback data
    return {
      totalEmails: 0,
      emailStats: { sent: 0, delivered: 0, failed: 0, pending: 0 },
      dailyEmails: [],
      emailTypes: [],
      topRecipients: []
    };
  }
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}