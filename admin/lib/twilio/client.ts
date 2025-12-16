import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export interface TwilioAnalytics {
  totalMessages: number;
  messageStats: {
    delivered: number;
    failed: number;
    pending: number;
    sent: number;
  };
  dailyMessages: Array<{ date: string; count: number; delivered: number; failed: number }>;
  costAnalysis: {
    totalCost: number;
    averageCostPerMessage: number;
  };
  verificationStats: {
    totalVerifications: number;
    successfulVerifications: number;
    failedVerifications: number;
  };
}

export async function getTwilioAnalytics(): Promise<TwilioAnalytics> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get messages from the last 30 days
    const messages = await client.messages.list({
      dateSentAfter: thirtyDaysAgo,
      limit: 1000
    });

    // Calculate message stats
    const messageStats = {
      delivered: messages.filter(msg => msg.status === 'delivered').length,
      failed: messages.filter(msg => msg.status === 'failed').length,
      pending: messages.filter(msg => msg.status === 'queued' || msg.status === 'sending').length,
      sent: messages.filter(msg => msg.status === 'sent').length,
    };

    // Calculate daily message stats
    const dailyStats = new Map();
    messages.forEach(msg => {
      if (msg.dateSent) {
        const date = msg.dateSent.toISOString().split('T')[0];
        const existing = dailyStats.get(date) || { count: 0, delivered: 0, failed: 0 };
        dailyStats.set(date, {
          count: existing.count + 1,
          delivered: existing.delivered + (msg.status === 'delivered' ? 1 : 0),
          failed: existing.failed + (msg.status === 'failed' ? 1 : 0)
        });
      }
    });

    const dailyMessages = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 days

    // Calculate cost analysis
    const totalCost = messages.reduce((sum, msg) => {
      // Twilio SMS pricing is approximately $0.0075 per message
      return sum + (msg.price ? Math.abs(parseFloat(msg.price)) : 0.0075);
    }, 0);

    const costAnalysis = {
      totalCost,
      averageCostPerMessage: messages.length > 0 ? totalCost / messages.length : 0
    };

    // Get verification stats if verify service is configured
    let verificationStats = {
      totalVerifications: 0,
      successfulVerifications: 0,
      failedVerifications: 0
    };

    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      try {
        // Note: Twilio Verify API doesn't provide historical verification data
        // In a real implementation, you'd store verification attempts in your database
        verificationStats = {
          totalVerifications: 0,
          successfulVerifications: 0,
          failedVerifications: 0
        };
      } catch (error) {
        console.warn('Could not fetch verification stats:', error);
      }
    }

    return {
      totalMessages: messages.length,
      messageStats,
      dailyMessages,
      costAnalysis,
      verificationStats
    };
  } catch (error) {
    console.error('Error fetching Twilio analytics:', error);
    throw error;
  }
}

export { client as twilioClient };