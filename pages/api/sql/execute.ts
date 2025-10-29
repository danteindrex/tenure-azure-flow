import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sql } = req.body;

    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    // TODO: Implement SQL execution with proper security checks
    // For now, disable this endpoint for security reasons
    return res.status(501).json({ 
      success: false, 
      error: 'SQL execution endpoint is disabled for security reasons' 
    });

  } catch (error) {
    console.error('SQL API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
