/**
 * Membership Manager Service
 * 
 * Manages the lifecycle of member memberships after payout completion.
 * Handles scheduling membership removal 12 months after payout,
 * executing removals, and reactivating memberships when members pay again.
 * 
 * Business Rules:
 * - Winners are removed from active membership 12 months after payout
 * - Members can rejoin by making a new payment
 * - Queue position is recalculated automatically by the view
 * 
 * Requirements: 12.1-12.10
 */

import { db } from '../config/database'
import { payoutManagement } from '../../drizzle/schema'
import { eq, and, lte, sql } from 'drizzle-orm'
import { logger } from '../utils/logger'
import { notificationService } from './notification.service'
import { PAYOUT_STATUS } from '../config/status-ids'

/**
 * Result of a membership removal operation
 */
export interface RemovalResult {
  userId: string
  payoutDate: Date
  removalDate: Date
  removed: boolean
  reason?: string
}

/**
 * Status of a member's membership
 */
export interface MembershipStatus {
  userId: string
  hasReceivedPayout: boolean
  payoutDate?: Date
  scheduledRemovalDate?: Date
  isActive: boolean
  canReactivate: boolean
}

/**
 * Membership Manager Service Class
 * 
 * Provides methods for managing member membership lifecycle after payouts.
 */
export class MembershipManagerService {
  private readonly REMOVAL_DELAY_MONTHS = 12

  /**
   * Schedule membership removal for a winner
   * 
   * Requirement 12.1: Calculate removal date as payout date + 12 months
   * Requirement 12.2: Store removal date in processing JSONB field
   * 
   * This method is called after a payout is completed to schedule
   * the automatic removal of the member's active membership.
   * 
   * @param userId - ID of the member who received the payout
   * @param payoutDate - Date when the payout was completed
   * @returns Promise<void>
   */
  async scheduleMembershipRemoval(
    userId: string,
    payoutDate: Date
  ): Promise<void> {
    try {
      logger.info('Scheduling membership removal', {
        userId,
        payoutDate: payoutDate.toISOString()
      })

      // Calculate removal date: payout date + 12 months
      const removalDate = new Date(payoutDate)
      removalDate.setMonth(removalDate.getMonth() + this.REMOVAL_DELAY_MONTHS)

      logger.debug('Calculated removal date', {
        userId,
        payoutDate: payoutDate.toISOString(),
        removalDate: removalDate.toISOString(),
        delayMonths: this.REMOVAL_DELAY_MONTHS
      })

      // Find the completed payout record for this user
      const payout = await db.query.payoutManagement.findFirst({
        where: and(
          eq(payoutManagement.userId, userId),
          eq(payoutManagement.payoutStatusId, PAYOUT_STATUS.COMPLETED)
        ),
        orderBy: (payoutManagement, { desc }) => [desc(payoutManagement.createdAt)]
      })

      if (!payout) {
        throw new Error(`No completed payout found for user: ${userId}`)
      }

      // Get existing processing data or initialize
      const processing = (payout.processing as any) || {}

      // Store removal date in processing JSONB field
      processing.membership_removal_scheduled = removalDate.toISOString()
      processing.removal_reason = `12 months after payout on ${payoutDate.toISOString()}`
      processing.removal_scheduled_at = new Date().toISOString()

      // Update payout record with scheduled removal
      await db
        .update(payoutManagement)
        .set({
          processing: processing as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.id, payout.id))

      // Update audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: 'membership_removal_scheduled',
        actor: 'system',
        timestamp: new Date().toISOString(),
        details: {
          userId,
          payoutDate: payoutDate.toISOString(),
          scheduledRemovalDate: removalDate.toISOString(),
          delayMonths: this.REMOVAL_DELAY_MONTHS
        }
      })

      await db
        .update(payoutManagement)
        .set({
          auditTrail: auditTrail as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.id, payout.id))

