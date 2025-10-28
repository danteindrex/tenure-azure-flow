import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, details, userId, success = true } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Log to system_audit_logs table
    const { error } = await supabase
      .from('system_audit_logs')
      .insert({
        user_id: userId || null,
        entity_type: 'user_action',
        action: action,
        new_values: details || {},
        success: success,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress || null,
        user_agent: req.headers['user-agent'] || null,
        metadata: {
          timestamp: new Date().toISOString(),
          endpoint: req.url,
          method: req.method
        }
      });

    if (error) {
      console.error('Audit log error:', error);
      return res.status(500).json({ error: 'Failed to log audit entry' });
    }

    res.status(200).json({ success: true, message: 'Audit entry logged successfully' });

  } catch (error) {
    console.error('Audit API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}