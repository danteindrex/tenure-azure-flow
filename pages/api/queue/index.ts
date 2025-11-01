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

// Fallback function for direct database access
async function fallbackToDirectAccess(res: NextApiResponse) {
  try {
    // Import required schemas
    const { users, userProfiles, userPayments } = await import('@/drizzle/schema');
    const { sql, eq, asc } = await import('drizzle-orm');

    // Fetch queue data with user info using JOIN
    const enrichedQueueData = await db
      .select({
        id: membershipQueue.id,
        userId: membershipQueue.userId,
        queuePosition: membershipQueue.queuePosition,
        joinedQueueAt: membershipQueue.joinedQueueAt,
        isEligible: membershipQueue.isEligible,
        subscriptionActive: membershipQueue.subscriptionActive,
        totalMonthsSubscribed: membershipQueue.totalMonthsSubscribed,
        lifetimePaymentTotal: membershipQueue.lifetimePaymentTotal,
        lastPaymentDate: membershipQueue.lastPaymentDate,
        hasReceivedPayout: membershipQueue.hasReceivedPayout,
        createdAt: membershipQueue.createdAt,
        updatedAt: membershipQueue.updatedAt,
        // Get real user name from profile
        user_name: sql<string>`COALESCE(${userProfiles.firstName} || ' ' || ${userProfiles.lastName}, 'Member ' || ${membershipQueue.queuePosition})`,
        user_email: user.email,
        user_status: sql<string>`CASE WHEN ${membershipQueue.subscriptionActive} THEN 'Active' ELSE 'Inactive' END`,
        member_join_date: membershipQueue.joinedQueueAt
      })
      .from(membershipQueue)
      .innerJoin(user, eq(membershipQueue.userId, user.id))
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
      .orderBy(asc(membershipQueue.queuePosition));

    // Calculate statistics
    const activeMembers = enrichedQueueData.filter((user: any) => user.subscriptionActive).length;
    const eligibleMembers = enrichedQueueData.filter((user: any) => user.isEligible).length;
    const totalMembers = enrichedQueueData.length;

    // Calculate total revenue from payments table
    const totalRevenueResult = await db.select({
      total: sql<string>`COALESCE(SUM(${userPayments.amount}), 0)`
    })
    .from(userPayments)
    .where(eq(userPayments.status, 'completed'));

    const totalRevenue = Number(totalRevenueResult[0]?.total || 0);

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
          activeMembers,
          eligibleMembers,
          totalRevenue,
          potentialWinners,
          payoutThreshold: 100000, // BR-3: $100K minimum
          receivedPayouts: enrichedQueueData.filter((m: any) => m.hasReceivedPayout).length
        },
      },
    });
  } catch (error) {
    console.error('Fallback database access failed:', error);
    return res.status(500).json({ error: 'Failed to fetch queue data' });
  }
}