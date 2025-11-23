import { Router } from 'express';
import { EligibilityController } from '../controllers/eligibility.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const eligibilityController = new EligibilityController();

/**
 * GET /api/eligibility/status
 * Check current eligibility status
 */
router.get(
  '/status',
  asyncHandler(eligibilityController.getEligibilityStatus.bind(eligibilityController))
);

/**
 * GET /api/eligibility/members
 * Get list of eligible members
 */
router.get(
  '/members',
  asyncHandler(eligibilityController.getEligibleMembers.bind(eligibilityController))
);

/**
 * POST /api/eligibility/check
 * Manually trigger eligibility check (admin only)
 */
router.post(
  '/check',
  asyncHandler(eligibilityController.triggerEligibilityCheck.bind(eligibilityController))
);

export default router;
