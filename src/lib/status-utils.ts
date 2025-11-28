/**
 * Status Utility Functions
 *
 * This module provides utilities for working with the dynamic status lookup system.
 * It replaces hardcoded status checks with database-driven lookups.
 *
 * Usage:
 * ```typescript
 * import { StatusService, STATUS_CATEGORIES, MEMBER_STATUS } from '@/lib/status-utils'
 *
 * // Get all statuses for a category
 * const statuses = await StatusService.getCategoryStatuses('member_eligibility')
 *
 * // Check if a status matches
 * const isActive = await StatusService.matchesStatus('member_eligibility', userStatus, ['active', 'won'])
 *
 * // Get display name for a status
 * const displayName = await StatusService.getDisplayName('member_eligibility', 'active')
 * ```
 */

import { db } from '../../drizzle/db'
import { statusCategories, statusValues, accessControlRules, protectedRoutes } from '../../drizzle/schema/status-system'
import { eq, and, inArray, sql } from 'drizzle-orm'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface StatusInfo {
  id: number
  code: string
  displayName: string
  description: string | null
  color: string | null
  icon: string | null
  sortOrder: number
  isDefault: boolean
  isTerminal: boolean
}

export interface CategoryInfo {
  id: number
  code: string
  name: string
  description: string | null
  tableName: string | null
  columnName: string | null
}

export interface AccessCheckResult {
  allowed: boolean
  redirectTo: string | null
  ruleName: string | null
  reason?: string
}

export interface UserStatuses {
  userFunnelStatus: string | null
  memberStatus: string | null
  subscriptionStatus: string | null
  kycStatus: string | null
  emailVerified: boolean
  phoneVerified: boolean
  hasProfile: boolean
}

// =====================================================
// CONSTANTS (for type-safe status references in code)
// =====================================================

export const STATUS_CATEGORIES = {
  USER_FUNNEL: 'user_funnel',
  MEMBER_ELIGIBILITY: 'member_eligibility',
  KYC_STATUS: 'kyc_status',
  VERIFICATION_STATUS: 'verification_status',
  SUBSCRIPTION_STATUS: 'subscription_status',
  PAYMENT_STATUS: 'payment_status',
  PAYOUT_STATUS: 'payout_status',
  ADMIN_STATUS: 'admin_status',
  ADMIN_ROLE: 'admin_role',
} as const

export const USER_FUNNEL_STATUS = {
  PENDING: 'pending',
  ONBOARDED: 'onboarded',
  SUSPENDED: 'suspended',
} as const

export const MEMBER_STATUS = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  WON: 'won',
  PAID: 'paid',
} as const

export const KYC_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  UNPAID: 'unpaid',
} as const

export const PAYOUT_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  SCHEDULED: 'scheduled',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const

// =====================================================
// STATUS SERVICE CLASS
// =====================================================

export class StatusService {
  // Cache for status lookups (TTL: 5 minutes)
  private static cache: Map<string, { data: any; timestamp: number }> = new Map()
  private static CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get cached data or fetch fresh
   */
  private static async getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T
    }
    const data = await fetcher()
    this.cache.set(key, { data, timestamp: Date.now() })
    return data
  }

  /**
   * Clear the cache (call after admin updates statuses)
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get all categories
   */
  static async getCategories(): Promise<CategoryInfo[]> {
    return this.getCached('categories', async () => {
      const results = await db
        .select({
          id: statusCategories.id,
          code: statusCategories.code,
          name: statusCategories.name,
          description: statusCategories.description,
          tableName: statusCategories.tableName,
          columnName: statusCategories.columnName,
        })
        .from(statusCategories)
        .where(eq(statusCategories.isActive, true))
        .orderBy(statusCategories.name)

      return results
    })
  }

  /**
   * Get all statuses for a category
   */
  static async getCategoryStatuses(categoryCode: string): Promise<StatusInfo[]> {
    return this.getCached(`statuses:${categoryCode}`, async () => {
      const results = await db
        .select({
          id: statusValues.id,
          code: statusValues.code,
          displayName: statusValues.displayName,
          description: statusValues.description,
          color: statusValues.color,
          icon: statusValues.icon,
          sortOrder: statusValues.sortOrder,
          isDefault: statusValues.isDefault,
          isTerminal: statusValues.isTerminal,
        })
        .from(statusValues)
        .innerJoin(statusCategories, eq(statusValues.categoryId, statusCategories.id))
        .where(
          and(
            eq(statusCategories.code, categoryCode),
            eq(statusValues.isActive, true)
          )
        )
        .orderBy(statusValues.sortOrder)

      return results
    })
  }

  /**
   * Get a single status by category and code
   */
  static async getStatus(categoryCode: string, statusCode: string): Promise<StatusInfo | null> {
    const statuses = await this.getCategoryStatuses(categoryCode)
    return statuses.find(s => s.code === statusCode) || null
  }

  /**
   * Get display name for a status
   */
  static async getDisplayName(categoryCode: string, statusCode: string): Promise<string> {
    const status = await this.getStatus(categoryCode, statusCode)
    return status?.displayName || statusCode
  }

  /**
   * Check if a status code matches any of the allowed statuses
   */
  static async matchesStatus(
    categoryCode: string,
    currentStatus: string | null,
    allowedStatuses: string[]
  ): Promise<boolean> {
    if (!currentStatus) return false
    return allowedStatuses.includes(currentStatus)
  }

  /**
   * Get the default status for a category
   */
  static async getDefaultStatus(categoryCode: string): Promise<StatusInfo | null> {
    const statuses = await this.getCategoryStatuses(categoryCode)
    return statuses.find(s => s.isDefault) || statuses[0] || null
  }

  /**
   * Get status ID by category and code
   */
  static async getStatusId(categoryCode: string, statusCode: string): Promise<number | null> {
    const status = await this.getStatus(categoryCode, statusCode)
    return status?.id || null
  }

  /**
   * Get status IDs for multiple codes
   */
  static async getStatusIds(categoryCode: string, statusCodes: string[]): Promise<number[]> {
    const statuses = await this.getCategoryStatuses(categoryCode)
    return statuses
      .filter(s => statusCodes.includes(s.code))
      .map(s => s.id)
  }
}

