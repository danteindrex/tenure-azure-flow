import { Router } from 'express';
import { PayoutController } from '../controllers/payout.controller';
import { ApprovalController } from '../controllers/approval.controller';
import { PaymentController } from '../controllers/payment.controller';
import { asyncHandler } from '../utils/async-handler';
import { validateRequest } from '../middleware/validate-request';
import {
  CreatePayoutSchema,
  ApprovePayoutSchema,
  RejectPayoutSchema,
  MarkPaymentSentSchema,
  ConfirmPaymentSchema,
} from '../validators/payout.validator';

const router = Router();
const payoutController = new PayoutController();
const approvalController = new ApprovalController();
const paymentController = new PaymentController();

// =====================
// Payout CRUD Routes
// =====================

/**
 * POST /api/payouts
 * Create new payout records for selected users
 */
router.post(
  '/',
  validateRequest(CreatePayoutSchema),
  asyncHandler(payoutController.createPayouts.bind(payoutController))
);

/**
 * GET /api/payouts
 * List all payouts with optional filtering
 */
router.get(
  '/',
  asyncHandler(payoutController.listPayouts.bind(payoutController))
);

/**
 * GET /api/payouts/:payoutId
 * Get detailed payout information
 */
router.get(
  '/:payoutId',
  asyncHandler(payoutController.getPayoutDetails.bind(payoutController))
);

// =====================
// Approval Workflow Routes
// =====================

/**
 * POST /api/payouts/:payoutId/approve
 * Approve a payout (requires 2 approvals)
 */
router.post(
  '/:payoutId/approve',
  validateRequest(ApprovePayoutSchema),
  asyncHandler(approvalController.approvePayout.bind(approvalController))
);

/**
 * POST /api/payouts/:payoutId/reject
 * Reject a payout
 */
router.post(
  '/:payoutId/reject',
  validateRequest(RejectPayoutSchema),
  asyncHandler(approvalController.rejectPayout.bind(approvalController))
);

// =====================
// Payment Processing Routes
// =====================

/**
 * POST /api/payouts/:payoutId/generate-instructions
 * Generate payment instructions and calculate final amounts
 */
router.post(
  '/:payoutId/generate-instructions',
  asyncHandler(paymentController.generateInstructions.bind(paymentController))
);

/**
 * POST /api/payouts/:payoutId/mark-sent
 * Mark payment as sent (check mailed or ACH initiated)
 */
router.post(
  '/:payoutId/mark-sent',
  validateRequest(MarkPaymentSentSchema),
  asyncHandler(paymentController.markPaymentSent.bind(paymentController))
);

/**
 * POST /api/payouts/:payoutId/confirm
 * Confirm payment completion and generate receipt
 */
router.post(
  '/:payoutId/confirm',
  validateRequest(ConfirmPaymentSchema),
  asyncHandler(paymentController.confirmPayment.bind(paymentController))
);

/**
 * GET /api/payouts/:payoutId/receipt
 * Download payment receipt
 */
router.get(
  '/:payoutId/receipt',
  asyncHandler(paymentController.downloadReceipt.bind(paymentController))
);

export default router;
