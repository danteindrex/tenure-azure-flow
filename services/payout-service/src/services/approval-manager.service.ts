/**
 * Approval Manager Service
 * 
 * Manages the multi-level approval workflow for payouts.
 * Handles approval initialization, submission, and status checking.
 * 
 * Business Rules:
 * - Payouts >= $100,000 require 2 approvals from authorized administrators
 * - Approval workflow is stored in the approval_workflow JSONB field
 * - Each approval includes admin details, decision, reason, and timestamp
 * - Workflow status is tracked: pending, approved, or rejected
 * 
 * Requirements: 6.1, 6.2
 */

import { db } from '../config/database'
import { payoutManagement } from '../../drizzle/schema/membership'
import { eq } from 'drizzle-orm'
import { logger } from '../utils/logger'
import { getUserRoles } from '../config/auth'
import { notificationService } from './notification.service'
import {
  ApprovalWorkflow,
  ApprovalStatus,
  ApprovalThresholdConfig,
  Approver,
  ApprovalDecision
} from '../types/approval.types'

/**
 * Approval Manager Service Class
 * 
 * Provides methods for managing payout approval workflows
 */
export class ApprovalManagerService {
  // Default approval threshold configuration
  private readonly defaultThreshold: ApprovalThresholdConfig = {
    amount: 100000,
    requiredApprovals: 2,
    allowedRoles: ['admin', 'finance_manager']
  }

