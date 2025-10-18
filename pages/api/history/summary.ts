import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { logError } from '../../../src/lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get activity counts
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activity_history')
      .select('status')
      .eq('user_id', user.id);

    if (activitiesError) {
      console.error('Error fetching activity summary:', activitiesError);
      await logError(`Error fetching activity summary: ${activitiesError.message}`, user.id);
      return res.status(500).json({ error: 'Failed to fetch activity summary' });
    }

    // Get transaction summary
    const { data: transactions, error: transactionsError } = await supabase
      .from('transaction_history')
      .select('amount, status')
      .eq('user_id', user.id);

    if (transactionsError) {
      console.error('Error fetching transaction summary:', transactionsError);
      await logError(`Error fetching transaction summary: ${transactionsError.message}`, user.id);
    }

    // Calculate summary statistics
    const total_activities = activities?.length || 0;
    const completed_activities = activities?.filter(a => a.status === 'completed').length || 0;
    const failed_activities = activities?.filter(a => a.status === 'failed').length || 0;
    const total_transactions = transactions?.length || 0;
    const total_amount = transactions
      ?.filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    // Get recent activities (last 10)
    const { data: recentActivities, error: recentError } = await supabase
      .from('user_activity_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent activities:', recentError);
      await logError(`Error fetching recent activities: ${recentError.message}`, user.id);
    }

    res.status(200).json({
      total_activities,
      completed_activities,
      failed_activities,
      total_transactions,
      total_amount,
      recent_activities: recentActivities || []
    });

  } catch (error: any) {
    console.error('Error in history summary API:', error);
    await logError(`Error in history summary API: ${error.message}`, 'system');
    res.status(500).json({ error: 'Internal server error' });
  }
}
