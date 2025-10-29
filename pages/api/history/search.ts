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

    const { q: searchTerm, limit = '50' } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ error: 'Search term is required' });
    }

    // TODO: Implement search with Drizzle ORM
    // For now, return empty results until history tables are set up

    res.status(200).json({
      activities: [],
      transactions: [],
      search_term: searchTerm,
      total_results: 0
    });

  } catch (error: any) {
    console.error('Error in history search API:', error);
    await logError(`Error in history search API: ${error.message}`, 'system');
    res.status(500).json({ error: 'Internal server error' });
  }
}
