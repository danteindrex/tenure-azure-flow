import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { PaymentProcessorService } from '../services/payment-processor.service';
import { db, payoutManagement } from '../config/database';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export class PaymentController {
  private paymentProcessor: PaymentProcessorService;

  constructor() {
    this.paymentProcessor = new PaymentProcessorService();
  }

  async generateInstructions(req: AuthenticatedRequest, res: Response) {
    const { payoutId } = req.params;
    const adminId = req.user!.id;

    try {
      const calculation = await this.paymentProcessor.calculateAndStorePayoutForRecord(payoutId, false);
      const instructions = await this.paymentProcessor.generatePaymentInstructions(payoutId, parseInt(adminId));

      res.json({
        data: { payoutId, calculation, instructions },
        message: 'Payment instructions generated',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'GENERATE_INSTRUCTIONS_FAILED', 'Failed to generate payment instructions', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async markPaymentSent(req: AuthenticatedRequest, res: Response) {
    const { payoutId } = req.params;
    const { sentDate, expectedArrivalDate, trackingNumber, notes } = req.body;
    const adminId = req.user!.id;

    try {
      await this.paymentProcessor.markPaymentSent(payoutId, {
        sentDate: new Date(sentDate),
        expectedArrivalDate: new Date(expectedArrivalDate),
        trackingNumber,
        notes,
        sentBy: parseInt(adminId),
      });

      res.json({
        data: { payoutId, status: 'processing' },
        message: 'Payment marked as sent',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'MARK_SENT_FAILED', 'Failed to mark payment as sent', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async confirmPayment(req: AuthenticatedRequest, res: Response) {
    const { payoutId } = req.params;
    const { completedDate, confirmationNumber, notes } = req.body;
    const adminId = req.user!.id;

    try {
      const receiptUrl = await this.paymentProcessor.generateReceipt(payoutId);

      await this.paymentProcessor.confirmPaymentComplete(payoutId, {
        completedDate: new Date(completedDate),
        confirmationNumber,
        receiptUrl,
        notes,
        completedBy: parseInt(adminId),
      });

      res.json({
        data: { payoutId, status: 'completed', receiptUrl },
        message: 'Payment confirmed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'CONFIRM_PAYMENT_FAILED', 'Failed to confirm payment', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async downloadReceipt(req: AuthenticatedRequest, res: Response) {
    const { payoutId } = req.params;

    try {
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId),
      });

      if (!payout) throw new AppError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');
      if (!payout.receiptUrl) throw new AppError(404, 'RECEIPT_NOT_FOUND', 'Receipt not generated yet');

      res.json({
        data: { receiptUrl: payout.receiptUrl },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'DOWNLOAD_RECEIPT_FAILED', 'Failed to download receipt', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
