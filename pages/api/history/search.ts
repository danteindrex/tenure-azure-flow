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

    const { q: searchTerm, limit = '50' } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ error: 'Search term is required' });
    }

    // Search activities
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activity_history')
      .select('*')
      .eq('user_id', user.id)
      .or(`action.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (activitiesError) {
      console.error('Error searching activities:', activitiesError);
      await logError(`Error searching activities: ${activitiesError.message}`, user.id);
    }

    // Search transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transaction_history')
      .select('*')
      .eq('user_id', user.id)
      .or(`description.ilike.%${searchTerm}%,payment_reference.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (transactionsError) {
      console.error('Error searching transactions:', transactionsError);
      await logError(`Error searching transactions: ${transactionsError.message}`, user.id);
    }

    res.status(200).json({
      activities: activities || [],
      transactions: transactions || [],
      search_term: searchTerm,
      total_results: (activities?.length || 0) + (transactions?.length || 0)
    });

  } catch (error: any) {
    console.error('Error in history search API:', error);
    await logError(`Error in history search API: ${error.message}`, 'system');
    res.status(500).json({ error: 'Internal server error' });
  }
}
