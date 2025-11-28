/**
 * Onboarding Flow Management - SERVER SIDE ONLY
 *
 * This file uses the dynamic status lookup system for access control.
 * Status checks are now driven by the database tables:
 * - status_categories
 * - status_values
 * - access_control_rules
 * - protected_routes
 *
 * ONLY import in API routes, never in client components.
 */

import { db } from '../../drizzle/db'
import { userProfiles, userContacts } from '../../drizzle/schema/users'
import { userSubscriptions } from '../../drizzle/schema/financial'
import { user } from '../../drizzle/schema/auth'
import { userMemberships } from '../../drizzle/schema/users'
import { kycVerification } from '../../drizzle/schema/membership'
import {
  statusCategories,
  statusValues,
  accessControlRules,
  protectedRoutes
} from '../../drizzle/schema/status-system'
import { eq, and, inArray, desc, asc, sql, isNotNull } from 'drizzle-orm'

// Status codes - these match the database lookup values (Title Case)
// User Funnel Status: Tracks sign-up progress (only 2 statuses)
export const USER_STATUS = {
  PENDING: 'Pending',      // User started signup but hasn't completed PII/consent
  ONBOARDED: 'Onboarded',  // User completed all PII and consented to agreements
} as const

// Member Eligibility Status: Tracks financial rights/queue status (6 statuses)
export const MEMBER_STATUS = {
  INACTIVE: 'Inactive',    // Onboarded but hasn't paid yet (default after onboarding)
  ACTIVE: 'Active',        // Paid and current on all fees - eligible for queue
  SUSPENDED: 'Suspended',  // Failed payment, in 30-day grace period - NOT eligible
  CANCELLED: 'Cancelled',  // Failed to cure payment or manually terminated - permanently removed
  WON: 'Won',              // Winner identified, payout processing - entry locked
  PAID: 'Paid',            // Prize successfully received - final state
} as const

export type OnboardingStep =
  | 'email-verification'
  | 'complete-profile'
  | 'phone-verification'
  | 'payment'
  | 'dashboard'
  | 'suspended'
  | string // Allow dynamic step names from database

// Interface for onboarding step from database
interface OnboardingStepConfig {
  stepOrder: number
  stepName: string
  routePattern: string
  checkEmailVerified: boolean | null
  checkPhoneVerified: boolean | null
  checkProfileComplete: boolean | null
  checkSubscriptionActive: boolean | null
  checkMemberStatus: string | null
}

export interface UserOnboardingStatus {
  step: OnboardingStep
  isEmailVerified: boolean
  hasProfile: boolean
  isPhoneVerified: boolean
  hasActiveSubscription: boolean
  canAccessDashboard: boolean
  userId?: string
  profileId?: string
  nextRoute: string
  nextStep: number
  // New fields for dynamic routing
  userStatus: string | null
  memberStatus: string | null
  subscriptionStatus: string | null
  kycStatus: string | null
}

interface AccessRule {
  id: number
  name: string
  userStatusIds: number[] | null
  memberStatusIds: number[] | null
  subscriptionStatusIds: number[] | null
  kycStatusIds: number[] | null
  requiresEmailVerified: boolean
  requiresPhoneVerified: boolean
  requiresProfileComplete: boolean
  requiresActiveSubscription: boolean
  conditionLogic: string
  priority: number
}

interface RouteConfig {
  routePattern: string
  accessRuleId: number | null
  redirectRoute: string
  requiresAuth: boolean
  isPublic: boolean
  rule: AccessRule | null
}

export class OnboardingService {

  /**
   * Get all onboarding steps from database, ordered by step_order
   * This allows admin to configure the signup flow dynamically
   */
  private static async getOnboardingSteps(): Promise<OnboardingStepConfig[]> {
    const steps = await db
      .select({
        stepOrder: protectedRoutes.stepOrder,
        stepName: protectedRoutes.stepName,
        routePattern: protectedRoutes.routePattern,
        checkEmailVerified: protectedRoutes.checkEmailVerified,
        checkPhoneVerified: protectedRoutes.checkPhoneVerified,
        checkProfileComplete: protectedRoutes.checkProfileComplete,
        checkSubscriptionActive: protectedRoutes.checkSubscriptionActive,
        checkMemberStatus: protectedRoutes.checkMemberStatus,
      })
      .from(protectedRoutes)
      .where(
        and(
          eq(protectedRoutes.isOnboardingStep, true),
          eq(protectedRoutes.isActive, true),
          isNotNull(protectedRoutes.stepOrder)
        )
      )
      .orderBy(asc(protectedRoutes.stepOrder))

    return steps.map(s => ({
      stepOrder: s.stepOrder!,
      stepName: s.stepName || '',
      routePattern: s.routePattern,
      checkEmailVerified: s.checkEmailVerified,
      checkPhoneVerified: s.checkPhoneVerified,
      checkProfileComplete: s.checkProfileComplete,
      checkSubscriptionActive: s.checkSubscriptionActive,
      checkMemberStatus: s.checkMemberStatus,
    }))
  }

