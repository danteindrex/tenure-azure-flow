import { Router } from 'express';
import { validateSession } from '../middleware/auth.middleware';
import * as kycController from '../controllers/kyc.controller';

const router = Router();

// All routes require valid session
router.use(validateSession);

/**
 * POST /kyc/create-link-token
 * Create a Plaid Link token for Identity Verification
 */
router.post('/create-link-token', kycController.createLinkToken);

/**
 * POST /kyc/verify
 * Verify KYC using Plaid session ID and store results
 * Body: { sessionId: string }
 */
router.post('/verify', kycController.verifyKYC);

/**
 * GET /kyc/status
 * Get user's current KYC verification status
 */
router.get('/status', kycController.getKYCStatus);

export default router;