  /**
   * Initialize approval workflow for a payout
   * 
   * Creates the initial approval workflow structure and stores it in the
   * payout_management record. Determines the number of required approvals
   * based on the payout amount.
   * 
   * @param payoutId - Unique identifier for the payout
   * @returns Promise<ApprovalWorkflow> - The initialized workflow
   * @throws Error if payout not found or already has workflow
   */
  async initializeApproval(payoutId: string): Promise<ApprovalWorkflow> {
    try {
      logger.info('Initializing approval workflow', { payoutId })

      // Fetch the payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Check if workflow already exists
      const existingWorkflow = payout.approvalWorkflow as any[]
      if (existingWorkflow && existingWorkflow.length > 0) {
        logger.warn('Approval workflow already exists', { payoutId })
        throw new Error(`Approval workflow already initialized for payout: ${payoutId}`)
      }

      // Determine required approvals based on amount
      const amount = parseFloat(payout.amount)
      const requiredApprovals = this.requiresApproval(amount)
        ? this.defaultThreshold.requiredApprovals
        : 1

      // Create initial workflow structure
      const workflow: ApprovalWorkflow = {
        requiredApprovals,
        currentApprovals: 0,
        approvers: [],
        status: 'pending',
        createdAt: new Date()
      }

      // Update payout record with initialized workflow
      await db
        .update(payoutManagement)
        .set({
          approvalWorkflow: workflow as any,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      logger.info('Approval workflow initialized successfully', {
        payoutId,
        requiredApprovals,
        amount
      })

      return workflow
    } catch (error) {
      logger.error('Failed to initialize approval workflow', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Check if a payout amount requires approval
   * 
   * Determines whether a payout requires the full approval workflow
   * based on the configured threshold amount.
   * 
   * @param amount - Payout amount to check
   * @returns boolean - True if approval is required, false otherwise
   */
  requiresApproval(amount: number): boolean {
    const threshold = this.defaultThreshold.amount
    const requires = amount >= threshold

    logger.debug('Checking approval requirement', {
      amount,
      threshold,
      requiresApproval: requires
    })

    return requires
  }

  /**
   * Get the number of required approvals for a given amount
   * 
   * Returns the number of approvals needed based on the payout amount.
   * This can be extended in the future to support tiered approval levels.
   * 
   * @param amount - Payout amount
   * @returns number - Number of required approvals
   */
  getRequiredApprovalCount(amount: number): number {
    if (!this.requiresApproval(amount)) {
      return 1 // Single approval for amounts below threshold
    }

    return this.defaultThreshold.requiredApprovals
  }

  /**
   * Get approval threshold configuration
   * 
   * Returns the current approval threshold settings.
   * Useful for displaying requirements to administrators.
   * 
   * @returns ApprovalThresholdConfig - Current threshold configuration
   */
  getApprovalThreshold(): ApprovalThresholdConfig {
    return { ...this.defaultThreshold }
  }

  /**
   * Validate that an admin has permission to approve
   * 
   * Checks if the admin's role is in the allowed roles list.
   * This should be called before accepting an approval decision.
   * 
   * @param adminRole - Role of the admin attempting to approve
   * @returns boolean - True if admin can approve, false otherwise
   */
  canApprove(adminRole: string): boolean {
    const allowed = this.defaultThreshold.allowedRoles.includes(adminRole)

    logger.debug('Checking approval permission', {
      adminRole,
      allowedRoles: this.defaultThreshold.allowedRoles,
      canApprove: allowed
    })

    return allowed
  }

  /**
   * Get approval workflow for a payout
   * 
   * Retrieves the current approval workflow from the database.
   * 
   * @param payoutId - Unique identifier for the payout
   * @returns Promise<ApprovalWorkflow | null> - The workflow or null if not found
   */
  async getApprovalWorkflow(payoutId: string): Promise<ApprovalWorkflow | null> {
    try {
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        logger.warn('Payout not found when fetching workflow', { payoutId })
        return null
      }

      const workflow = payout.approvalWorkflow as ApprovalWorkflow | null

      if (!workflow) {
        logger.warn('No approval workflow found for payout', { payoutId })
        return null
      }

      return workflow
    } catch (error) {
      logger.error('Failed to get approval workflow', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Check if approval workflow is initialized
   * 
   * Verifies that a payout has an approval workflow set up.
   * 
   * @param payoutId - Unique identifier for the payout
   * @returns Promise<boolean> - True if workflow exists, false otherwise
   */
  async isWorkflowInitialized(payoutId: string): Promise<boolean> {
    try {
      const workflow = await this.getApprovalWorkflow(payoutId)
      return workflow !== null && workflow.status !== undefined
    } catch (error) {
      logger.error('Failed to check workflow initialization', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Submit an approval decision for a payout
   * 
   * Records an admin's approval or rejection decision in the workflow.
   * Validates that the admin has permission to approve and hasn't already
   * approved this payout. Updates the approval_workflow JSONB array and
   * checks if all required approvals have been obtained.
   * 
   * Requirements: 6.3, 6.7
   * 
   * @param payoutId - Unique identifier for the payout
   * @param adminId - ID of the admin making the decision
   * @param decision - Approval decision details
   * @returns Promise<void>
   * @throws Error if validation fails or payout not found
   */
  async submitApproval(
    payoutId: string,
    adminId: number,
    decision: ApprovalDecision
  ): Promise<void> {
    try {
      logger.info('Submitting approval decision', {
        payoutId,
        adminId,
        decision: decision.approved ? 'approved' : 'rejected'
      })

      // Validate admin has permission to approve
      // Convert adminId to string for getUserRoles (it expects userId as string)
      const adminUserId = adminId.toString()
      const roles = await getUserRoles(adminUserId)
      
      const hasPermission = roles.includes('admin') || roles.includes('finance_manager')
      
      if (!hasPermission) {
        logger.warn('Admin does not have permission to approve payouts', {
          adminId,
          roles
        })
        throw new Error(`Admin ${adminId} does not have permission to approve payouts. Required role: admin or finance_manager`)
      }

      logger.debug('Admin permission validated', {
        adminId,
        roles,
        hasPermission
      })

      // Fetch the payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Get current workflow
      const workflow = payout.approvalWorkflow as ApprovalWorkflow
      if (!workflow || !workflow.status) {
        throw new Error(`Approval workflow not initialized for payout: ${payoutId}`)
      }

      // Check if workflow is already complete
      if (workflow.status === 'approved' || workflow.status === 'rejected') {
        throw new Error(`Approval workflow already completed with status: ${workflow.status}`)
      }

      // Check if admin has already approved/rejected this payout
      const existingApproval = workflow.approvers.find(
        (approver) => approver.adminId === adminId
      )

      if (existingApproval && existingApproval.decision) {
        throw new Error(`Admin ${adminId} has already submitted a decision for this payout`)
      }

      // Create approver record
      const approver: Approver = {
        adminId,
        adminName: decision.adminName || `Admin ${adminId}`,
        adminEmail: '', // Will be populated from user lookup if needed
        decision: decision.approved ? 'approved' : 'rejected',
        reason: decision.reason,
        timestamp: decision.timestamp
      }

      // Add approver to workflow
      workflow.approvers.push(approver)

      // Update current approvals count if approved
      if (decision.approved) {
        workflow.currentApprovals += 1
      }

      // Check if workflow should be marked as rejected
      if (!decision.approved) {
        workflow.status = 'rejected'
        workflow.completedAt = new Date()

        logger.info('Payout rejected', {
          payoutId,
          adminId,
          reason: decision.reason
        })
      }
      // Check if all required approvals obtained
      else if (workflow.currentApprovals >= workflow.requiredApprovals) {
        workflow.status = 'approved'
        workflow.completedAt = new Date()

        logger.info('Payout fully approved', {
          payoutId,
          currentApprovals: workflow.currentApprovals,
          requiredApprovals: workflow.requiredApprovals
        })
      } else {
        logger.info('Approval recorded, more approvals needed', {
          payoutId,
          currentApprovals: workflow.currentApprovals,
          requiredApprovals: workflow.requiredApprovals
        })
      }

      // Add to audit trail
      const auditTrail = (payout.auditTrail as any[]) || []
      auditTrail.push({
        action: decision.approved ? 'approval_submitted' : 'rejection_submitted',
        actor: `admin_${adminId}`,
        timestamp: decision.timestamp.toISOString(),
        details: {
          decision: decision.approved ? 'approved' : 'rejected',
          reason: decision.reason,
          ipAddress: decision.ipAddress,
          userAgent: decision.userAgent,
          currentApprovals: workflow.currentApprovals,
          requiredApprovals: workflow.requiredApprovals
        }
      })

      // Determine new payout status based on workflow status
      let newPayoutStatus = payout.status
      if (workflow.status === 'approved') {
        newPayoutStatus = 'approved'
      } else if (workflow.status === 'rejected') {
        newPayoutStatus = 'rejected'
      }

      // Update payout record
      await db
        .update(payoutManagement)
        .set({
          approvalWorkflow: workflow as any,
          auditTrail: auditTrail as any,
          status: newPayoutStatus,
          updatedAt: new Date()
        })
        .where(eq(payoutManagement.payoutId, payoutId))

      logger.info('Approval decision recorded successfully', {
        payoutId,
        adminId,
        workflowStatus: workflow.status,
        payoutStatus: newPayoutStatus
      })
    } catch (error) {
      logger.error('Failed to submit approval decision', {
        payoutId,
        adminId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Check approval status for a payout
   * 
   * Retrieves the current approval status including completion state,
   * approval/rejection status, pending approvers, and completed approvals.
   * This method provides a comprehensive view of the approval workflow state.
   * 
   * Additionally, this method:
   * - Updates payout status to 'approved' when all required approvals are obtained
   * - Updates payout status to 'rejected' if any rejection exists
   * - Sends notifications to stakeholders when status changes
   * 
   * Requirements: 6.4, 6.5, 6.6
   * 
   * @param payoutId - Unique identifier for the payout
   * @returns Promise<ApprovalStatus> - Current approval status
   * @throws Error if payout not found or workflow not initialized
   */
  async checkApprovalStatus(payoutId: string): Promise<ApprovalStatus> {
    try {
      logger.info('Checking approval status', { payoutId })

      // Fetch the payout record
      const payout = await db.query.payoutManagement.findFirst({
        where: eq(payoutManagement.payoutId, payoutId)
      })

      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`)
      }

      // Get current workflow
      const workflow = payout.approvalWorkflow as ApprovalWorkflow
      if (!workflow || !workflow.status) {
        throw new Error(`Approval workflow not initialized for payout: ${payoutId}`)
      }

      // Determine completion and approval status
      const isComplete = workflow.status === 'approved' || workflow.status === 'rejected'
      const isApproved = workflow.status === 'approved'
      const isRejected = workflow.status === 'rejected'

      // Get completed approvals (approvers who have made a decision)
      const completedApprovals = workflow.approvers.filter(
        (approver) => approver.decision !== undefined
      )

      // Count current approvals (only count 'approved' decisions)
      const currentApprovals = workflow.approvers.filter(
        (approver) => approver.decision === 'approved'
      ).length

      // Calculate pending approvers count
      // This is the number of additional approvals still needed
      const pendingApproversCount = Math.max(
        0,
        workflow.requiredApprovals - currentApprovals
      )

      // For now, we don't track specific pending approver IDs
      // This could be enhanced in the future with a pre-assigned approver list
      const pendingApprovers: number[] = []

      // Get rejection reason if rejected
      const rejectionReason = isRejected
        ? workflow.approvers.find((a) => a.decision === 'rejected')?.reason
        : undefined

      // Check if status needs to be updated
      let statusChanged = false
      let newPayoutStatus = payout.status
      const auditTrail = (payout.auditTrail as any[]) || []

      // Update payout status to 'approved' when complete
      if (
        !isComplete &&
        currentApprovals >= workflow.requiredApprovals &&
        !workflow.approvers.some((a) => a.decision === 'rejected')
      ) {
        workflow.status = 'approved'
        workflow.completedAt = new Date()
        newPayoutStatus = 'approved'
        statusChanged = true

        // Add to audit trail
        auditTrail.push({
          action: 'approval_workflow_completed',
          actor: 'system',
          timestamp: new Date().toISOString(),
          details: {
            currentApprovals,
            requiredApprovals: workflow.requiredApprovals,
            finalStatus: 'approved'
          }
        })

        logger.info('Payout status updated to approved', {
          payoutId,
          currentApprovals,
          requiredApprovals: workflow.requiredApprovals
        })

        // Send approval notification to stakeholders
        await notificationService.sendPayoutApproved(
          payoutId,
          payout.userId,
          {
            amount: parseFloat(payout.amount),
            approvalCount: currentApprovals,
            finalApprover: completedApprovals[completedApprovals.length - 1]?.adminName || 'Unknown'
          }
        )
      }

      // Update payout status to 'rejected' if any rejection
      if (
        !isRejected &&
        workflow.approvers.some((a) => a.decision === 'rejected')
      ) {
        workflow.status = 'rejected'
        workflow.completedAt = new Date()
        newPayoutStatus = 'rejected'
        statusChanged = true

        const rejector = workflow.approvers.find((a) => a.decision === 'rejected')

        // Add to audit trail
        auditTrail.push({
          action: 'approval_workflow_rejected',
          actor: 'system',
          timestamp: new Date().toISOString(),
          details: {
            rejectedBy: rejector?.adminName || 'Unknown',
            reason: rejector?.reason,
            finalStatus: 'rejected'
          }
        })

        logger.info('Payout status updated to rejected', {
          payoutId,
          rejectedBy: rejector?.adminName,
          reason: rejector?.reason
        })

        // Send rejection notification to stakeholders
        await notificationService.sendPayoutRejected(
          payoutId,
          payout.userId,
          {
            reason: rejector?.reason,
            rejectedBy: rejector?.adminName || 'Unknown'
          }
        )
      }

      // Update database if status changed
      if (statusChanged) {
        await db
          .update(payoutManagement)
          .set({
            approvalWorkflow: workflow as any,
            auditTrail: auditTrail as any,
            status: newPayoutStatus,
            updatedAt: new Date()
          })
          .where(eq(payoutManagement.payoutId, payoutId))

        logger.info('Payout record updated with new status', {
          payoutId,
          oldStatus: payout.status,
          newStatus: newPayoutStatus
        })
      }

      const status: ApprovalStatus = {
        isComplete: workflow.status === 'approved' || workflow.status === 'rejected',
        isApproved: workflow.status === 'approved',
        isRejected: workflow.status === 'rejected',
        pendingApprovers,
        completedApprovals,
        requiredApprovals: workflow.requiredApprovals,
        currentApprovals,
        rejectionReason
      }

      logger.info('Approval status retrieved', {
        payoutId,
        isComplete: status.isComplete,
        isApproved: status.isApproved,
        isRejected: status.isRejected,
        currentApprovals,
        requiredApprovals: workflow.requiredApprovals,
        pendingCount: pendingApproversCount
      })

      return status
    } catch (error) {
      logger.error('Failed to check approval status', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Get list of payouts pending approval
   * 
   * Retrieves all payouts that are awaiting approval decisions.
   * Useful for admin dashboards to show pending work items.
   * 
   * @returns Promise<Array> - List of payouts pending approval
   */
  async getPendingApprovals(): Promise<any[]> {
    try {
      logger.info('Fetching pending approvals')

      const pendingPayouts = await db.query.payoutManagement.findMany({
        where: eq(payoutManagement.status, 'pending_approval')
      })

      logger.info('Pending approvals retrieved', {
        count: pendingPayouts.length
      })

      return pendingPayouts
    } catch (error) {
      logger.error('Failed to get pending approvals', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get approval history for a payout
   * 
   * Retrieves the complete approval history including all decisions made.
   * 
   * @param payoutId - Unique identifier for the payout
   * @returns Promise<Approver[]> - List of all approval decisions
   */
  async getApprovalHistory(payoutId: string): Promise<Approver[]> {
    try {
      const workflow = await this.getApprovalWorkflow(payoutId)

      if (!workflow) {
        throw new Error(`Approval workflow not found for payout: ${payoutId}`)
      }

      return workflow.approvers
    } catch (error) {
      logger.error('Failed to get approval history', {
        payoutId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// Export singleton instance
export const approvalManagerService = new ApprovalManagerService()