  /**
   * Check if a user's current state matches an onboarding step's conditions
   * Returns true if the user should be shown this step (i.e., they haven't completed it)
   */
  private static checkStepConditions(
    step: OnboardingStepConfig,
    userState: {
      emailVerified: boolean
      phoneVerified: boolean
      hasProfile: boolean
      hasSubscription: boolean
      memberStatus: string | null
    },
    isOAuthUser: boolean
  ): boolean {
    // Check member status first (e.g., Suspended)
    if (step.checkMemberStatus !== null) {
      if (userState.memberStatus === step.checkMemberStatus) {
        return true // User matches this status, show this step
      }
      return false // User doesn't match this status, skip this step
    }

    // For other conditions, check if user FAILS the condition (meaning they need this step)
    // checkEmailVerified: true means "user must have email verified to pass"
    // If user's email is NOT verified and step requires verified email, show this step

    if (step.checkEmailVerified === false && !isOAuthUser) {
      // Step expects email NOT verified - user needs to verify email
      if (!userState.emailVerified) {
        return true
      }
    }

    if (step.checkProfileComplete === false) {
      // Step expects profile NOT complete - user needs to complete profile
      if (!userState.hasProfile) {
        return true
      }
    }

    if (step.checkPhoneVerified === false) {
      // Step expects phone NOT verified - user needs to verify phone
      if (!userState.phoneVerified) {
        return true
      }
    }

    if (step.checkSubscriptionActive === false) {
      // Step expects no subscription - user needs to subscribe
      if (!userState.hasSubscription) {
        return true
      }
    }

    return false // User has completed all conditions for this step
  }

  /**
   * Get status value ID from lookup table
   * Uses case-insensitive comparison since status codes may be stored with different casing
   */
  private static async getStatusValueId(categoryCode: string, statusCode: string): Promise<number | null> {
    const result = await db
      .select({ id: statusValues.id })
      .from(statusValues)
      .innerJoin(statusCategories, eq(statusValues.categoryId, statusCategories.id))
      .where(
        and(
          eq(statusCategories.code, categoryCode),
          sql`LOWER(${statusValues.code}) = ${statusCode.toLowerCase()}`,
          eq(statusValues.isActive, true)
        )
      )
      .limit(1)

    return result[0]?.id || null
  }

  /**
   * Get route configuration from database
   */
  private static async getRouteConfig(pathname: string): Promise<RouteConfig | null> {
    const routes = await db
      .select({
        routePattern: protectedRoutes.routePattern,
        accessRuleId: protectedRoutes.accessRuleId,
        redirectRoute: protectedRoutes.redirectRoute,
        requiresAuth: protectedRoutes.requiresAuth,
        isPublic: protectedRoutes.isPublic,
        priority: protectedRoutes.priority,
      })
      .from(protectedRoutes)
      .where(eq(protectedRoutes.isActive, true))
      .orderBy(desc(protectedRoutes.priority))

    // Find best matching route
    const matchedRoute = routes.find(route => {
      if (route.routePattern === pathname) return true
      if (route.routePattern.endsWith('/*')) {
        const prefix = route.routePattern.slice(0, -2)
        return pathname.startsWith(prefix)
      }
      return false
    })

    if (!matchedRoute) return null

    // Get access rule if exists
    let rule: AccessRule | null = null
    if (matchedRoute.accessRuleId) {
      const [ruleResult] = await db
        .select()
        .from(accessControlRules)
        .where(eq(accessControlRules.id, matchedRoute.accessRuleId))
        .limit(1)

      if (ruleResult) {
        rule = ruleResult as AccessRule
      }
    }

    return {
      ...matchedRoute,
      rule,
    }
  }

