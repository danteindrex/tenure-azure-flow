import { startEligibilityCheckJob } from './eligibility-check.job';
import { startMembershipRemovalJob } from './membership-removal.job';
import { logger } from '../utils/logger';

/**
 * Initialize and start all cron jobs
 */
export function startCronJobs() {
  logger.info('Starting cron jobs...');

  startEligibilityCheckJob();
  startMembershipRemovalJob();

  logger.info('All cron jobs started successfully');
}
