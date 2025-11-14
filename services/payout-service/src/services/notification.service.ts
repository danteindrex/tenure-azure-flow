/**
 * Notification Service
 * 
 * Handles sending email notifications to members and administrators
 * throughout the payout process.
 * 
 * Requirements: 9.1-9.7
 */

import { logger } from '../utils/logger';
import { sendEmail, emailConfig } from '../config/email';
import fs from 'fs/promises';
import path from 'path';

/**
 * Notification Service Class
 * 
 * Provides methods for sending various types of notifications
 * related to payout operations.
 */
export class NotificationService {
  /**
   * Send approval request notification to administrators
   * 
   * Notifies administrators that a payout requires their approval.
   * 
   * @param adminId - ID of the admin to notify
   * @param payoutId - Unique identifier for the payout
   * @param payoutDetails - Details about the payout requiring approval
   * @returns Promise<void>
   */
  async sendApprovalRequest(
    adminId: number,
    payoutId: string,
    payoutDetails: {
      userId: string
      amount: number
      queuePosition: number
      adminEmail?: string
    }
  ): Promise<void> {
    try {
      logger.info('Sending approval request notification', {
        adminId,
        payoutId,
        amount: payoutDetails.amount
      });

      // Get admin email (in production, this would come from database)
      const adminEmail = payoutDetails.adminEmail || `admin${adminId}@example.com`;

      const subject = `Payout Approval Required: ${payoutId}`;
      const html = `
        <h2>Payout Approval Request</h2>
        <p>A payout requires your approval:</p>
        <ul>
          <li><strong>Payout ID:</strong> ${payoutId}</li>
          <li><strong>User ID:</strong> ${payoutDetails.userId}</li>
          <li><strong>Amount:</strong> $${payoutDetails.amount.toLocaleString()}</li>
          <li><strong>Queue Position:</strong> ${payoutDetails.queuePosition}</li>
        </ul>
        <p>Please review and approve this payout in the admin dashboard.</p>
      `;

      const text = `
Payout Approval Request

A payout requires your approval:
- Payout ID: ${payoutId}
- User ID: ${payoutDetails.userId}
- Amount: $${payoutDetails.amount.toLocaleString()}
- Queue Position: ${payoutDetails.queuePosition}

Please review and approve this payout in the admin dashboard.
      `;

      await sendEmail({
        to: adminEmail,
        subject,
        html,
        text,
      });

      logger.info('Approval request notification sent', {
        adminId,
        payoutId,
        recipient: adminEmail,
      });
    } catch (error) {
      logger.error('Failed to send approval request notification', {
        adminId,
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - notification failures shouldn't block the workflow
    }
  }

  /**
   * Send payout approved notification
   * 
   * Notifies stakeholders that a payout has been fully approved.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param userId - ID of the member receiving the payout
   * @param approvalDetails - Details about the approval
   * @returns Promise<void>
   */
  async sendPayoutApproved(
    payoutId: string,
    userId: string,
    approvalDetails: {
      amount: number
      approvalCount: number
      finalApprover: string
      userEmail?: string
    }
  ): Promise<void> {
    try {
      logger.info('Sending payout approved notification', {
        payoutId,
        userId,
        amount: approvalDetails.amount
      });

      // Get user email (in production, this would come from database)
      const userEmail = approvalDetails.userEmail || `user${userId}@example.com`;

      const subject = `Your Payout Has Been Approved!`;
      const html = `
        <h2>Congratulations! Your Payout Has Been Approved</h2>
        <p>We're pleased to inform you that your payout has been fully approved:</p>
        <ul>
          <li><strong>Payout ID:</strong> ${payoutId}</li>
          <li><strong>Amount:</strong> $${approvalDetails.amount.toLocaleString()}</li>
          <li><strong>Approvals:</strong> ${approvalDetails.approvalCount}</li>
        </ul>
        <p>Your payment will be processed shortly. You'll receive another notification once the payment has been sent.</p>
        <p>Thank you for being a valued member of Home Solutions!</p>
      `;

      const text = `
Congratulations! Your Payout Has Been Approved

We're pleased to inform you that your payout has been fully approved:
- Payout ID: ${payoutId}
- Amount: $${approvalDetails.amount.toLocaleString()}
- Approvals: ${approvalDetails.approvalCount}

Your payment will be processed shortly. You'll receive another notification once the payment has been sent.

Thank you for being a valued member of Home Solutions!
      `;

      await sendEmail({
        to: userEmail,
        subject,
        html,
        text,
      });

      logger.info('Payout approved notification sent', {
        payoutId,
        userId,
        recipient: userEmail,
      });
    } catch (error) {
      logger.error('Failed to send payout approved notification', {
        payoutId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - notification failures shouldn't block the workflow
    }
  }

  /**
   * Send payout rejected notification
   * 
   * Notifies stakeholders that a payout has been rejected.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param userId - ID of the member who would have received the payout
   * @param rejectionDetails - Details about the rejection
   * @returns Promise<void>
   */
  async sendPayoutRejected(
    payoutId: string,
    userId: string,
    rejectionDetails: {
      reason?: string
      rejectedBy: string
      userEmail?: string
    }
  ): Promise<void> {
    try {
      logger.info('Sending payout rejected notification', {
        payoutId,
        userId,
        reason: rejectionDetails.reason
      });

      // Get user email (in production, this would come from database)
      const userEmail = rejectionDetails.userEmail || `user${userId}@example.com`;

      const subject = `Payout Status Update`;
      const html = `
        <h2>Payout Status Update</h2>
        <p>We regret to inform you that your payout request has been declined:</p>
        <ul>
          <li><strong>Payout ID:</strong> ${payoutId}</li>
          ${rejectionDetails.reason ? `<li><strong>Reason:</strong> ${rejectionDetails.reason}</li>` : ''}
        </ul>
        <p>If you have questions about this decision, please contact our support team.</p>
        <p>Thank you for your understanding.</p>
      `;

      const text = `
Payout Status Update

We regret to inform you that your payout request has been declined:
- Payout ID: ${payoutId}
${rejectionDetails.reason ? `- Reason: ${rejectionDetails.reason}` : ''}

If you have questions about this decision, please contact our support team.

Thank you for your understanding.
      `;

      await sendEmail({
        to: userEmail,
        subject,
        html,
        text,
      });

      logger.info('Payout rejected notification sent', {
        payoutId,
        userId,
        recipient: userEmail,
      });
    } catch (error) {
      logger.error('Failed to send payout rejected notification', {
        payoutId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - notification failures shouldn't block the workflow
    }
  }

  /**
   * Send notification to pending approvers
   * 
   * Notifies administrators who still need to approve a payout.
   * 
   * @param payoutId - Unique identifier for the payout
   * @param pendingApprovers - List of admin IDs who need to approve
   * @param payoutDetails - Details about the payout
   * @returns Promise<void>
   */
  async sendPendingApprovalReminder(
    payoutId: string,
    pendingApprovers: number[],
    payoutDetails: {
      amount: number
      currentApprovals: number
      requiredApprovals: number
    }
  ): Promise<void> {
    try {
      logger.info('Sending pending approval reminders', {
        payoutId,
        pendingApproversCount: pendingApprovers.length,
        currentApprovals: payoutDetails.currentApprovals,
        requiredApprovals: payoutDetails.requiredApprovals
      })

      // Send notification to each pending approver
      for (const adminId of pendingApprovers) {
        await this.sendApprovalRequest(adminId, payoutId, {
          userId: '', // Will be populated from payout details
          amount: payoutDetails.amount,
          queuePosition: 0 // Will be populated from payout details
        })
      }

      logger.info('Pending approval reminders sent', {
        payoutId,
        recipientCount: pendingApprovers.length
      })
    } catch (error) {
      logger.error('Failed to send pending approval reminders', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      // Don't throw - notification failures shouldn't block the workflow
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