  /**
   * Check if user passes an access rule
   */
  private static async checkAccessRule(
    rule: AccessRule,
    userStatuses: {
      userStatusId: number | null
      memberStatusId: number | null
      subscriptionStatusId: number | null
      kycStatusId: number | null
      emailVerified: boolean
      phoneVerified: boolean
      hasProfile: boolean
      hasSubscription: boolean
    }
  ): Promise<boolean> {
    const checks: boolean[] = []

    // Check user status
    if (rule.userStatusIds && rule.userStatusIds.length > 0) {
      checks.push(
        userStatuses.userStatusId !== null &&
        rule.userStatusIds.includes(userStatuses.userStatusId)
      )
    }

    // Check member status
    if (rule.memberStatusIds && rule.memberStatusIds.length > 0) {
      checks.push(
        userStatuses.memberStatusId !== null &&
        rule.memberStatusIds.includes(userStatuses.memberStatusId)
      )
    }

    // Check subscription status
    if (rule.subscriptionStatusIds && rule.subscriptionStatusIds.length > 0) {
      checks.push(
        userStatuses.subscriptionStatusId !== null &&
        rule.subscriptionStatusIds.includes(userStatuses.subscriptionStatusId)
      )
    }

    // Check KYC status
    if (rule.kycStatusIds && rule.kycStatusIds.length > 0) {
      checks.push(
        userStatuses.kycStatusId !== null &&
        rule.kycStatusIds.includes(userStatuses.kycStatusId)
      )
    }

    // Check boolean requirements
    if (rule.requiresEmailVerified) {
      checks.push(userStatuses.emailVerified)
    }
    if (rule.requiresPhoneVerified) {
      checks.push(userStatuses.phoneVerified)
    }
    if (rule.requiresProfileComplete) {
      checks.push(userStatuses.hasProfile)
    }
    if (rule.requiresActiveSubscription) {
      checks.push(userStatuses.hasSubscription)
    }

    // If no checks, allow by default
    if (checks.length === 0) return true

    // Evaluate based on condition logic
    return rule.conditionLogic === 'any'
      ? checks.some(c => c)
      : checks.every(c => c)
  }