// =====================================================
// ACCESS CONTROL SERVICE
// =====================================================

export class AccessControlService {
  /**
   * Check if a user can access a specific route
   */
  static async checkRouteAccess(
    pathname: string,
    userStatuses: UserStatuses
  ): Promise<AccessCheckResult> {
    try {
      // Find matching route configuration
      const routeConfig = await db
        .select({
          id: protectedRoutes.id,
          routePattern: protectedRoutes.routePattern,
          accessRuleId: protectedRoutes.accessRuleId,
          redirectRoute: protectedRoutes.redirectRoute,
          requiresAuth: protectedRoutes.requiresAuth,
          isPublic: protectedRoutes.isPublic,
        })
        .from(protectedRoutes)
        .where(eq(protectedRoutes.isActive, true))
        .orderBy(sql`${protectedRoutes.priority} DESC`)

      // Find the best matching route
      const matchedRoute = routeConfig.find(route => {
        if (route.routePattern === pathname) return true
        if (route.routePattern.endsWith('/*')) {
          const prefix = route.routePattern.slice(0, -2)
          return pathname.startsWith(prefix)
        }
        return false
      })

      // If no route config or public route, allow access
      if (!matchedRoute || matchedRoute.isPublic) {
        return { allowed: true, redirectTo: null, ruleName: null }
      }

      // If requires auth but no user status, deny
      if (matchedRoute.requiresAuth && !userStatuses.userFunnelStatus) {
        return {
          allowed: false,
          redirectTo: '/login',
          ruleName: 'auth_required',
          reason: 'Authentication required'
        }
      }

      // If no access rule, check basic auth only
      if (!matchedRoute.accessRuleId) {
        return { allowed: true, redirectTo: null, ruleName: null }
      }

      // Get the access rule
      const [rule] = await db
        .select()
        .from(accessControlRules)
        .where(eq(accessControlRules.id, matchedRoute.accessRuleId))
        .limit(1)

      if (!rule) {
        return { allowed: true, redirectTo: null, ruleName: null }
      }

      // Check all conditions based on the rule
      const checks: boolean[] = []

      // Check user status
      if (rule.userStatusIds && rule.userStatusIds.length > 0) {
        const userStatusId = userStatuses.userFunnelStatus
          ? await StatusService.getStatusId(STATUS_CATEGORIES.USER_FUNNEL, userStatuses.userFunnelStatus)
          : null
        checks.push(userStatusId !== null && rule.userStatusIds.includes(userStatusId))
      }

      // Check member status
      if (rule.memberStatusIds && rule.memberStatusIds.length > 0) {
        const memberStatusId = userStatuses.memberStatus
          ? await StatusService.getStatusId(STATUS_CATEGORIES.MEMBER_ELIGIBILITY, userStatuses.memberStatus)
          : null
        checks.push(memberStatusId !== null && rule.memberStatusIds.includes(memberStatusId))
      }

      // Check subscription status
      if (rule.subscriptionStatusIds && rule.subscriptionStatusIds.length > 0) {
        const subStatusId = userStatuses.subscriptionStatus
          ? await StatusService.getStatusId(STATUS_CATEGORIES.SUBSCRIPTION_STATUS, userStatuses.subscriptionStatus)
          : null
        checks.push(subStatusId !== null && rule.subscriptionStatusIds.includes(subStatusId))
      }

      // Check KYC status
      if (rule.kycStatusIds && rule.kycStatusIds.length > 0) {
        const kycStatusId = userStatuses.kycStatus
          ? await StatusService.getStatusId(STATUS_CATEGORIES.KYC_STATUS, userStatuses.kycStatus)
          : null
        checks.push(kycStatusId !== null && rule.kycStatusIds.includes(kycStatusId))
      }

      // Check boolean conditions
      if (rule.requiresEmailVerified) {
        checks.push(userStatuses.emailVerified)
      }
      if (rule.requiresPhoneVerified) {
        checks.push(userStatuses.phoneVerified)
      }
      if (rule.requiresProfileComplete) {
        checks.push(userStatuses.hasProfile)
      }

      // Evaluate based on condition logic
      const allowed = rule.conditionLogic === 'any'
        ? checks.some(c => c)
        : checks.every(c => c)

      return {
        allowed,
        redirectTo: allowed ? null : matchedRoute.redirectRoute,
        ruleName: rule.name,
        reason: allowed ? undefined : `Failed access rule: ${rule.name}`
      }
    } catch (error) {
      console.error('Error checking route access:', error)
      return {
        allowed: false,
        redirectTo: '/login',
        ruleName: 'error',
        reason: 'Access check failed'
      }
    }
  }

