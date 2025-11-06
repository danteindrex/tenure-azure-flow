import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { validateSession } from '../middleware/auth.middleware';

const router = Router();

// Create checkout session (protected)
router.post('/checkout', validateSession, SubscriptionController.createCheckoutSession);

// Get subscription details (protected)
router.get('/:memberId', validateSession, SubscriptionController.getSubscription);

// Cancel subscription (protected)
router.post('/:memberId/cancel', validateSession, SubscriptionController.cancelSubscription);

// Reactivate subscription (protected)
router.post('/:memberId/reactivate', validateSession, SubscriptionController.reactivateSubscription);

// Get payment history (protected)
router.get('/:memberId/payments', validateSession, SubscriptionController.getPaymentHistory);

export default router;
