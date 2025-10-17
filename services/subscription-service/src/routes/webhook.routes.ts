import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Stripe webhook endpoint
router.post('/stripe', WebhookController.handleStripeWebhook);

export default router;
