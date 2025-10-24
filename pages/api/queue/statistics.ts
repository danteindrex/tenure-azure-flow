import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get auth token for microservice
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      return res.status(401).json({ error: 'No valid session token' });
    }

    // Forward request to queue microservice
    const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3001';
    const microserviceUrl = `${queueServiceUrl}/api/queue/statistics`;

    const response = await fetch(microserviceUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Fallback to direct database access if microservice is unavailable
      console.warn('Queue microservice unavailable, falling back to direct database access');
      return await fallbackToDirectAccess(supabase, res);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Queue statistics API error:', error);
    
    // Fallback to direct database access on any error
    try {
      const supabase = createServerSupabaseClient({ req, res });
      return await fallbackToDirectAccess(supabase, res);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Fallback function for direct database access
async function fallbackToDirectAccess(supabase: any, res: NextApiResponse) {
  try {
    // Fetch queue data from database
    const { data: queueData, error: queueError } = await supabase
      .from('membership_queue')
      .select('*')
      .order('queue_position', { ascending: true });

    if (queueError) {
      throw queueError;
    }

    // Calculate total revenue from payments
    const { data: payments, error: paymentsError } = await supabase
      .from('user_payments')
      .select('amount')
      .eq('status', 'completed');

    let totalRevenue = 0;
    if (!paymentsError && payments) {
      totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }

    // Calculate statistics
    const activeMembers = queueData?.filter(user => user.is_active).length || 0;
    const eligibleMembers = queueData?.filter(user => user.is_eligible).length || 0;
    const totalMembers = queueData?.length || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        eligibleMembers,
        totalRevenue,
        potentialWinners: Math.min(2, eligibleMembers),
        payoutThreshold: 500000,
        receivedPayouts: queueData?.filter(m => m.has_received_payout).length || 0
      },
    });
  } catch (error) {
    console.error('Fallback statistics calculation failed:', error);
    return res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
}