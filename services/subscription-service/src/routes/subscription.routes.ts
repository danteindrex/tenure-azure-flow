import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Create checkout session (protected)
router.post('/checkout', authenticateUser, SubscriptionController.createCheckoutSession);

// Get subscription details (protected)
router.get('/:memberId', authenticateUser, SubscriptionController.getSubscription);

// Cancel subscription (protected)
router.post('/:memberId/cancel', authenticateUser, SubscriptionController.cancelSubscription);

// Reactivate subscription (protected)
router.post('/:memberId/reactivate', authenticateUser, SubscriptionController.reactivateSubscription);

// Get payment history (protected)
router.get('/:memberId/payments', authenticateUser, SubscriptionController.getPaymentHistory);

export default router;
