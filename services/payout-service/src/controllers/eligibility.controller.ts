import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { EligibilityChecker } from '../services/eligibility-checker.service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export class EligibilityController {
  private eligibilityChecker: EligibilityChecker;

  constructor() {
    this.eligibilityChecker = new EligibilityChecker();
  }

  /**
   * GET /api/eligibility/status
   * Check current eligibility status
   */
  async getEligibilityStatus(req: AuthenticatedRequest, res: Response) {
    try {
      logger.info('Fetching eligibility status', {
        requestedBy: req.user?.id,
      });

      const result = await this.eligibilityChecker.checkEligibility();

      res.json({
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError(
        500,
        'ELIGIBILITY_CHECK_FAILED',
        'Failed to check eligibility',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * GET /api/eligibility/members
   * Get list of eligible members
   */
  async getEligibleMembers(req: AuthenticatedRequest, res: Response) {
    try {
      logger.info('Fetching eligible members', {
        requestedBy: req.user?.id,
      });

      const members = await this.eligibilityChecker.getEligibleMembers();

      res.json({
        data: {
          members,
          count: members.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError(
        500,
        'FETCH_MEMBERS_FAILED',
        'Failed to fetch eligible members',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/eligibility/check
   * Manually trigger eligibility check (admin only)
   */
  async triggerEligibilityCheck(req: AuthenticatedRequest, res: Response) {
    try {
      logger.info('Manual eligibility check triggered', {
        triggeredBy: req.user?.id,
      });

      const result = await this.eligibilityChecker.performEligibilityCheckWithNotification();

      res.json({
        data: {
          eligibility: result.eligibility,
          alertId: result.alertId,
          eligibleMembersCount: result.eligibleMembers.length,
        },
        message: 'Eligibility check completed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError(
        500,
        'ELIGIBILITY_CHECK_FAILED',
        'Failed to perform eligibility check',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
