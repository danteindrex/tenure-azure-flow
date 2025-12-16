import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export async function getTwilioStats() {
  try {
    if (!accountSid || !authToken) {
      return {
        connected: false,
        error: 'Twilio credentials not configured',
      };
    }

    const client = twilio(accountSid, authToken);

    // Get messages from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messages = await client.messages.list({
      dateSentAfter: thirtyDaysAgo,
      limit: 1000,
    });

    // Count by status
    const statusCounts = {
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
    };

    messages.forEach(msg => {
      if (msg.status === 'sent' || msg.status === 'delivered') {
        statusCounts.delivered++;
      } else if (msg.status === 'failed' || msg.status === 'undelivered') {
        statusCounts.failed++;
      } else if (msg.status === 'queued' || msg.status === 'sending') {
        statusCounts.pending++;
      }
      statusCounts.sent++;
    });

    // Get account balance
    const balance = await client.balance.fetch();

    return {
      connected: true,
      totalMessages: messages.length,
      delivered: statusCounts.delivered,
      failed: statusCounts.failed,
      pending: statusCounts.pending,
      balance: balance.balance,
      currency: balance.currency,
    };
  } catch (error) {
    console.error('Twilio stats error:', error);
    return {
      connected: false,
      error: 'Failed to fetch Twilio data',
    };
  }
}

export async function getTwilioChartData() {
  try {
    if (!accountSid || !authToken) {
      return [];
    }

    const client = twilio(accountSid, authToken);
    const monthlyData = [];

    // Get data for last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const messages = await client.messages.list({
        dateSentAfter: monthStart,
        dateSentBefore: monthEnd,
        limit: 1000,
      });

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        messages: messages.length,
      });
    }

    return monthlyData;
  } catch (error) {
    console.error('Twilio chart data error:', error);
    return [];
  }
}