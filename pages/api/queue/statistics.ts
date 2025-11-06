import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { membershipQueue } from '@/drizzle/schema/membership';
import { userPayments } from '@/drizzle/schema/financial';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({ 
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Forward request to queue microservice first
    const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3001';
    const microserviceUrl = `${queueServiceUrl}/api/queue/statistics`;

    try {
      const response = await fetch(microserviceUrl, {
        headers: {
          'Authorization': `Bearer ${session.user.id}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json(data);
      }
    } catch (microserviceError) {
      console.warn('Queue microservice unavailable, falling back to direct database access');
    }

    // Fallback to direct database access
    return await fallbackToDirectAccess(res);

  } catch (error) {
    console.error('Queue statistics API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Fallback function for direct database access using the view
async function fallbackToDirectAccess(res: NextApiResponse) {
  try {
    const { sql } = await import('drizzle-orm');

    // Query statistics directly from the view using helper function
    const statsResult = await db.execute(sql`SELECT * FROM get_queue_statistics()`);
    const stats = statsResult.rows[0] as any;

    // Calculate potential winners based on revenue
    const rewardPerWinner = 100000; // $100K per winner (BR-4)
    const potentialWinners = Math.min(
      Math.floor(Number(stats.total_revenue) / rewardPerWinner),
      Number(stats.eligible_members)
    );

    return res.status(200).json({
      success: true,
      data: {
        totalMembers: Number(stats.total_members),
        activeMembers: Number(stats.total_members), // All members in view are active
        eligibleMembers: Number(stats.eligible_members),
        totalRevenue: Number(stats.total_revenue),
        potentialWinners,
        payoutThreshold: 100000, // BR-3: $100K minimum
        receivedPayouts: 0, // Past winners are excluded from view
        oldestMemberDate: stats.oldest_member_date,
        newestMemberDate: stats.newest_member_date
      },
    });
  } catch (error) {
    console.error('Fallback statistics calculation failed:', error);
    return res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
}