      logger.info('Membership removal scheduled successfully', {
        userId,
        payoutId: payout.payoutId,
        payoutDate: payoutDate.toISOString(),
        scheduledRemovalDate: removalDate.toISOString()
      })
    } catch (error) {
      logger.error('Failed to schedule membership removal', {
        userId,
        payoutDate: payoutDate.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Check for memberships that are due for removal
   * 
   * Requirement 12.3: Query payout_management for due removals
   * 
   * This method queries the database for all payouts where:
   * - Status is 'completed'
   * - membership_removal_scheduled date has passed
   * - membership_removed is not true
   * 
   * @returns Promise<RemovalResult[]> - Array of members due for removal
   */
  async checkMembershipRemovals(): Promise<RemovalResult[]> {
    try {
      logger.info('Checking for membership removals due')

      const now = new Date()

      // Query for all completed payouts
      // We'll filter by removal date in code since it's stored in the processing JSON field
      const payouts = await db.query.payoutManagement.findMany({
        where: eq(payoutManagement.payoutStatusId, PAYOUT_STATUS.COMPLETED)
      })

      logger.debug('Found completed payouts to check for removal', {
        count: payouts.length,
        currentTime: now.toISOString()
      })

      // Filter payouts where removal is due and not already removed
      const dueForRemoval = payouts.filter(payout => {
        const processing = (payout.processing as any) || {}
        const alreadyRemoved = processing.membership_removed === true
        const scheduledRemovalDate = processing.membership_removal_scheduled
          ? new Date(processing.membership_removal_scheduled)
          : null

        // Skip if already removed
        if (alreadyRemoved) {
          logger.debug('Skipping already removed membership', {
            userId: payout.userId,
            payoutId: payout.payoutId
          })
          return false
        }

        // Skip if no removal date scheduled
        if (!scheduledRemovalDate) {
          return false
        }

        // Include if scheduled date has passed
        return scheduledRemovalDate <= now
      })

      logger.info('Memberships due for removal', {
        totalPayouts: payouts.length,
        dueForRemoval: dueForRemoval.length
      })

      // Build removal results
      const results: RemovalResult[] = dueForRemoval.map(payout => {
        const processing = (payout.processing as any) || {}
        const scheduledDate = processing.membership_removal_scheduled
          ? new Date(processing.membership_removal_scheduled)
          : new Date()

        return {
          userId: payout.userId,
          payoutDate: payout.createdAt ?? new Date(),
          removalDate: scheduledDate,
          removed: false,
          reason: processing.removal_reason || 'Scheduled removal after payout'
        }
      })

      logger.info('Membership removal check complete', {
        dueForRemovalCount: results.length,
        userIds: results.map(r => r.userId)
      })

      return results
    } catch (error) {
      logger.error('Failed to check membership removals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Remove membership for a user
   * 
   * Requirement 12.4: Call subscription service API to cancel subscription
   * Requirement 12.5: Update processing JSONB setting membership_removed = true
   * Requirement 12.9: Send notification email to member
   * 
   * This method cancels the member's subscription and marks the membership
   * as removed in the payout record.
   * 
   * @param userId - ID of the member whose membership should be removed
   * @returns Promise<void>
   */
  async removeMembership(userId: string): Promise<void> {
    try {
      logger.info('Removing membership', { userId })

      // Find the completed payout record for this user
      const payout = await db.query.payoutManagement.findFirst({
        where: and(
          eq(payoutManagement.userId, userId),
          eq(payoutManagement.payoutStatusId, PAYOUT_STATUS.COMPLETED)
        ),
        orderBy: (payoutManagement, { desc }) => [desc(payoutManagement.createdAt)]
      })

      if (!payout) {
        throw new Error(`No completed payout found for user: ${userId}`)
      }

      // Check if already removed
      const processing = (payout.processing as any) || {}
      if (processing.membership_removed === true) {
        logger.warn('Membership already removed', {
          userId,
          payoutId: payout.payoutId,
          removedAt: processing.membership_removed_at
        })
        return
      }

      // Call subscription service API to cancel subscription
      try {
        await this.cancelSubscriptionViaAPI(userId)
        logger.info('Subscription cancelled via API', { userId })
      } catch (error) {
        logger.error('Failed to cancel subscription via API', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        // Continue with marking as removed even if API call fails
        // This allows manual intervention if needed
      }

      // Update processing JSONB setting membership_removed = true
      processing.membership_removed = true
      processing.membership_removed_at = new Date().toISOString()
      processing.removal_executed_at = new Date().toISOString()

      await db
        .update(payoutManagement)
        .set({
          processing: processing as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.id, payout.id))

      // Update audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: 'membership_removed',
        actor: 'system',
        timestamp: new Date().toISOString(),
        details: {
          userId,
          payoutId: payout.payoutId,
          scheduledRemovalDate: processing.membership_removal_scheduled,
          actualRemovalDate: new Date().toISOString()
        }
      })

      await db
        .update(payoutManagement)
        .set({
          auditTrail: auditTrail as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.id, payout.id))

      // Send notification email to member
      try {
        await this.sendMembershipRemovalNotification(userId, payout.payoutId)
        logger.info('Membership removal notification sent', { userId })
      } catch (error) {
        logger.error('Failed to send membership removal notification', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        // Don't throw - notification failure shouldn't block removal
      }

      logger.info('Membership removed successfully', {
        userId,
        payoutId: payout.payoutId,
        removedAt: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to remove membership', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Cancel subscription via subscription service API
   * 
   * Makes an HTTP request to the subscription service to cancel
   * the member's subscription.
   * 
   * @param userId - ID of the member whose subscription should be cancelled
   * @returns Promise<void>
   */
  private async cancelSubscriptionViaAPI(userId: string): Promise<void> {
    const subscriptionServiceUrl = process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001'
    
    try {
      logger.debug('Calling subscription service API', {
        userId,
        url: subscriptionServiceUrl
      })

      // Make API call to subscription service
      const response = await fetch(`${subscriptionServiceUrl}/api/subscriptions/${userId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        },
        body: JSON.stringify({
          reason: 'membership_removal_after_payout',
          canceledBy: 'payout_service'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Subscription service returned ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      logger.info('Subscription cancelled successfully', {
        userId,
        result
      })
    } catch (error) {
      logger.error('Failed to call subscription service API', {
        userId,
        subscriptionServiceUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Send membership removal notification to member
   * 
   * Sends an email to the member explaining that their membership
   * has been removed and they can rejoin by making a new payment.
   * 
   * @param userId - ID of the member
   * @param payoutId - ID of the payout that triggered the removal
   * @returns Promise<void>
   */
  private async sendMembershipRemovalNotification(
    userId: string,
    payoutId: string
  ): Promise<void> {
    try {
      logger.debug('Sending membership removal notification', {
        userId,
        payoutId
      })

      // TODO: Implement actual email sending via notification service
      // For now, just log the notification
      logger.info('Membership removal notification would be sent', {
        userId,
        payoutId,
        subject: 'Your Membership Status Update',
        message: 'Your membership has been removed 12 months after receiving your payout. You can rejoin by making a new payment.'
      })

      // In production, this would call:
      // await notificationService.sendMembershipRemovalNotification(userId, payoutId)
    } catch (error) {
      logger.error('Failed to send membership removal notification', {
        userId,
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Reactivate membership for a member who pays again
   * 
   * Requirement 12.6: Allow member to re-enter queue with new tenure_start_date
   * Requirement 12.7: View automatically recalculates queue position
   * Requirement 12.8: Send welcome back email
   * Requirement 12.10: Confirm new queue position
   * 
   * This method is called when a member who previously received a payout
   * makes a new payment and wants to rejoin the queue.
   * 
   * Note: The actual queue re-entry happens automatically via the
   * active_member_queue_view when the member makes a new payment.
   * This method just handles the notification and logging.
   * 
   * @param userId - ID of the member to reactivate
   * @param newPaymentDate - Date of the new payment (becomes new tenure_start_date)
   * @returns Promise<void>
   */
  async reactivateMembership(
    userId: string,
    newPaymentDate: Date
  ): Promise<void> {
    try {
      logger.info('Reactivating membership', {
        userId,
        newPaymentDate: newPaymentDate.toISOString()
      })

      // Find the payout record for this user
      const payout = await db.query.payoutManagement.findFirst({
        where: and(
          eq(payoutManagement.userId, userId),
          eq(payoutManagement.payoutStatusId, PAYOUT_STATUS.COMPLETED)
        ),
        orderBy: (payoutManagement, { desc }) => [desc(payoutManagement.createdAt)]
      })

      if (!payout) {
        logger.warn('No payout record found for reactivation', { userId })
        // This is okay - member might be new or never received a payout
      }

      // If payout exists, update the processing field to track reactivation
      if (payout) {
        const processing = (payout.processing as any) || {}
        processing.membership_reactivated = true
        processing.membership_reactivated_at = new Date().toISOString()
        processing.new_tenure_start_date = newPaymentDate.toISOString()

        await db
          .update(payoutManagement)
          .set({
            processing: processing as any,
            updatedAt: new Date()
          })
          .where(eq(payoutManagement.id, payout.id))

        // Update audit trail
        const auditTrail = (payout.auditTrail as any[]) || []
        auditTrail.push({
          action: 'membership_reactivated',
          actor: 'system',
          timestamp: new Date().toISOString(),
          details: {
            userId,
            payoutId: payout.payoutId,
            newPaymentDate: newPaymentDate.toISOString(),
            previousRemovalDate: processing.membership_removal_scheduled
          }
        })

        await db
          .update(payoutManagement)
          .set({
            auditTrail: auditTrail as any,
            updatedAt: new Date()
          })
          .where(eq(payoutManagement.id, payout.id))
      }

      // Send welcome back email
      try {
        await this.sendWelcomeBackNotification(userId, newPaymentDate)
        logger.info('Welcome back notification sent', { userId })
      } catch (error) {
        logger.error('Failed to send welcome back notification', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        // Don't throw - notification failure shouldn't block reactivation
      }

      logger.info('Membership reactivated successfully', {
        userId,
        newPaymentDate: newPaymentDate.toISOString(),
        note: 'Queue position will be recalculated automatically by active_member_queue_view'
      })
    } catch (error) {
      logger.error('Failed to reactivate membership', {
        userId,
        newPaymentDate: newPaymentDate.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Send welcome back notification to reactivated member
   * 
   * Sends an email welcoming the member back and explaining
   * their new queue position.
   * 
   * @param userId - ID of the member
   * @param newPaymentDate - Date of the new payment
   * @returns Promise<void>
   */
  private async sendWelcomeBackNotification(
    userId: string,
    newPaymentDate: Date
  ): Promise<void> {
    try {
      logger.debug('Sending welcome back notification', {
        userId,
        newPaymentDate: newPaymentDate.toISOString()
      })

      // TODO: Implement actual email sending via notification service
      // For now, just log the notification
      logger.info('Welcome back notification would be sent', {
        userId,
        subject: 'Welcome Back to the Queue!',
        message: `Welcome back! Your new tenure started on ${newPaymentDate.toISOString()}. Your queue position will be calculated based on this date.`
      })

      // In production, this would call:
      // await notificationService.sendWelcomeBackNotification(userId, newPaymentDate)
    } catch (error) {
      logger.error('Failed to send welcome back notification', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get membership status for a user
   * 
   * Returns information about the member's current membership status,
   * including whether they've received a payout, when removal is scheduled,
   * and whether they can reactivate.
   * 
   * @param userId - ID of the member
   * @returns Promise<MembershipStatus> - Current membership status
   */
  async getMembershipStatus(userId: string): Promise<MembershipStatus> {
    try {
      logger.debug('Getting membership status', { userId })

      // Find the most recent payout for this user
      const payout = await db.query.payoutManagement.findFirst({
        where: and(
          eq(payoutManagement.userId, userId),
          eq(payoutManagement.payoutStatusId, PAYOUT_STATUS.COMPLETED)
        ),
        orderBy: (payoutManagement, { desc }) => [desc(payoutManagement.createdAt)]
      })

      if (!payout) {
        // No payout found - member has not received a payout
        return {
          userId,
          hasReceivedPayout: false,
          isActive: true,
          canReactivate: false
        }
      }

      const processing = (payout.processing as any) || {}
      const membershipRemoved = processing.membership_removed === true
      const scheduledRemovalDate = processing.membership_removal_scheduled
        ? new Date(processing.membership_removal_scheduled)
        : null
      const now = new Date()

      // Determine if membership is still active
      const isActive = !membershipRemoved &&
        (!scheduledRemovalDate || scheduledRemovalDate > now)

      // Can reactivate if membership has been removed
      const canReactivate = membershipRemoved

      const status: MembershipStatus = {
        userId,
        hasReceivedPayout: true,
        payoutDate: payout.createdAt ?? undefined,
        scheduledRemovalDate: scheduledRemovalDate ?? undefined,
        isActive,
        canReactivate
      }

      logger.debug('Membership status retrieved', {
        userId,
        status
      })

      return status
    } catch (error) {
      logger.error('Failed to get membership status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }
}

// Export singleton instance
export const membershipManagerService = new MembershipManagerService()
