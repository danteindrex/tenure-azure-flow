import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../config/logger';

export class BillingController {
  /**
   * GET /api/billing/schedules/:userId
   * Get billing schedules for a user
   */
  static async getBillingSchedules(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;

      // Ensure user can only access their own billing schedules
      if (req.user?.id !== userId) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own billing schedules'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Fetch billing schedules from database
      const query = `
        SELECT
          ubs.id,
          ubs.billing_cycle,
          ubs.next_billing_date,
          ubs.amount,
          ubs.currency,
          ubs.is_active,
          us.status as subscription_status,
          us.provider_subscription_id,
          us.cancel_at_period_end
        FROM user_billing_schedules ubs
        INNER JOIN user_subscriptions us ON ubs.subscription_id = us.id
        WHERE ubs.user_id = $1 AND ubs.is_active = true
        ORDER BY
          CASE
            WHEN ubs.billing_cycle = 'MONTHLY' THEN 1
            WHEN ubs.billing_cycle = 'YEARLY' THEN 2
            ELSE 3
          END
      `;

      const result = await pool.query(query, [userId]);

      // Calculate days until next billing for each schedule
      const schedules = result.rows.map((row: any) => {
        const nextDate = new Date(row.next_billing_date);
        const now = new Date();
        const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: row.id,
          billingCycle: row.billing_cycle,
          nextBillingDate: row.next_billing_date,
          amount: parseFloat(row.amount),
          currency: row.currency,
          isActive: row.is_active,
          subscriptionStatus: row.subscription_status,
          cancelAtPeriodEnd: row.cancel_at_period_end,
          daysUntil: Math.max(daysUntil, 0),
        };
      });

      res.status(200).json({
        success: true,
        data: { schedules }
      });

    } catch (error: any) {
      logger.error('Error in getBillingSchedules:', error);
      res.status(500).json({
        error: 'Failed to fetch billing schedules',
        message: error.message,
      });
    }
  }
}
