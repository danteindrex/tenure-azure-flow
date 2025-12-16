import { Router } from 'express';
import multer from 'multer';
import { validateSession } from '../middleware/auth.middleware';
import * as kycController from '../controllers/kyc.controller';

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

/**
 * POST /kyc/webhook/applicant-reviewed
 * Webhook endpoint for Sumsub applicant review events (no auth required)
 */
router.post('/webhook/applicant-reviewed', kycController.handleApplicantReviewedWebhook);

// All other routes require valid session
router.use(validateSession);

/**
 * POST /kyc/create-applicant
 * Create a new Sumsub applicant for direct API integration
 */
router.post('/create-applicant', kycController.createApplicant);

/**
 * POST /kyc/upload-document
 * Upload document for KYC verification
 */
router.post('/upload-document', upload.fields([
  { name: 'content', maxCount: 1 },
  { name: 'backFile', maxCount: 1 }
]), kycController.uploadDocument);

/**
 * POST /kyc/start-verification
 * Start the verification process for an applicant
 */
router.post('/start-verification', kycController.startVerification);

/**
 * POST /kyc/get-sdk-token
 * Get Sumsub SDK access token for liveness verification
 */
router.post('/get-sdk-token', kycController.getSdkToken);

/**
 * GET /kyc/check-status
 * Check the verification status of an applicant
 */
router.get('/check-status', kycController.getKYCStatus);



/**
 * POST /kyc/upload-document
 * Upload document for KYC verification
 */
router.post('/upload-document', upload.fields([
  { name: 'content', maxCount: 1 },
  { name: 'backFile', maxCount: 1 }
]), kycController.uploadDocument);



/**
 * GET /kyc/admin/applicant/:applicantId
 * Get full applicant data for audit purposes (Sumsub only)
 */
router.get('/admin/applicant/:applicantId', kycController.getApplicantDataForAudit);

/**
 * Get applicant status for audit purposes (Sumsub only)
 */
router.get('/admin/applicant/:applicantId/status', kycController.getApplicantStatusForAudit);

/**
 * POST /kyc/webhook/applicant-reviewed
 * Webhook endpoint for Sumsub applicant review events
 */
router.post('/webhook/applicant-reviewed', kycController.handleApplicantReviewedWebhook);



/**
 * GET /kyc/admin/applicant/:applicantId
 * Get full applicant data for audit purposes (Sumsub only)
 */
router.get('/admin/applicant/:applicantId', kycController.getApplicantDataForAudit);

/**
 * Get applicant status for audit purposes (Sumsub only)
 */
router.get('/admin/applicant/:applicantId/status', kycController.getApplicantStatusForAudit);

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
