import { NextResponse } from 'next/server';
import { microserviceClient } from '@/lib/microservices/client';

export async function GET() {
  try {
    const [queueStats, subscriptionStats] = await Promise.all([
      microserviceClient.getQueueStats(),
      microserviceClient.getSubscriptionStats()
    ]);

    return NextResponse.json({
      queue: queueStats,
      subscription: subscriptionStats
    });
  } catch (error) {
    console.error('Error fetching microservice stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch microservice stats' },
      { status: 500 }
    );
  }
}