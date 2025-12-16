import { NextResponse } from 'next/server';
import { getStripeAnalytics } from '@/lib/stripe/client';

export async function GET() {
  try {
    const analytics = await getStripeAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching Stripe analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Stripe analytics',
        fallback: {
          totalRevenue: 0,
          monthlyRevenue: [],
          subscriptionStats: { active: 0, canceled: 0, pastDue: 0, trialing: 0 },
          topPlans: [],
          churnRate: 0,
          mrr: 0
        }
      },
      { status: 500 }
    );
  }
}