import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { logger } from '../config/logger';
import { z } from 'zod';

const CreateCheckoutSchema = z.object({
  userId: z.string().uuid(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  isRejoin: z.boolean().optional(),
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

      // Type assertion since we validated with Zod
      const result = await StripeService.createCheckoutSession(validation.data as any);

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
   * GET /api/subscriptions/:userId
   * Get subscription details for a user
   */
  static async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      
      // Ensure user can only access their own subscription
      if (req.user?.id !== userId) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own subscription'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const subscription = await StripeService.getSubscription(parseInt(userId, 10));

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
      const userId = req.params.memberId; // This is actually a userId (UUID string)
      const { immediately = false } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      await StripeService.cancelSubscription(userId, immediately);

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
      const userId = req.params.memberId; // This is actually a userId (UUID string)

      if (!userId) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      await StripeService.reactivateSubscription(userId);

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
      const userId = req.params.memberId; // This is actually a userId (UUID string)

      // Ensure user can only access their own payment history
      if (req.user?.id !== userId) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own payment history'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const payments = await StripeService.getPaymentHistory(userId);

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

  /**
   * POST /api/subscriptions/:userId/update-payment
   * Create a Stripe Billing Portal session for payment method updates
   */
  static async createUpdatePaymentSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;

      // Ensure user can only access their own billing portal
      if (req.user?.id !== userId) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own payment method'
        });
        return;
      }

      const { returnUrl } = req.body;

      const result = await StripeService.createBillingPortalSession(userId, returnUrl);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error in createUpdatePaymentSession:', error);
      res.status(500).json({
        error: 'Failed to create billing portal session',
        message: error.message,
      });
    }
  }
}
