import { Router } from 'express';
import { validateSession } from '../middleware/auth.middleware';
import * as kycController from '../controllers/kyc.controller';

const router = Router();

// All routes require valid session
router.use(validateSession);

/**
 * POST /kyc/create-link-token
 * Create a Link/Access token for Identity Verification (Plaid or Sumsub)
 */
router.post('/create-link-token', kycController.createLinkToken);

/**
 * POST /kyc/verify
 * Verify KYC using session ID or applicant ID and store results
 * Body: { sessionId: string } or { applicantId: string }
 */
router.post('/verify', kycController.verifyKYC);

/**
 * GET /kyc/status
 * Get user's current KYC verification status
 */
router.get('/status', kycController.getKYCStatus);

// Admin audit endpoints (TODO: Add admin authentication middleware)
/**
 * GET /kyc/admin/applicant/:applicantId
 * Get full applicant data for audit purposes (Sumsub only)
 */
router.get('/admin/applicant/:applicantId', kycController.getApplicantDataForAudit);

/**
 * GET /kyc/admin/applicant/:applicantId/status
 * Get applicant status for audit purposes (Sumsub only)
 */
router.get('/admin/applicant/:applicantId/status', kycController.getApplicantStatusForAudit);

/**
 * POST /kyc/webhook/applicant-reviewed
 * Webhook endpoint for Sumsub applicant review events
 */
router.post('/webhook/applicant-reviewed', kycController.handleApplicantReviewedWebhook);

/**
 * GET /kyc/admin/verified-users
 * Get all verified KYC users for admin audit
 */
router.get('/admin/verified-users', kycController.getAllVerifiedUsers);

/**
 * GET /kyc/admin/stats
 * Get KYC statistics for admin dashboard
 */
router.get('/admin/stats', kycController.getKYCStats);

export default router;
