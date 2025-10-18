import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Supabase server configuration missing' });
    }

    const adminSupabase = createClient(url, serviceKey);

    const { data, error } = await adminSupabase
      .from('notifications')
      .select('type, priority, is_read, is_archived')
      .eq('user_id', userId)
      .eq('is_archived', false);

    if (error) {
      console.error('Error fetching notification counts:', error);
      return res.status(500).json({ error: 'Failed to fetch notification counts' });
    }

    const notifications = data || [];
    const counts = {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      high_priority: notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length,
      by_type: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return res.status(200).json(counts);
  } catch (err: any) {
    console.error('Notification counts error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
