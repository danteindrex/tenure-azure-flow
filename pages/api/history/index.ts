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

    const { 
      limit = '50', 
      offset = '0', 
      activity_type, 
      status, 
      start_date, 
      end_date 
    } = req.query;

    // Build query for user activity history
    let query = supabase
      .from('user_activity_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (activity_type) {
      query = query.eq('activity_type', activity_type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: activities, error: activitiesError } = await query;

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      await logError(`Error fetching activities: ${activitiesError.message}`, user.id);
      return res.status(500).json({ error: 'Failed to fetch activities' });
    }

    // Get transaction history
    const { data: transactions, error: transactionsError } = await supabase
      .from('transaction_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      await logError(`Error fetching transactions: ${transactionsError.message}`, user.id);
    }

    // Get queue history
    const { data: queueChanges, error: queueError } = await supabase
      .from('queue_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (queueError) {
      console.error('Error fetching queue changes:', queueError);
      await logError(`Error fetching queue changes: ${queueError.message}`, user.id);
    }

    // Get milestone history (public)
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestone_history')
      .select('*')
      .order('achieved_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
      await logError(`Error fetching milestones: ${milestonesError.message}`, user.id);
    }

    res.status(200).json({
      activities: activities || [],
      transactions: transactions || [],
      queue_changes: queueChanges || [],
      milestones: milestones || []
    });

  } catch (error: any) {
    console.error('Error in history API:', error);
    await logError(`Error in history API: ${error.message}`, 'system');
    res.status(500).json({ error: 'Internal server error' });
  }
}
