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

    // Fetch member data to enrich queue data
    const memberIds = queueData?.map(q => q.memberid) || [];
    const { data: members } = await supabase
      .from('member')
      .select('id, name, email, status, join_date')
      .in('id', memberIds);

    // Enrich queue data with member information
    const enrichedQueueData = queueData?.map(item => {
      const member = members?.find(m => m.id === item.memberid);
      return {
        ...item,
        member: member || null
      };
    }) || [];

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
    const activeMembers = enrichedQueueData?.filter(member => member.subscription_active).length || 0;
    const eligibleMembers = enrichedQueueData?.filter(member => member.is_eligible).length || 0;
    const totalMembers = enrichedQueueData?.length || 0;

    return res.status(200).json({
      success: true,
      data: {
        queue: enrichedQueueData || [],
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