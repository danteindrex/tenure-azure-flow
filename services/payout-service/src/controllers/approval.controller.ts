import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';
import { db, payoutManagement } from '../config/database';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';

export class ApprovalController {
  async approvePayout(req: AuthenticatedRequest, res: Response) {
    const { payoutId } = req.params;
    const { reason } = req.body;
    const adminId = req.user!.id;
    const adminEmail = req.user!.email;

    try {
      logger.info('Processing payout approval', { payoutId, adminId });

      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId),
        with: { user: true },
      });

      if (!payout) throw new AppError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');
      if (payout.status !== 'pending_approval') {
        throw new AppError(400, 'INVALID_STATUS', `Cannot approve payout with status: ${payout.status}`);
      }

      const approvalWorkflow = (payout.approvalWorkflow as any) || {
        requiredApprovals: 2,
        currentApprovals: 0,
        approvers: [],
        status: 'pending',
      };

      const hasAlreadyApproved = approvalWorkflow.approvers.some((a: any) => a.adminId === adminId);
      if (hasAlreadyApproved) throw new AppError(400, 'ALREADY_APPROVED', 'You have already approved this payout');

      approvalWorkflow.approvers.push({
        adminId,
        adminEmail,
        decision: 'approved',
        reason: reason || null,
        timestamp: new Date().toISOString(),
      });
      approvalWorkflow.currentApprovals = approvalWorkflow.approvers.length;

      const isFullyApproved = approvalWorkflow.currentApprovals >= approvalWorkflow.requiredApprovals;
      const newStatus = isFullyApproved ? 'approved' : 'pending_approval';
      approvalWorkflow.status = isFullyApproved ? 'approved' : 'pending';

      const auditTrail = (payout.auditTrail as any[]) || [];
      auditTrail.push({
        action: 'payout_approved',
        actor: `admin_${adminId}`,
        timestamp: new Date().toISOString(),
        details: {
          adminEmail,
          reason,
          currentApprovals: approvalWorkflow.currentApprovals,
          requiredApprovals: approvalWorkflow.requiredApprovals,
          fullyApproved: isFullyApproved,
        },
      });

      await db.update(payoutManagement).set({
        status: newStatus,
        approvalWorkflow: approvalWorkflow as any,
        auditTrail: auditTrail as any,
        updatedAt: new Date(),
      }).where(eq(payoutManagement.payoutId, payoutId));

      if (isFullyApproved) {
        await notificationService.sendPayoutApproved(payoutId, payout.userId, {
          amount: parseFloat(payout.amount),
          approvalCount: approvalWorkflow.currentApprovals,
          finalApprover: adminEmail,
          userEmail: (payout.user as any)?.email,
        });
      }

      res.json({
        data: {
          payoutId,
          status: newStatus,
          currentApprovals: approvalWorkflow.currentApprovals,
          requiredApprovals: approvalWorkflow.requiredApprovals,
          fullyApproved: isFullyApproved,
        },
        message: isFullyApproved ? 'Payout fully approved' : `Approval recorded (${approvalWorkflow.currentApprovals}/${approvalWorkflow.requiredApprovals})`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'APPROVAL_FAILED', 'Failed to approve payout', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async rejectPayout(req: AuthenticatedRequest, res: Response) {
    const { payoutId } = req.params;
    const { reason } = req.body;
    const adminId = req.user!.id;
    const adminEmail = req.user!.email;

    try {
      logger.info('Processing payout rejection', { payoutId, adminId });

      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId),
        with: { user: true },
      });

      if (!payout) throw new AppError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');
      if (payout.status !== 'pending_approval') {
        throw new AppError(400, 'INVALID_STATUS', `Cannot reject payout with status: ${payout.status}`);
      }

      const approvalWorkflow = (payout.approvalWorkflow as any) || {};
      approvalWorkflow.status = 'cancelled';
      approvalWorkflow.rejectedBy = { adminId, adminEmail, reason, timestamp: new Date().toISOString() };

      const auditTrail = (payout.auditTrail as any[]) || [];
      auditTrail.push({
        action: 'payout_rejected',
        actor: `admin_${adminId}`,
        timestamp: new Date().toISOString(),
        details: { adminEmail, reason },
      });

      await db.update(payoutManagement).set({
        status: 'cancelled',
        approvalWorkflow: approvalWorkflow as any,
        auditTrail: auditTrail as any,
        updatedAt: new Date(),
      }).where(eq(payoutManagement.payoutId, payoutId));

      await notificationService.sendPayoutRejected(payoutId, payout.userId, {
        reason,
        rejectedBy: adminEmail,
        userEmail: (payout.user as any)?.email,
      });

      res.json({
        data: { payoutId, status: 'cancelled' },
        message: 'Payout rejected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'REJECTION_FAILED', 'Failed to reject payout', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}
