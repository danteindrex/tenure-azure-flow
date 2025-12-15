import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/drizzle/db';
import { userAuditLogs } from '@/drizzle/schema/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, details, userId, success = true } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Log to user_audit_logs table using Drizzle
    await db.insert(userAuditLogs).values({
      userId: userId || null,
      entityType: 'user_action',
      action: action,
      newValues: details || {},
      success: success,
      ipAddress: (req.headers['x-forwarded-for'] as string) || (req.socket.remoteAddress) || null,
      userAgent: req.headers['user-agent'] || null,
      metadata: {
        timestamp: new Date().toISOString(),
        endpoint: req.url,
        method: req.method
      }
    } as any);

    res.status(200).json({ success: true, message: 'Audit entry logged successfully' });

  } catch (error) {
    console.error('Audit API error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}