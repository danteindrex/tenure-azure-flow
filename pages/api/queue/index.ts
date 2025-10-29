import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { membershipQueue } from '@/drizzle/schema/membership';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({ headers: req.headers });

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

// Fallback function for direct database access
async function fallbackToDirectAccess(res: NextApiResponse) {
  try {
    // Fetch queue data from database
    const queueData = await db.select().from(membershipQueue);

    // For now, return basic queue data
    // TODO: Enrich with user profile data when user tables are available
    const enrichedQueueData = queueData.map((item: any) => ({
      ...item,
      user_name: `User ${item.userId}`,
      user_email: '',
      user_status: item.isActive ? 'Active' : 'Inactive',
      member_join_date: item.createdAt || ''
    }));

    // Calculate statistics
    const activeMembers = queueData.filter((user: any) => user.isActive).length;
    const eligibleMembers = queueData.filter((user: any) => user.isEligible).length;
    const totalMembers = queueData.length;

    return res.status(200).json({
      success: true,
      data: {
        queue: enrichedQueueData,
        statistics: {
          totalMembers,
          activeMembers,
          eligibleMembers,
          totalRevenue: 0, // TODO: Calculate from payments table
          potentialWinners: Math.min(2, eligibleMembers),
          payoutThreshold: 500000,
          receivedPayouts: queueData.filter((m: any) => m.hasReceivedPayout).length
        },
      },
    });
  } catch (error) {
    console.error('Fallback database access failed:', error);
    return res.status(500).json({ error: 'Failed to fetch queue data' });
  }
}