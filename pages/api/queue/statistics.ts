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

// Fallback function for direct database access
async function fallbackToDirectAccess(res: NextApiResponse) {
  try {
    // Fetch queue data from database
    const queueData = await db.select().from(membershipQueue);

    // Calculate total revenue from payments
    const payments = await db.select().from(userPayments).where(eq(userPayments.status, 'completed'));

    const totalRevenue = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

    // Calculate statistics
    const activeMembers = queueData.filter((user: any) => user.isActive).length;
    const eligibleMembers = queueData.filter((user: any) => user.isEligible).length;
    const totalMembers = queueData.length;

    return res.status(200).json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        eligibleMembers,
        totalRevenue,
        potentialWinners: Math.min(2, eligibleMembers),
        payoutThreshold: 500000,
        receivedPayouts: queueData.filter((m: any) => m.hasReceivedPayout).length
      },
    });
  } catch (error) {
    console.error('Fallback statistics calculation failed:', error);
    return res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
}