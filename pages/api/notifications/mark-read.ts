import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Mark notification as read
    const { notificationId, userId } = req.body;

    if (!notificationId || !userId) {
      return res.status(400).json({ error: 'Notification ID and User ID are required' });
    }

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceKey) {
        return res.status(500).json({ error: 'Supabase server configuration missing' });
      }

      const adminSupabase = createClient(url, serviceKey);

      const { error } = await adminSupabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({ error: 'Failed to mark notification as read' });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Mark notification as read error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  if (req.method === 'PUT') {
    // Mark all notifications as read
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceKey) {
        return res.status(500).json({ error: 'Supabase server configuration missing' });
      }

      const adminSupabase = createClient(url, serviceKey);

      const { error } = await adminSupabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return res.status(500).json({ error: 'Failed to mark all notifications as read' });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Mark all notifications as read error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  res.setHeader('Allow', ['POST', 'PUT']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
