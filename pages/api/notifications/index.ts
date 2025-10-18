import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get user's notifications
    const { userId, limit, offset, type, is_read, is_archived } = req.query;

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

      let query = adminSupabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(parseInt(limit as string));
      }

      if (offset) {
        query = query.range(parseInt(offset as string), parseInt(offset as string) + (parseInt(limit as string) || 50) - 1);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (is_read !== undefined) {
        query = query.eq('is_read', is_read === 'true');
      }

      if (is_archived !== undefined) {
        query = query.eq('is_archived', is_archived === 'true');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      return res.status(200).json({ notifications: data || [] });
    } catch (err: any) {
      console.error('Notifications error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  if (req.method === 'POST') {
    // Create new notification
    const { userId, type, title, message, priority, action_url, action_text, metadata } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceKey) {
        return res.status(500).json({ error: 'Supabase server configuration missing' });
      }

      const adminSupabase = createClient(url, serviceKey);

      const { data, error } = await adminSupabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          priority: priority || 'medium',
          action_url,
          action_text,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return res.status(500).json({ error: 'Failed to create notification' });
      }

      return res.status(201).json({ notification: data });
    } catch (err: any) {
      console.error('Create notification error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
