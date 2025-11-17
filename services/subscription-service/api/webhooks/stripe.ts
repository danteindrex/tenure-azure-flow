import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StripeService } from '../../src/services/stripe.service';
import { logger } from '../../src/config/logger';
import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we need raw body for Stripe
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    // Get raw body from Vercel request
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf-8');

    // Verify webhook signature
    const event = StripeService.verifyWebhookSignature(rawBody, signature);

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
        await StripeService.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    return res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message,
    });
  }
}
