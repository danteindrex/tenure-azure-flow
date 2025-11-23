import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { WinnerSelector } from '../services/winner-selector.service';
import { db, payoutManagement } from '../config/database';
import { eq, desc, and } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export class PayoutController {
  private winnerSelector: WinnerSelector;

  constructor() {
    this.winnerSelector = new WinnerSelector();
  }

  async createPayouts(req: AuthenticatedRequest, res: Response) {
    const { userIds, notes } = req.body;
    const adminId = req.user!.id;

    try {
      logger.info('Creating payouts', { adminId, userIdCount: userIds.length });

      const eligibleMembers = await this.winnerSelector.getEligibleMembers(1000);
      const selectedMembers = eligibleMembers.filter(m => userIds.includes(m.userId));

      if (selectedMembers.length !== userIds.length) {
        const invalidUserIds = userIds.filter((id: string) => !selectedMembers.find(m => m.userId === id));
        throw new AppError(400, 'INVALID_SELECTION', 'Some selected users are not eligible for payout', { invalidUserIds });
      }

      const result = await this.winnerSelector.createPayoutRecords(selectedMembers, parseInt(adminId), notes);

      if (!result.success) {
        throw new AppError(500, 'PAYOUT_CREATION_FAILED', 'Failed to create some payout records', result.failedUsers);
      }

      res.status(201).json({
        data: {
          payoutIds: result.payoutIds,
          createdCount: result.createdCount,
          failedCount: result.failedCount,
          failedUsers: result.failedUsers,
        },
        message: `Successfully created ${result.createdCount} payout(s)`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'PAYOUT_CREATION_ERROR', 'Failed to create payouts', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async listPayouts(req: AuthenticatedRequest, res: Response) {
    const { status, userId, limit = '50', offset = '0' } = req.query;

    try {
      let query = db.select().from(payoutManagement);

      const conditions = [];
      if (status) conditions.push(eq(payoutManagement.status, status as string));
      if (userId) conditions.push(eq(payoutManagement.userId, userId as string));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const payouts = await query
        .orderBy(desc(payoutManagement.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      res.json({
        data: { payouts, count: payouts.length, limit: parseInt(limit as string), offset: parseInt(offset as string) },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new AppError(500, 'FETCH_PAYOUTS_FAILED', 'Failed to fetch payouts', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getPayoutDetails(req: AuthenticatedRequest, res: Response) {
    const { payoutId } = req.params;

    try {
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId),
        with: { user: true },
      });

      if (!payout) throw new AppError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');

      res.json({ data: payout, timestamp: new Date().toISOString() });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'FETCH_PAYOUT_FAILED', 'Failed to fetch payout details', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
