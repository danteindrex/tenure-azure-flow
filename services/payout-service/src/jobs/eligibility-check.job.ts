import cron from 'node-cron';
import { EligibilityChecker } from '../services/eligibility-checker.service';
import { logger } from '../utils/logger';

const eligibilityChecker = new EligibilityChecker();

/**
 * Eligibility Check Cron Job
 * Runs daily at 2:00 AM UTC
 * Checks if company has reached $100,000 revenue threshold
 * Sends alert to admins if eligible
 */
export function startEligibilityCheckJob() {
  // Run at 2:00 AM UTC every day
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting scheduled eligibility check');

      const result = await eligibilityChecker.performEligibilityCheckWithNotification();

      logger.info('Eligibility check completed', {
        isEligible: result.eligibility.isEligible,
        totalRevenue: result.eligibility.totalRevenue,
        eligibleMembersCount: result.eligibleMembers.length,
        alertId: result.alertId,
      });
    } catch (error) {
      logger.error('Eligibility check job failed', error);
    }
  }, {
    timezone: 'UTC',
  });

  logger.info('Eligibility check cron job scheduled (2:00 AM UTC daily)');
}
