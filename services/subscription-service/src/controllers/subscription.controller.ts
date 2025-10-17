import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { logger } from '../config/logger';
import { z } from 'zod';

const CreateCheckoutSchema = z.object({
  memberId: z.number().int().positive(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export class SubscriptionController {
  /**
   * POST /api/subscriptions/checkout
   * Create a Stripe Checkout session
   */
  static async createCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      const validation = CreateCheckoutSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation error',
          details: validation.error.errors,
        });
        return;
      }

      const result = await StripeService.createCheckoutSession(validation.data);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error in createCheckoutSession:', error);
      res.status(500).json({
        error: 'Failed to create checkout session',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/subscriptions/:memberId
   * Get subscription details for a member
   */
  static async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);

      if (isNaN(memberId)) {
        res.status(400).json({ error: 'Invalid member ID' });
        return;
      }

      const subscription = await StripeService.getSubscription(memberId);

      if (!subscription) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Error in getSubscription:', error);
      res.status(500).json({
        error: 'Failed to get subscription',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/subscriptions/:memberId/cancel
   * Cancel a subscription
   */
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);
      const { immediately = false } = req.body;

      if (isNaN(memberId)) {
        res.status(400).json({ error: 'Invalid member ID' });
        return;
      }

      await StripeService.cancelSubscription(memberId, immediately);

      res.status(200).json({
        success: true,
        message: immediately
          ? 'Subscription canceled immediately'
          : 'Subscription will cancel at period end',
      });
    } catch (error: any) {
      logger.error('Error in cancelSubscription:', error);
      res.status(500).json({
        error: 'Failed to cancel subscription',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/subscriptions/:memberId/reactivate
   * Reactivate a canceled subscription
   */
  static async reactivateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);

      if (isNaN(memberId)) {
        res.status(400).json({ error: 'Invalid member ID' });
        return;
      }

      await StripeService.reactivateSubscription(memberId);

      res.status(200).json({
        success: true,
        message: 'Subscription reactivated successfully',
      });
    } catch (error: any) {
      logger.error('Error in reactivateSubscription:', error);
      res.status(500).json({
        error: 'Failed to reactivate subscription',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/subscriptions/:memberId/payments
   * Get payment history for a member
   */
  static async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const memberId = parseInt(req.params.memberId);

      if (isNaN(memberId)) {
        res.status(400).json({ error: 'Invalid member ID' });
        return;
      }

      const payments = await StripeService.getPaymentHistory(memberId);

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error: any) {
      logger.error('Error in getPaymentHistory:', error);
      res.status(500).json({
        error: 'Failed to get payment history',
        message: error.message,
      });
    }
  }
}
