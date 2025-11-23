/**
 * Eligibility Checker Service
 * 
 * This service is responsible for checking if payout conditions are met
 * based on company revenue and operational time requirements.
 * 
 * Requirements:
 * - 1.1: Verify total revenue >= $100,000
 * - 1.2: Verify company age >= 12 months
 * - 1.3: Calculate potential winners
 * - 1.4: Query eligible members from active_member_queue_view
 * 
 * Usage:
 * ```typescript
 * const checker = new EligibilityChecker()
 * const result = await checker.checkEligibility()
 * if (result.isEligible) {
 *   console.log(`Can payout to ${result.potentialWinners} winners`)
 * }
 * ```
 */

import { db } from '../config/database'
import { userPayments, adminAlerts, userAuditLogs } from '../config/database'
import { sql, eq } from 'drizzle-orm'
import { logger, redactSensitiveData } from '../utils/logger'
import {
  EligibilityResult,
  EligibilityCheckConfig,
  RevenueSnapshot,
  CompanyAgeInfo,
  EligibilityCheckResult,
  EligibleMemberSummary
} from '../types/eligibility.types'
import { subscriptionAPIService } from './subscription-api.service'

export class EligibilityChecker {
  private config: EligibilityCheckConfig

  constructor() {
    // Load configuration from environment variables
    const businessLaunchDate = process.env.BUSINESS_LAUNCH_DATE
    if (!businessLaunchDate) {
      throw new Error('BUSINESS_LAUNCH_DATE environment variable is required')
    }

    this.config = {
      revenueThreshold: Number(process.env.PAYOUT_THRESHOLD) || 100000,
      timeThresholdMonths: 12,
      businessLaunchDate: new Date(businessLaunchDate),
      payoutAmountPerWinner: Number(process.env.REWARD_PER_WINNER) || 100000
    }

    logger.info('EligibilityChecker initialized', {
      revenueThreshold: this.config.revenueThreshold,
      timeThresholdMonths: this.config.timeThresholdMonths,
      businessLaunchDate: this.config.businessLaunchDate.toISOString()
    })
  }

