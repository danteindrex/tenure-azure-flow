import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { logError } from '../../../src/lib/audit';

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

    // TODO: Implement summary queries with Drizzle ORM
    // For now, return empty summary until history tables are set up

    res.status(200).json({
      total_activities: 0,
      completed_activities: 0,
      failed_activities: 0,
      total_transactions: 0,
      total_amount: 0,
      recent_activities: []
    });

  } catch (error: any) {
    console.error('Error in history summary API:', error);
    await logError(`Error in history summary API: ${error.message}`, 'system');
    res.status(500).json({ error: 'Internal server error' });
  }
}
