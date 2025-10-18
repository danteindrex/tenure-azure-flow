import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get user's support tickets
    const { userId } = req.query;

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

      const { data, error } = await adminSupabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching support tickets:', error);
        return res.status(500).json({ error: 'Failed to fetch support tickets' });
      }

      return res.status(200).json({ tickets: data || [] });
    } catch (err: any) {
      console.error('Support tickets error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  if (req.method === 'POST') {
    // Create new support ticket
    const { userId, subject, description, category, priority } = req.body;

    if (!userId || !subject || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceKey) {
        return res.status(500).json({ error: 'Supabase server configuration missing' });
      }

      const adminSupabase = createClient(url, serviceKey);

      // Get user info for caching
      const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
      
      if (userError || !userData.user) {
        return res.status(400).json({ error: 'User not found' });
      }

      const { data, error } = await adminSupabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject,
          description,
          category,
          priority: priority || 'medium',
          user_email: userData.user.email,
          user_name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0]
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating support ticket:', error);
        return res.status(500).json({ error: 'Failed to create support ticket' });
      }

      return res.status(201).json({ ticket: data });
    } catch (err: any) {
      console.error('Create ticket error:', err);
      return res.status(500).json({ error: err?.message || 'Unexpected server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