  /**
   * Get total revenue from successful payments
   *
   * Requirement 1.1: Query subscription service for total revenue >= $100,000
   * Falls back to local user_payments table if subscription service is unavailable
   *
   * @returns Promise<number> - Total revenue from succeeded payments
   */
  async getTotalRevenue(): Promise<number> {
    try {
      logger.debug('Fetching total revenue')

      // Try to get revenue from subscription service first
      const revenueFromService = await subscriptionAPIService.getTotalRevenue()

      if (revenueFromService > 0) {
        logger.info('Total revenue from subscription service', {
          totalRevenue: revenueFromService,
          meetsThreshold: revenueFromService >= this.config.revenueThreshold,
          threshold: this.config.revenueThreshold
        })
        return revenueFromService
      }

      // Fallback: Query user_payments table for sum of succeeded payments
      logger.debug('Falling back to local user_payments table')
      const result = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(${userPayments.amount}), 0)`
        })
        .from(userPayments)
        .where(eq(userPayments.status, 'succeeded'))

      const totalRevenue = Number(result[0]?.totalRevenue || 0)

      logger.info('Total revenue calculated from local database', {
        totalRevenue,
        meetsThreshold: totalRevenue >= this.config.revenueThreshold,
        threshold: this.config.revenueThreshold
      })

      return totalRevenue
    } catch (error) {
      logger.error('Error calculating total revenue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error('Failed to calculate total revenue')
    }
  }

  /**
   * Get company age in months since launch date
   * 
   * Requirement 1.2: Calculate months since BUSINESS_LAUNCH_DATE
   * 
   * @returns number - Company age in months
   */
  getCompanyAge(): number {
    const now = new Date()
    const launchDate = this.config.businessLaunchDate

    // Calculate difference in milliseconds
    const diffMs = now.getTime() - launchDate.getTime()

    // Convert to months (approximate: 30.44 days per month)
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44)

    const ageInMonths = Math.floor(diffMonths)

    logger.debug('Company age calculated', {
      launchDate: launchDate.toISOString(),
      currentDate: now.toISOString(),
      ageInMonths,
      meetsThreshold: ageInMonths >= this.config.timeThresholdMonths,
      threshold: this.config.timeThresholdMonths
    })

    return ageInMonths
  }

  /**
   * Calculate potential number of winners based on revenue
   * 
   * Requirement 1.3: Use Math.floor(revenue / 100000)
   * 
   * @param revenue - Total company revenue
   * @returns number - Number of potential winners
   */
  calculatePotentialWinners(revenue: number): number {
    const potentialWinners = Math.floor(revenue / this.config.payoutAmountPerWinner)

    logger.debug('Potential winners calculated', {
      revenue,
      payoutAmountPerWinner: this.config.payoutAmountPerWinner,
      potentialWinners
    })

    return potentialWinners
  }

  /**
   * Check if payout eligibility conditions are met
   * 
   * Requirement 1.4: Combine all eligibility checks
   * 
   * This method:
   * 1. Checks total revenue >= threshold
   * 2. Checks company age >= 12 months
   * 3. Calculates potential winners
   * 4. Determines next check date
   * 
   * @returns Promise<EligibilityResult> - Complete eligibility status
   */
  async checkEligibility(): Promise<EligibilityResult> {
    try {
      logger.info('Starting eligibility check')

      // Get total revenue
      const totalRevenue = await this.getTotalRevenue()

      // Get company age
      const companyAgeMonths = this.getCompanyAge()

      // Check if revenue requirement is met
      const meetsRevenueRequirement = totalRevenue >= this.config.revenueThreshold

      // Check if time requirement is met
      const meetsTimeRequirement = companyAgeMonths >= this.config.timeThresholdMonths

      // Both conditions must be met for eligibility
      const isEligible = meetsRevenueRequirement && meetsTimeRequirement

      // Calculate potential winners
      const potentialWinners = this.calculatePotentialWinners(totalRevenue)

      // Get eligible member count (will be 0 if not eligible)
      let eligibleMemberCount = 0
      if (isEligible) {
        eligibleMemberCount = await this.getEligibleMemberCount()
      }

      // Calculate next check date (tomorrow at 2 AM UTC)
      const nextCheckDate = new Date()
      nextCheckDate.setUTCDate(nextCheckDate.getUTCDate() + 1)
      nextCheckDate.setUTCHours(2, 0, 0, 0)

      // Build reason message if not eligible
      let reason: string | undefined
      if (!isEligible) {
        const reasons: string[] = []
        if (!meetsRevenueRequirement) {
          const shortfall = this.config.revenueThreshold - totalRevenue
          reasons.push(`Revenue shortfall: $${shortfall.toFixed(2)}`)
        }
        if (!meetsTimeRequirement) {
          const monthsRemaining = this.config.timeThresholdMonths - companyAgeMonths
          reasons.push(`Time requirement not met: ${monthsRemaining} months remaining`)
        }
        reason = reasons.join('; ')
      }

      const result: EligibilityResult = {
        isEligible,
        totalRevenue,
        companyAgeMonths,
        potentialWinners,
        eligibleMemberCount,
        nextCheckDate,
        reason,
        meetsRevenueRequirement,
        meetsTimeRequirement,
        revenueThreshold: this.config.revenueThreshold,
        timeThresholdMonths: this.config.timeThresholdMonths
      }

      logger.info('Eligibility check completed', {
        isEligible,
        totalRevenue,
        companyAgeMonths,
        potentialWinners,
        eligibleMemberCount,
        meetsRevenueRequirement,
        meetsTimeRequirement,
        reason
      })

      return result
    } catch (error) {
      logger.error('Error during eligibility check', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error('Failed to check eligibility')
    }
  }

  /**
   * Get count of eligible members from active_member_queue_view
   * 
   * Requirement 1.4: Query active_member_queue_view for eligible members
   * 
   * @returns Promise<number> - Count of eligible members
   */
  private async getEligibleMemberCount(): Promise<number> {
    try {
      logger.debug('Querying eligible member count from active_member_queue_view')

      // Query the view for eligible members who haven't received payout
      const result = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM active_member_queue_view
        WHERE is_eligible = true
        AND has_received_payout = false
      `)

      const count = Number(result.rows[0]?.count || 0)

      logger.debug('Eligible member count retrieved', { count })

