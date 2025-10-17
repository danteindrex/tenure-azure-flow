import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';

const router = Router();

// Create checkout session
router.post('/checkout', SubscriptionController.createCheckoutSession);

// Get subscription details
router.get('/:memberId', SubscriptionController.getSubscription);

// Cancel subscription
router.post('/:memberId/cancel', SubscriptionController.cancelSubscription);

// Reactivate subscription
router.post('/:memberId/reactivate', SubscriptionController.reactivateSubscription);

// Get payment history
router.get('/:memberId/payments', SubscriptionController.getPaymentHistory);

export default router;
