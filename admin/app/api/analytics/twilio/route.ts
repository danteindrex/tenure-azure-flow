import { NextResponse } from 'next/server';
import { getTwilioAnalytics } from '@/lib/twilio/client';

export async function GET() {
  try {
    const analytics = await getTwilioAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching Twilio analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Twilio analytics',
        fallback: {
          totalMessages: 0,
          messageStats: { delivered: 0, failed: 0, pending: 0, sent: 0 },
          dailyMessages: [],
          costAnalysis: { totalCost: 0, averageCostPerMessage: 0 },
          verificationStats: { totalVerifications: 0, successfulVerifications: 0, failedVerifications: 0 }
        }
      },
      { status: 500 }
    );
  }
}