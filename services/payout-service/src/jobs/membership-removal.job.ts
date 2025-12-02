import cron from 'node-cron';
import { db, payoutManagement, userMemberships } from '../config/database';
import { eq, and, lte } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';
import { PAYOUT_STATUS, MEMBER_STATUS } from '../config/status-ids';

/**
 * Membership Removal Cron Job
 * Runs daily at 3:00 AM UTC
 * Removes members who received payout 12 months ago
 * Updates their user status to 'Inactive'
 */
export function startMembershipRemovalJob() {
  // Run at 3:00 AM UTC every day
  cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Starting scheduled membership removal check');

      // Find completed payouts from 12+ months ago
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const expiredPayouts = await db.query.payoutManagement.findMany({
        where: and(
          eq(payoutManagement.payoutStatusId, PAYOUT_STATUS.COMPLETED),
          lte(payoutManagement.completedDate, twelveMonthsAgo)
        ),
        with: { user: true },
      });

      if (expiredPayouts.length === 0) {
        logger.info('No memberships to remove');
        return;
      }

      logger.info(`Found ${expiredPayouts.length} memberships to remove`);

      for (const payout of expiredPayouts) {
        try {
          // Update member status to Inactive
          await db.update(userMemberships)
            .set({
              memberStatusId: MEMBER_STATUS.INACTIVE,
              updatedAt: new Date(),
            })
            .where(eq(userMemberships.userId, payout.userId));

          // Update payout record with removal info
          const auditTrail = (payout.auditTrail as any[]) || [];
          auditTrail.push({
            action: 'membership_removed',
            actor: 'system_cron_job',
            timestamp: new Date().toISOString(),
            details: {
              reason: '12_months_post_payout',
              completedDate: payout.completedDate,
              removalDate: new Date().toISOString(),
            },
          });

          await db.update(payoutManagement)
            .set({
              auditTrail: auditTrail as any,
              updatedAt: new Date(),
            })
            .where(eq(payoutManagement.payoutId, payout.payoutId));

          // Send notification to user
          await notificationService.sendMembershipRemoved(
            payout.payoutId,
            payout.userId,
            {
              completedDate: payout.completedDate!,
              userEmail: (payout.user as any)?.email,
            }
          );

          logger.info('Membership removed', {
            userId: payout.userId,
            payoutId: payout.payoutId,
            completedDate: payout.completedDate,
          });
        } catch (error) {
          logger.error('Failed to remove membership', {
            userId: payout.userId,
            payoutId: payout.payoutId,
            error,
          });
        }
      }

      logger.info('Membership removal check completed', {
        processed: expiredPayouts.length,
      });
    } catch (error) {
      logger.error('Membership removal job failed', error);
    }
  }, {
    timezone: 'UTC',
  });

  logger.info('Membership removal cron job scheduled (3:00 AM UTC daily)');
}
