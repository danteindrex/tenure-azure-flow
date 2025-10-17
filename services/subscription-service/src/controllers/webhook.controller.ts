import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { logger } from '../config/logger';
import Stripe from 'stripe';

export class WebhookController {
  /**
   * POST /api/webhooks/stripe
   * Handle Stripe webhook events
   */
  static async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    try {
      // Verify webhook signature
      const event = StripeService.verifyWebhookSignature(
        req.body,
        signature
      );

      logger.info(`Received Stripe webhook: ${event.type}`, {
        eventId: event.id,
      });

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await StripeService.handleCheckoutComplete(
            event.data.object as Stripe.Checkout.Session
          );
          break;

        case 'invoice.payment_succeeded':
          await StripeService.handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice
          );
          break;

        case 'customer.subscription.updated':
          await StripeService.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.deleted':
          await StripeService.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'invoice.payment_failed':
          logger.warn('Invoice payment failed', {
            invoice: event.data.object,
          });
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Webhook error:', error);
      res.status(400).json({
        error: 'Webhook processing failed',
        message: error.message,
      });
    }
  }
}
