import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { membershipQueue } from '@/drizzle/schema/membership';
import { user, userProfiles } from '@/drizzle/schema';

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
    const { search, limit, offset } = req.query;
    
    const searchParams = new URLSearchParams();
    if (search) searchParams.append('search', search as string);
    if (limit) searchParams.append('limit', limit as string);
    if (offset) searchParams.append('offset', offset as string);

    const queryString = searchParams.toString();
    const microserviceUrl = `${queueServiceUrl}/api/queue${queryString ? `?${queryString}` : ''}`;

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
    console.error('Queue API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Fallback function for direct database access using the view
async function fallbackToDirectAccess(res: NextApiResponse) {
  try {
    const { sql } = await import('drizzle-orm');

    // Query the active_member_queue_view directly
    const queueData = await db.execute(sql`
      SELECT * FROM active_member_queue_view
      ORDER BY queue_position ASC
    `);

    const enrichedQueueData = queueData.rows;

    // Calculate statistics from view data
    const totalMembers = enrichedQueueData.length;
    const eligibleMembers = enrichedQueueData.filter((m: any) => m.is_eligible).length;
    const totalRevenue = enrichedQueueData.reduce((sum: number, m: any) => 
      sum + parseFloat(m.lifetime_payment_total || 0), 0
    );

    // Calculate potential winners based on revenue
    const rewardPerWinner = 100000; // $100K per winner (BR-4)
    const potentialWinners = Math.min(
      Math.floor(totalRevenue / rewardPerWinner),
      eligibleMembers
    );

    return res.status(200).json({
      success: true,
      data: {
        queue: enrichedQueueData,
        statistics: {
          totalMembers,
          activeMembers: totalMembers, // All members in view are active
          eligibleMembers,
          totalRevenue,
          potentialWinners,
          payoutThreshold: 100000, // BR-3: $100K minimum
          receivedPayouts: enrichedQueueData.filter((m: any) => m.has_received_payout).length
        },
      },
    });
  } catch (error) {
    console.error('Fallback database access failed:', error);
    return res.status(500).json({ error: 'Failed to fetch queue data' });
  }
}