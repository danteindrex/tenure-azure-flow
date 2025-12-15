import { supabase } from '@/lib/supabase/client';

// Note: For SMTP, you need to log emails to your database when sending
// Create a table: email_logs (id, recipient, subject, status, sent_at, error)

export async function getEmailStats() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query your email logs table
    const { data: emailLogs, error } = await supabase
      .from('email_logs')
      .select('*')
      .gte('sent_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.warn('Email logs not available:', error);
      // Fallback: estimate based on user activity
      return await getEstimatedEmailStats();
    }

    // Count by status
    const statusCounts = {
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
    };

    emailLogs?.forEach(log => {
      if (log.status === 'sent' || log.status === 'delivered') {
        statusCounts.delivered++;
      } else if (log.status === 'failed') {
        statusCounts.failed++;
      } else if (log.status === 'pending') {
        statusCounts.pending++;
      }
      statusCounts.sent++;
    });

    return {
      connected: true,
      totalEmails: emailLogs?.length || 0,
      sent: statusCounts.sent,
      delivered: statusCounts.delivered,
      failed: statusCounts.failed,
      pending: statusCounts.pending,
    };
  } catch (error) {
    console.error('Email stats error:', error);
    return {
      connected: false,
      error: 'Failed to fetch email data',
    };
  }
}

// Fallback: Estimate email stats based on user activity
async function getEstimatedEmailStats() {
  const { data: users } = await supabase
    .from('users')
    .select('id, created_at');

  const totalUsers = users?.length || 0;
  const estimatedEmailsPerUser = 5; // Welcome, verification, notifications, etc.

  return {
    connected: true,
    totalEmails: totalUsers * estimatedEmailsPerUser,
    sent: totalUsers * estimatedEmailsPerUser,
    delivered: Math.floor(totalUsers * estimatedEmailsPerUser * 0.95),
    failed: Math.floor(totalUsers * estimatedEmailsPerUser * 0.03),
    pending: Math.floor(totalUsers * estimatedEmailsPerUser * 0.02),
    estimated: true,
  };
}

export async function getEmailChartData() {
  try {
    const { data: emailLogs } = await supabase
      .from('email_logs')
      .select('sent_at');

    if (!emailLogs || emailLogs.length === 0) {
      return [];
    }

    const monthlyData = [];

    // Get data for last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthEmails = emailLogs.filter(log => {
        const logDate = new Date(log.sent_at);
        return logDate >= monthStart && logDate <= monthEnd;
      });

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        emails: monthEmails.length,
      });
    }

    return monthlyData;
  } catch (error) {
    console.error('Email chart data error:', error);
    return [];
  }
}

// Helper function to log emails when sending
export async function logEmail(data: {
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
}) {
  try {
    await supabase.from('email_logs').insert({
      recipient: data.recipient,
      subject: data.subject,
      status: data.status,
      error: data.error,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}