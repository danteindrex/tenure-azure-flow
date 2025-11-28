/**
 * Winner Selector Service
 * 
 * This service is responsible for selecting eligible members for payout
 * based on queue position and validating their eligibility.
 * 
 * Requirements:
 * - 2.1: Query active_member_queue_view for eligible members
 * - 2.2: Filter by is_eligible = true AND has_received_payout = false
 * - 2.3: Order by queue_position ASC
 * - 2.4: Limit to potential winner count
 * - 2.5: Validate winners before payout creation
 * - 2.7: Check KYC status and subscription status
 * - 2.8-2.10: Create payout records with proper data
 * 
 * Usage:
 * ```typescript
 * const selector = new WinnerSelector()
 * const winners = await selector.getEligibleMembers(3)
 * const validation = await selector.validateWinner(winners[0].userId)
 * if (validation.isValid) {
 *   const result = await selector.createPayoutRecords(winners, adminId)
 * }
 * ```
 */

import { db } from '../config/database'
import { sql, eq, and, inArray } from 'drizzle-orm'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import {
  Winner,
  ValidationResult,
  PayoutCreationRequest,
  PayoutCreationResult
} from '../types/winner.types'
import { payoutManagement, kycVerification, userSubscriptions } from '../../drizzle/schema'

export class WinnerSelector {
  /**
   * Get eligible members from active_member_queue_view
   * 
   * Requirements:
   * - 2.1: Query active_member_queue_view
   * - 2.2: Filter by is_eligible = true AND has_received_payout = false
   * - 2.3: Order by queue_position ASC
   * - 2.4: Limit to potential winner count
   * 
   * @param count - Number of winners to select
   * @returns Promise<Winner[]> - List of selected winners
   */
  async getEligibleMembers(count: number): Promise<Winner[]> {
    try {
      logger.info('Selecting eligible members for payout', { count })

      // Query active_member_queue_view for eligible members
      const result = await db.execute<{
        user_id: string
        email: string
        first_name: string | null
        last_name: string | null
        middle_name: string | null
        full_name: string | null
        queue_position: number
        tenure_start_date: Date
        last_payment_date: Date
        total_successful_payments: number
        lifetime_payment_total: string
        subscription_status: string
        subscription_id: string
      }>(sql`
        SELECT 
          user_id,
          email,
          first_name,
          last_name,
          middle_name,
          full_name,
          queue_position,
          tenure_start_date,
          last_payment_date,
          total_successful_payments,
          lifetime_payment_total,
          subscription_status,
          subscription_id
        FROM active_member_queue_view
        WHERE is_eligible = true
        AND has_received_payout = false
        ORDER BY queue_position ASC
        LIMIT ${count}
      `)

      const winners: Winner[] = result.rows.map(row => ({
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
        queuePosition: row.queue_position,
        tenureStartDate: row.tenure_start_date,
        lastPaymentDate: row.last_payment_date,
        totalPayments: row.total_successful_payments,
        lifetimeTotal: Number(row.lifetime_payment_total),
        subscriptionStatus: row.subscription_status,
        subscriptionId: row.subscription_id
      }))

      logger.info('Eligible members selected', {
        requested: count,
        selected: winners.length,
        winners: winners.map(w => ({
          userId: w.userId,
          queuePosition: w.queuePosition,
          email: w.email
        }))
      })

      return winners
    } catch (error) {
      logger.error('Error selecting eligible members', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        count
      })
      throw new Error('Failed to select eligible members')
    }
  }

  /**
   * Validate a winner's eligibility for payout
   * 
   * Requirement 2.7: Check KYC status and subscription status
   * 
   * Validates:
   * - KYC verification status = 'verified'
   * - Subscription status IN ('active', 'trialing')
   * 
   * @param userId - User ID to validate
   * @returns Promise<ValidationResult> - Validation result with detailed errors
   */
  async validateWinner(userId: string): Promise<ValidationResult> {
    try {
      logger.debug('Validating winner eligibility', { userId })

      const errors: string[] = []
      const warnings: string[] = []
      let kycVerified = false
      let hasActiveSubscription = false
      let hasValidBankInfo = false
      let hasValidTaxInfo = false

      // Check KYC verification status
      try {
        const kycResult = await db
          .select({
            status: kycVerification.status,
            verifiedAt: kycVerification.verifiedAt
          })
          .from(kycVerification)
          .where(eq(kycVerification.userId, userId))
          .limit(1)

        if (kycResult.length === 0) {
          errors.push('No KYC verification record found')
        } else if (kycResult[0].status !== 'verified') {
          errors.push(`KYC verification status is '${kycResult[0].status}', must be 'verified'`)
        } else {
          kycVerified = true
          logger.debug('KYC verification passed', {
            userId,
            verifiedAt: kycResult[0].verifiedAt
          })
        }
      } catch (error) {
        errors.push('Failed to check KYC verification status')
        logger.error('Error checking KYC status', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Check subscription status
      try {
        const subscriptionResult = await db
          .select({
            status: userSubscriptions.status,
            subscriptionId: userSubscriptions.id
          })
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, userId))
          .limit(1)

        if (subscriptionResult.length === 0) {
          errors.push('No subscription record found')
        } else {
          const status = subscriptionResult[0].status
          if (status !== 'active' && status !== 'trialing') {
            errors.push(`Subscription status is '${status}', must be 'active' or 'trialing'`)
          } else {
            hasActiveSubscription = true
            logger.debug('Subscription validation passed', {
              userId,
              status,
              subscriptionId: subscriptionResult[0].subscriptionId
            })
          }
        }
      } catch (error) {
        errors.push('Failed to check subscription status')
        logger.error('Error checking subscription status', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Note: Bank info and tax info validation will be done in later tasks
      // For now, we'll set them to true with warnings
      hasValidBankInfo = true
      hasValidTaxInfo = true
      warnings.push('Bank information validation not yet implemented')
      warnings.push('Tax information validation not yet implemented')

      const isValid = kycVerified && hasActiveSubscription && errors.length === 0

      const result: ValidationResult = {
        isValid,
        kycVerified,
        hasActiveSubscription,
        hasValidBankInfo,
        hasValidTaxInfo,
        errors,
        warnings
      }

      logger.info('Winner validation completed', {
        userId,
        isValid,
        kycVerified,
        hasActiveSubscription,
        errorCount: errors.length,
        warningCount: warnings.length
      })

      return result
    } catch (error) {
      logger.error('Error validating winner', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      return {
        isValid: false,
        kycVerified: false,
        hasActiveSubscription: false,
        hasValidBankInfo: false,
        hasValidTaxInfo: false,
        errors: ['Validation failed due to system error'],
        warnings: []
      }
    }
  }

  /**
   * Create payout records for selected winners
   * 
   * Requirements:
   * - 2.8: Generate unique payout_id for each winner
   * - 2.9: Create records in payout_management table with status 'pending_approval'
   * - 2.10: Store eligibility snapshot in eligibility_check JSONB field
   * - 3.1-3.7: Initialize approval_workflow and audit_trail arrays
   * 
   * @param winners - List of winners to create payouts for
   * @param initiatedBy - Admin user ID who initiated the payout
   * @param notes - Optional notes about the payout creation
   * @returns Promise<PayoutCreationResult> - Result with created payout IDs and failures
   */
  async createPayoutRecords(
    winners: Winner[],
    initiatedBy: number,
    notes?: string
  ): Promise<PayoutCreationResult> {
    try {
      logger.info('Creating payout records', {
        winnerCount: winners.length,
        initiatedBy,
        hasNotes: !!notes
      })

      const payoutIds: string[] = []
      const failedUsers: Array<{ userId: string; reason: string }> = []

      // Use transaction for atomicity
      await db.transaction(async (tx) => {
        for (const winner of winners) {
          try {
            // Validate winner before creating payout
            const validation = await this.validateWinner(winner.userId)

            if (!validation.isValid) {
              failedUsers.push({
                userId: winner.userId,
                reason: validation.errors.join('; ')
              })
              logger.warn('Skipping payout creation for invalid winner', {
                userId: winner.userId,
                errors: validation.errors
              })
              continue
            }

            // Generate unique payout ID
            const payoutId = uuidv4()

            // Create eligibility snapshot
            const eligibilityCheck = {
              queuePosition: winner.queuePosition,
              tenureStartDate: winner.tenureStartDate.toISOString(),
              lastPaymentDate: winner.lastPaymentDate.toISOString(),
              totalPayments: winner.totalPayments,
              lifetimeTotal: winner.lifetimeTotal,
              subscriptionStatus: winner.subscriptionStatus,
              subscriptionId: winner.subscriptionId,
              selectionCriteria: 'Automatic selection based on queue position',
              timestamp: new Date().toISOString(),
              kycVerified: validation.kycVerified,
              hasActiveSubscription: validation.hasActiveSubscription
            }

            // Initialize approval workflow
            const approvalWorkflow = [
              {
                step: 1,
                status: 'pending',
                requiredApprovals: 2,
                currentApprovals: 0,
                approvers: [],
                createdAt: new Date().toISOString()
              }
            ]

            // Initialize audit trail
            const auditTrail = [
              {
                action: 'payout_created',
                actor: `admin:${initiatedBy}`,
                timestamp: new Date().toISOString(),
                details: {
                  payoutId,
                  userId: winner.userId,
                  queuePosition: winner.queuePosition,
                  amount: 100000,
                  notes: notes || null
                }
              }
            ]

            // Initialize internal notes
            const internalNotes = notes
              ? [
                  {
                    adminId: initiatedBy,
                    note: notes,
                    timestamp: new Date().toISOString()
                  }
                ]
              : []

            // Create payout record
            const [payout] = await tx
              .insert(payoutManagement)
              .values({
                payoutId,
                userId: winner.userId,
                queuePosition: winner.queuePosition,
                amount: '100000.00',
                currency: 'USD',
                status: 'pending_approval',
                eligibilityCheck,
                approvalWorkflow,
                auditTrail,
                internalNotes
              })
              .returning({ id: payoutManagement.id, payoutId: payoutManagement.payoutId })

            // SYNC: Update member_status to 'Won' when payout is created
            // This locks the user's queue entry and marks them as winner
            await tx.execute(sql`
              UPDATE user_memberships
              SET member_status = 'Won',
                  updated_at = NOW()
              WHERE user_id = ${winner.userId}::uuid
            `)

            logger.info(`Member status set to Won for user ${winner.userId}`)

            payoutIds.push(payout.payoutId)

            logger.info('Payout record created', {
              payoutId: payout.payoutId,
              userId: winner.userId,
              queuePosition: winner.queuePosition
            })
          } catch (error) {
            failedUsers.push({
              userId: winner.userId,
              reason: error instanceof Error ? error.message : 'Unknown error'
            })
            logger.error('Failed to create payout record for winner', {
              userId: winner.userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      })

      const result: PayoutCreationResult = {
        success: payoutIds.length > 0,
        payoutIds,
        failedUsers,
        createdCount: payoutIds.length,
        failedCount: failedUsers.length
      }

      logger.info('Payout record creation completed', {
        totalWinners: winners.length,
        created: result.createdCount,
        failed: result.failedCount,
        success: result.success
      })

      return result
    } catch (error) {
      logger.error('Error creating payout records', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        winnerCount: winners.length
      })
      throw new Error('Failed to create payout records')
    }
  }
}

export default WinnerSelector