  /**
   * Get the current onboarding status for a user using dynamic lookup
   * SERVER SIDE ONLY
   */
  static async getUserOnboardingStatus(userId: string, isOAuthUser?: boolean): Promise<UserOnboardingStatus> {
    try {
      // Get user data
      const betterAuthUser = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .then(rows => rows[0])

      if (!betterAuthUser) {
        throw new Error('User not found')
      }

      // Get user profile
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1)
        .then(rows => rows[0])

      // Check phone verification
      const phoneContact = await db
        .select()
        .from(userContacts)
        .where(
          and(
            eq(userContacts.userId, userId),
            eq(userContacts.contactType, 'phone'),
            eq(userContacts.isVerified, true)
          )
        )
        .limit(1)
        .then(rows => rows[0])

      // Get subscription
      const subscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .limit(1)
        .then(rows => rows[0])

      // Get membership
      const membership = await db
        .select()
        .from(userMemberships)
        .where(eq(userMemberships.userId, userId))
        .limit(1)
        .then(rows => rows[0])

      // Get KYC
      const kyc = await db
        .select()
        .from(kycVerification)
        .where(eq(kycVerification.userId, userId))
        .limit(1)
        .then(rows => rows[0])

      // Get status IDs from lookup tables
      const userStatusId = betterAuthUser.status
        ? await this.getStatusValueId('user_funnel', betterAuthUser.status)
        : null

      const memberStatusId = membership?.memberStatus
        ? await this.getStatusValueId('member_eligibility', membership.memberStatus)
        : null

      const subscriptionStatusId = subscription?.status
        ? await this.getStatusValueId('subscription_status', subscription.status)
        : null

      const kycStatusId = kyc?.status
        ? await this.getStatusValueId('kyc_status', kyc.status)
        : null

      const isEmailVerified = betterAuthUser.emailVerified || isOAuthUser || false
      const hasProfile = !!profile
      const isPhoneVerified = !!phoneContact
      const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing'

      // Build status object
      const status: UserOnboardingStatus = {
        step: 'email-verification',
        isEmailVerified,
        hasProfile,
        isPhoneVerified,
        hasActiveSubscription,
        canAccessDashboard: false,
        userId: betterAuthUser.id,
        profileId: profile?.id,
        nextRoute: '/signup',
        nextStep: 1,
        userStatus: betterAuthUser.status || null,
        memberStatus: membership?.memberStatus || null,
        subscriptionStatus: subscription?.status || null,
        kycStatus: kyc?.status || null,
      }

      // Check dashboard access using dynamic rule
      const dashboardConfig = await this.getRouteConfig('/dashboard')

      if (dashboardConfig?.rule) {
        const canAccess = await this.checkAccessRule(dashboardConfig.rule, {
          userStatusId,
          memberStatusId,
          subscriptionStatusId,
          kycStatusId,
          emailVerified: isEmailVerified,
          phoneVerified: isPhoneVerified,
          hasProfile,
          hasSubscription: hasActiveSubscription,
        })

        if (canAccess) {
          status.step = 'dashboard'
          status.canAccessDashboard = true
          status.nextRoute = '/dashboard'
          status.nextStep = 6
          return status
        }
      }

      // DYNAMIC ROUTING: Get onboarding steps from database
      // Admin can configure these via protected_routes table
      const onboardingSteps = await this.getOnboardingSteps()

      const userState = {
        emailVerified: isEmailVerified,
        phoneVerified: isPhoneVerified,
        hasProfile,
        hasSubscription: hasActiveSubscription,
        memberStatus: membership?.memberStatus || null,
      }

      // Find the first step that the user hasn't completed
      for (const step of onboardingSteps) {
        const needsThisStep = this.checkStepConditions(step, userState, isOAuthUser || false)

        if (needsThisStep) {
          status.step = step.stepName as OnboardingStep
          status.nextStep = step.stepOrder
          status.nextRoute = step.routePattern
          status.canAccessDashboard = false
          return status
        }
      }

      // If we get here and still can't access dashboard, default to last signup step
      // This handles edge cases where all steps are complete but dashboard access is still denied
      if (!status.canAccessDashboard) {
        const lastStep = onboardingSteps[onboardingSteps.length - 1]
        if (lastStep) {
          status.step = lastStep.stepName as OnboardingStep
          status.nextStep = lastStep.stepOrder
          status.nextRoute = lastStep.routePattern
        } else {
          // Fallback if no steps configured
          status.step = 'payment'
          status.nextStep = 5
          status.nextRoute = '/signup?step=5'
        }
      }

      return status
    } catch (error) {
      console.error('Error getting user onboarding status:', error)
      throw error
    }
  }

  /**
   * Check if user can access a specific route using dynamic rules
   * SERVER SIDE ONLY
   */
  static async checkRouteAccess(
    userId: string,
    pathname: string
  ): Promise<{ allowed: boolean; redirectTo: string | null }> {
    try {
      const routeConfig = await this.getRouteConfig(pathname)

      // No config = allow
      if (!routeConfig) {
        return { allowed: true, redirectTo: null }
      }

      // Public route = allow
      if (routeConfig.isPublic) {
        return { allowed: true, redirectTo: null }
      }

      // No rule = just check auth
      if (!routeConfig.rule) {
        return { allowed: true, redirectTo: null }
      }

      // Get user's current statuses
      const status = await this.getUserOnboardingStatus(userId)

      // Get status IDs
      const userStatusId = status.userStatus
        ? await this.getStatusValueId('user_funnel', status.userStatus)
        : null
      const memberStatusId = status.memberStatus
        ? await this.getStatusValueId('member_eligibility', status.memberStatus)
        : null
      const subscriptionStatusId = status.subscriptionStatus
        ? await this.getStatusValueId('subscription_status', status.subscriptionStatus)
        : null
      const kycStatusId = status.kycStatus
        ? await this.getStatusValueId('kyc_status', status.kycStatus)
        : null

      // Check rule
      const allowed = await this.checkAccessRule(routeConfig.rule, {
        userStatusId,
        memberStatusId,
        subscriptionStatusId,
        kycStatusId,
        emailVerified: status.isEmailVerified,
        phoneVerified: status.isPhoneVerified,
        hasProfile: status.hasProfile,
        hasSubscription: status.hasActiveSubscription,
      })

      return {
        allowed,
        redirectTo: allowed ? null : routeConfig.redirectRoute,
      }
    } catch (error) {
      console.error('Error checking route access:', error)
      return { allowed: false, redirectTo: '/login' }
    }
  }

  /**
   * Get the next route based on onboarding status
   * SERVER SIDE ONLY
   */
  static getNextRoute(status: UserOnboardingStatus, isOAuthUser?: boolean): string {
    return status.nextRoute
  }

  /**
   * Check if user can access dashboard
   * SERVER SIDE ONLY
   */
  static canAccessDashboard(status: UserOnboardingStatus): boolean {
    return status.canAccessDashboard
  }
}

export default OnboardingService
