import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { notificationId, userId } = req.query;

    if (!notificationId || !userId) {
      return res.status(400).json({ error: 'Notification ID and User ID are required' });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Supabase server configuration missing' });
    }

    const adminSupabase = createClient(url, serviceKey);

    const { error } = await adminSupabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
