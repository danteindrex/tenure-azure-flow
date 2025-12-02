import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { user, userAuditLogs, userPayments, membershipQueue } from '@/drizzle/schema';
import { eq, desc, or, and, sql } from 'drizzle-orm';
import { PAYMENT_STATUS, getPaymentStatusName } from '@/lib/status-ids';

/**
 * Activity History API
 *
 * Returns user's activity history including:
 * - Payment transactions
 * - Audit log events
 * - Profile changes
 * - Queue position changes
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbUser = await db.select().from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get limit from query params (default 50)
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    // Get user audit logs
    const auditLogs = await db.select()
      .from(userAuditLogs)
      .where(eq(userAuditLogs.userId, dbUser.id))
      .orderBy(desc(userAuditLogs.createdAt))
      .limit(Math.min(limit, 100));

    // Get payment history
    const payments = await db.select()
      .from(userPayments)
      .where(eq(userPayments.userId, dbUser.id))
      .orderBy(desc(userPayments.paymentDate))
      .limit(Math.min(limit, 50));

    // Get queue history (current position)
    const queueData = await db.select()
      .from(membershipQueue)
      .where(eq(membershipQueue.userId, dbUser.id))
      .limit(1)
      .then(rows => rows[0]);

    // Combine all activities
    const activities = [];

    // Add payment activities
    for (const payment of payments) {
      const action = payment.paymentType === 'joining_fee'
        ? 'Joining Fee Payment'
        : payment.paymentType === 'monthly_fee'
        ? 'Monthly Payment Processed'
        : 'Payment Processed';

      const paymentStatusName = getPaymentStatusName(payment.paymentStatusId);
      const description = `${payment.paymentStatusId === PAYMENT_STATUS.SUCCEEDED ? 'Successfully processed' : paymentStatusName} payment of $${Number(payment.amount).toFixed(2)}`;

      // Map payment status ID to activity status
      const activityStatus = payment.paymentStatusId === PAYMENT_STATUS.SUCCEEDED ? 'completed'
        : payment.paymentStatusId === PAYMENT_STATUS.FAILED ? 'failed'
        : 'pending';

      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        action,
        description,
        amount: Number(payment.amount),
        status: activityStatus,
        date: payment.paymentDate.toISOString().split('T')[0],
        time: payment.paymentDate.toTimeString().split(' ')[0].substring(0, 5),
        details: `Payment method: ${payment.provider || 'Unknown'} • Transaction ID: ${payment.providerPaymentId || 'N/A'}`,
        metadata: {
          paymentId: payment.id,
          paymentType: payment.paymentType,
          provider: payment.provider,
          receiptUrl: payment.receiptUrl
        }
      });
    }

    // Add audit log activities
    for (const log of auditLogs) {
      const action = formatAction(log.action, log.entityType);
      const description = generateDescription(log);

      activities.push({
        id: `audit-${log.id}`,
        type: mapEntityType(log.entityType),
        action,
        description,
        amount: null,
        status: log.success ? 'completed' : 'failed',
        date: log.createdAt.toISOString().split('T')[0],
        time: log.createdAt.toTimeString().split(' ')[0].substring(0, 5),
        details: log.errorMessage || JSON.stringify(log.metadata || {}),
        metadata: log.metadata
      });
    }

    // Add queue join event if exists
    if (queueData && queueData.joinedQueueAt) {
      activities.push({
        id: `queue-${queueData.id}`,
        type: 'queue',
        action: 'Joined Membership Queue',
        description: `Assigned queue position #${queueData.queuePosition}`,
        amount: null,
        status: 'completed',
        date: queueData.joinedQueueAt.toISOString().split('T')[0],
        time: queueData.joinedQueueAt.toTimeString().split(' ')[0].substring(0, 5),
        details: `Position: ${queueData.queuePosition} • Eligible: ${queueData.isEligible ? 'Yes' : 'No'}`,
        metadata: {
          queuePosition: queueData.queuePosition,
          isEligible: queueData.isEligible
        }
      });
    }

    // Sort by date descending (most recent first)
    activities.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    // Return limited results
    const limitedActivities = activities.slice(0, limit);

    return res.status(200).json({
      success: true,
      activities: limitedActivities,
      total: activities.length,
      limit
    });

  } catch (error) {
    console.error('Activity history API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions
function mapEntityType(entityType: string | null): string {
  if (!entityType) return 'system';

  const mapping: Record<string, string> = {
    'user': 'profile',
    'profile': 'profile',
    'payment': 'payment',
    'subscription': 'payment',
    'queue': 'queue',
    'membership': 'milestone',
    'payout': 'bonus'
  };

  return mapping[entityType.toLowerCase()] || 'system';
}

function formatAction(action: string | null, entityType: string | null): string {
  if (!action) return 'Activity';

  const formatted = action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  if (entityType) {
    return `${formatted} ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;
  }

  return formatted;
}

function generateDescription(log: any): string {
  const action = log.action || 'performed';
  const entity = log.entityType || 'record';

  if (action === 'create') {
    return `Created new ${entity}`;
  } else if (action === 'update') {
    return `Updated ${entity} information`;
  } else if (action === 'delete') {
    return `Deleted ${entity}`;
  } else if (action === 'login') {
    return 'Logged into account';
  } else if (action === 'logout') {
    return 'Logged out of account';
  }

  return `Performed ${action} on ${entity}`;
}
