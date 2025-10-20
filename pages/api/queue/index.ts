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

    // Fetch real queue data from database
    const { data: queueData, error: queueError } = await supabase
      .from('queue')
      .select('*')
      .order('queue_position', { ascending: true });

    if (queueError) {
      console.error('Error fetching queue data:', queueError);
      return res.status(500).json({ error: 'Failed to fetch queue data' });
    }

    // Calculate total revenue from payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payment')
      .select('amount')
      .eq('status', 'Completed');

    let totalRevenue = 0;
    if (!paymentsError && payments) {
      totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }

    // Calculate statistics
    const activeMembers = queueData?.filter(member => member.subscription_active).length || 0;
    const eligibleMembers = queueData?.filter(member => member.is_eligible).length || 0;
    const totalMembers = queueData?.length || 0;

    return res.status(200).json({
      success: true,
      data: {
        queue: queueData || [],
        statistics: {
          totalMembers,
          activeMembers,
          eligibleMembers,
          totalRevenue,
          potentialWinners: Math.min(2, eligibleMembers),
        },
      },
    });
  } catch (error) {
    console.error('Queue API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}