      return count
    } catch (error) {
      logger.error('Error querying eligible member count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      // Return 0 instead of throwing to allow eligibility check to complete
      return 0
    }
  }

  /**
   * Get list of eligible members from active_member_queue_view
   * 
   * Requirement 1.6: Query eligible member count from active_member_queue_view
   * 
   * @returns Promise<EligibleMemberSummary[]> - List of eligible members
   */
  async getEligibleMembers(): Promise<EligibleMemberSummary[]> {
    try {
      logger.debug('Querying eligible members from active_member_queue_view')

      // Query the view for eligible members who haven't received payout
      const result = await db.execute<{
        user_id: string
        email: string
        full_name: string
        queue_position: number
        tenure_start_date: Date
        total_successful_payments: number
        lifetime_payment_total: string
        subscription_status: string
      }>(sql`
        SELECT 
          user_id,
          email,
          full_name,
          queue_position,
          tenure_start_date,
          total_successful_payments,
          lifetime_payment_total,
          subscription_status
        FROM active_member_queue_view
        WHERE is_eligible = true
        AND has_received_payout = false
        ORDER BY queue_position ASC
      `)

      const members: EligibleMemberSummary[] = result.rows.map(row => ({
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name || 'Unknown',
        queuePosition: row.queue_position,
        tenureStartDate: row.tenure_start_date,
        totalPayments: row.total_successful_payments,
        lifetimeTotal: Number(row.lifetime_payment_total),
        subscriptionStatus: row.subscription_status
      }))

      logger.info('Eligible members retrieved', { count: members.length })

      return members
    } catch (error) {
      logger.error('Error querying eligible members', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error('Failed to retrieve eligible members')
    }
  }

  /**
   * Create admin alert when eligibility conditions are met
   * 
   * Requirement 1.5: Create alert in admin_alerts table when eligible
   * 
   * @param eligibilityResult - The eligibility check result
   * @returns Promise<string> - Alert ID
   */
  async createAdminAlert(eligibilityResult: EligibilityResult): Promise<string> {
    try {
      logger.info('Creating admin alert for payout eligibility')

      const alertData = {
        title: 'Payout Eligibility Conditions Met',
        message: `The company has met payout eligibility conditions. Total revenue: $${eligibilityResult.totalRevenue.toFixed(2)}, Company age: ${eligibilityResult.companyAgeMonths} months. ${eligibilityResult.potentialWinners} potential winner(s) can be selected from ${eligibilityResult.eligibleMemberCount} eligible member(s).`,
        severity: 'info' as const,
        category: 'payout_eligible',
        status: 'new' as const,
        relatedEntity: {
          type: 'payout_eligibility',
          data: {
            totalRevenue: eligibilityResult.totalRevenue,
            companyAgeMonths: eligibilityResult.companyAgeMonths,
            potentialWinners: eligibilityResult.potentialWinners,
            eligibleMemberCount: eligibilityResult.eligibleMemberCount,
            revenueThreshold: eligibilityResult.revenueThreshold,
            timeThresholdMonths: eligibilityResult.timeThresholdMonths
          }
        },
        triggerInfo: {
          checkTimestamp: new Date().toISOString(),
          meetsRevenueRequirement: eligibilityResult.meetsRevenueRequirement,
          meetsTimeRequirement: eligibilityResult.meetsTimeRequirement
        },
        metadata: {
          nextCheckDate: eligibilityResult.nextCheckDate.toISOString(),
          source: 'eligibility-checker-service'
        }
      }

      const [alert] = await db.insert(adminAlerts).values(alertData).returning({ id: adminAlerts.id })

      logger.info('Admin alert created', {
        alertId: alert.id,
        potentialWinners: eligibilityResult.potentialWinners,
        eligibleMemberCount: eligibilityResult.eligibleMemberCount
      })

      return alert.id
    } catch (error) {
      logger.error('Error creating admin alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error('Failed to create admin alert')
    }
  }

  /**
   * Store eligibility check results in audit log
   * 
   * Requirement 1.8: Store eligibility check results in audit log
   * 
   * @param eligibilityResult - The eligibility check result
   * @param alertId - Optional alert ID if alert was created
   * @returns Promise<void>
   */
  async logEligibilityCheck(eligibilityResult: EligibilityResult, alertId?: string): Promise<void> {
    try {
      logger.debug('Logging eligibility check to audit trail')

      const auditData = {
        entityType: 'payout_eligibility',
        entityId: null, // No specific entity for eligibility checks
        action: 'eligibility_check',
        oldValues: null,
        newValues: {
          isEligible: eligibilityResult.isEligible,
          totalRevenue: eligibilityResult.totalRevenue,
          companyAgeMonths: eligibilityResult.companyAgeMonths,
          potentialWinners: eligibilityResult.potentialWinners,
          eligibleMemberCount: eligibilityResult.eligibleMemberCount,
          meetsRevenueRequirement: eligibilityResult.meetsRevenueRequirement,
          meetsTimeRequirement: eligibilityResult.meetsTimeRequirement,
          reason: eligibilityResult.reason
        },
        success: true,
        errorMessage: null,
        metadata: {
          checkTimestamp: new Date().toISOString(),
          nextCheckDate: eligibilityResult.nextCheckDate.toISOString(),
          alertId: alertId || null,
          revenueThreshold: eligibilityResult.revenueThreshold,
          timeThresholdMonths: eligibilityResult.timeThresholdMonths
        }
      }

      await db.insert(userAuditLogs).values(auditData)

      logger.debug('Eligibility check logged to audit trail', {
        isEligible: eligibilityResult.isEligible,
        alertId
      })
    } catch (error) {
      logger.error('Error logging eligibility check to audit trail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      // Don't throw - logging failure shouldn't break the eligibility check
    }
  }

  /**
   * Perform complete eligibility check with notifications
   * 
   * This method combines eligibility checking, alert creation, and audit logging.
   * It should be called by the scheduled cron job.
   * 
   * Requirements: 1.5, 1.6, 1.8
   * 
   * @returns Promise<EligibilityCheckResult> - Complete check result with alert info
   */
  async performEligibilityCheckWithNotification(): Promise<EligibilityCheckResult & { alertId?: string }> {
    try {
      logger.info('Performing eligibility check with notification')

      // Check eligibility
      const eligibility = await this.checkEligibility()

      // Get eligible members if conditions are met
      let eligibleMembers: EligibleMemberSummary[] = []
      if (eligibility.isEligible) {
        eligibleMembers = await this.getEligibleMembers()
      }

      // Create admin alert if eligible
      let alertId: string | undefined
      if (eligibility.isEligible) {
        alertId = await this.createAdminAlert(eligibility)
      }

      // Log to audit trail
      await this.logEligibilityCheck(eligibility, alertId)

      const result = {
        eligibility,
        revenue: {
          totalRevenue: eligibility.totalRevenue,
          successfulPayments: 0, // Would need separate query
          averagePaymentAmount: 0, // Would need separate query
          lastPaymentDate: new Date(), // Would need separate query
          calculatedAt: new Date()
        },
        companyAge: {
          launchDate: this.config.businessLaunchDate,
          currentDate: new Date(),
          ageInMonths: eligibility.companyAgeMonths,
          ageInDays: Math.floor((Date.now() - this.config.businessLaunchDate.getTime()) / (1000 * 60 * 60 * 24)),
          meetsRequirement: eligibility.meetsTimeRequirement,
          requiredMonths: this.config.timeThresholdMonths
        },
        eligibleMembers,
        alertId
      }

      logger.info('Eligibility check with notification completed', {
        isEligible: eligibility.isEligible,
        alertCreated: !!alertId,
        eligibleMemberCount: eligibleMembers.length
      })

      return result
    } catch (error) {
      logger.error('Error performing eligibility check with notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })

      // Log failure to audit trail
      await this.logEligibilityCheckFailure(error)

      throw error
    }
  }

  /**
   * Log eligibility check failure to audit trail
   * 
   * @param error - The error that occurred
   * @returns Promise<void>
   */
  private async logEligibilityCheckFailure(error: unknown): Promise<void> {
    try {
      const auditData = {
        entityType: 'payout_eligibility',
        entityId: null,
        action: 'eligibility_check',
        oldValues: null,
        newValues: null,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          checkTimestamp: new Date().toISOString(),
          errorStack: error instanceof Error ? error.stack : undefined
        }
      }

      await db.insert(userAuditLogs).values(auditData)
    } catch (logError) {
      logger.error('Failed to log eligibility check failure', {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        logError: logError instanceof Error ? logError.message : 'Unknown error'
      })
    }
  }
}

export default EligibilityChecker
