import { NextResponse } from 'next/server';
import { getEmailAnalytics } from '@/lib/email/analytics';

export async function GET() {
  try {
    const analytics = await getEmailAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching email analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch email analytics',
        fallback: {
          totalEmails: 0,
          emailStats: { sent: 0, delivered: 0, failed: 0, pending: 0 },
          dailyEmails: [],
          emailTypes: [],
          topRecipients: []
        }
      },
      { status: 500 }
    );
  }
}