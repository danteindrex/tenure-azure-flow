import { Router, type Router as RouterType } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router: RouterType = Router();

// Stripe webhook endpoint
router.post('/stripe', WebhookController.handleStripeWebhook);

export default router;
