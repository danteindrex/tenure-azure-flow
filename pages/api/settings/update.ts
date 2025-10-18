import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      userId, 
      settingsType, 
      settings 
    }: {
      userId: string;
      settingsType: 'general' | 'notifications' | 'security' | 'payment' | 'privacy' | 'appearance';
      settings: any;
    } = req.body;

    if (!userId || !settingsType || !settings) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Supabase server configuration missing' });
    }

    const adminSupabase = createClient(url, serviceKey);

    let tableName: string;
    let error: any;

    // Determine which table to update based on settings type
    switch (settingsType) {
      case 'general':
        tableName = 'user_settings';
        break;
      case 'notifications':
        tableName = 'user_notification_preferences';
        break;
      case 'security':
        tableName = 'user_security_settings';
        break;
      case 'payment':
        tableName = 'user_payment_settings';
        break;
      case 'privacy':
        tableName = 'user_privacy_settings';
        break;
      case 'appearance':
        tableName = 'user_appearance_settings';
        break;
      default:
        return res.status(400).json({ error: 'Invalid settings type' });
    }

    // Update the settings
    const { error: updateError } = await adminSupabase
      .from(tableName)
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error(`Error updating ${settingsType} settings:`, updateError);
      return res.status(500).json({ error: `Failed to update ${settingsType} settings` });
    }

    return res.status(200).json({ 
      success: true, 
      message: `${settingsType} settings updated successfully` 
    });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