  /**
   * Check if user is eligible for payout
   */
  static async checkPayoutEligibility(userStatuses: UserStatuses): Promise<{
    eligible: boolean
    reasons: string[]
  }> {
    const reasons: string[] = []

    // Check member status is active
    if (userStatuses.memberStatus !== MEMBER_STATUS.ACTIVE) {
      reasons.push(`Member status must be 'active', got '${userStatuses.memberStatus}'`)
    }

    // Check subscription is active or trialing
    if (
      userStatuses.subscriptionStatus !== SUBSCRIPTION_STATUS.ACTIVE &&
      userStatuses.subscriptionStatus !== SUBSCRIPTION_STATUS.TRIALING
    ) {
      reasons.push(`Subscription must be 'active' or 'trialing', got '${userStatuses.subscriptionStatus}'`)
    }

    // Check KYC is verified
    if (userStatuses.kycStatus !== KYC_STATUS.VERIFIED) {
      reasons.push(`KYC status must be 'verified', got '${userStatuses.kycStatus}'`)
    }

    return {
      eligible: reasons.length === 0,
      reasons
    }
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get user's current statuses from database
 * This should be called from API routes, not client components
 */
export async function getUserStatuses(userId: string): Promise<UserStatuses> {
  // This function would query the actual user tables
  // Implementation depends on your table structure
  const result = await db.execute(sql`
    SELECT
      u.status as user_funnel_status,
      um.member_status,
      us.status as subscription_status,
      kv.status as kyc_status,
      u.email_verified,
      EXISTS(
        SELECT 1 FROM user_contacts uc
        WHERE uc.user_id = u.id
        AND uc.contact_type = 'phone'
        AND uc.is_verified = true
      ) as phone_verified,
      EXISTS(SELECT 1 FROM user_profiles up WHERE up.user_id = u.id) as has_profile
    FROM users u
    LEFT JOIN user_memberships um ON um.user_id = u.id
    LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
    LEFT JOIN kyc_verification kv ON kv.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  `)

  const row = result.rows[0] as any

  return {
    userFunnelStatus: row?.user_funnel_status || null,
    memberStatus: row?.member_status || null,
    subscriptionStatus: row?.subscription_status || null,
    kycStatus: row?.kyc_status || null,
    emailVerified: row?.email_verified || false,
    phoneVerified: row?.phone_verified || false,
    hasProfile: row?.has_profile || false,
  }
}

/**
 * Format status for display with color badge
 */
export function formatStatusBadge(status: StatusInfo): {
  label: string
  color: string
  bgColor: string
} {
  const colorMap: Record<string, { bg: string }> = {
    '#10B981': { bg: 'bg-green-100' },    // Success/Active
    '#F59E0B': { bg: 'bg-yellow-100' },   // Warning/Pending
    '#EF4444': { bg: 'bg-red-100' },      // Error/Cancelled
    '#3B82F6': { bg: 'bg-blue-100' },     // Info/Review
    '#8B5CF6': { bg: 'bg-purple-100' },   // Special/Won
    '#06B6D4': { bg: 'bg-cyan-100' },     // Completed/Paid
    '#6B7280': { bg: 'bg-gray-100' },     // Neutral/Inactive
  }

  const colorInfo = colorMap[status.color || '#6B7280'] || colorMap['#6B7280']

  return {
    label: status.displayName,
    color: status.color || '#6B7280',
    bgColor: colorInfo.bg,
  }
}

export default StatusService
