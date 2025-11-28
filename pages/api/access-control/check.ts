/**
 * Access Control Check API
 *
 * This endpoint checks if the current user has access to a specific route
 * based on the dynamic access control rules in the database.
 *
 * Called by the middleware to determine route access.
 *
 * Request:
 * POST /api/access-control/check
 * Body: { pathname: string }
 *
 * Response:
 * {
 *   allowed: boolean,
 *   redirectTo: string | null,
 *   ruleName: string | null,
 *   reason?: string
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '@/lib/auth'
import { db } from '@/drizzle/db'
import { protectedRoutes, accessControlRules, statusValues, statusCategories } from '@/drizzle/schema'
import { eq, and, sql, desc } from 'drizzle-orm'

interface AccessCheckResponse {
  allowed: boolean
  redirectTo: string | null
  ruleName: string | null
  reason?: string
}

interface UserStatuses {
  userFunnelStatus: string | null
  memberStatus: string | null
  subscriptionStatus: string | null
  kycStatus: string | null
  emailVerified: boolean
  phoneVerified: boolean
  hasProfile: boolean
}

/**
 * Get user's current statuses from database
 */
async function getUserStatuses(userId: string): Promise<UserStatuses> {
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
 * Get status ID from lookup table
 */
async function getStatusId(categoryCode: string, statusCode: string): Promise<number | null> {
  const result = await db
    .select({ id: statusValues.id })
    .from(statusValues)
    .innerJoin(statusCategories, eq(statusValues.categoryId, statusCategories.id))
    .where(
      and(
        eq(statusCategories.code, categoryCode),
        eq(statusValues.code, statusCode),
        eq(statusValues.isActive, true)
      )
    )
    .limit(1)

  return result[0]?.id || null
}

/**
 * Find matching route configuration
 */
async function findMatchingRoute(pathname: string) {
  const routes = await db
    .select({
      id: protectedRoutes.id,
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
  return routes.find(route => {
    if (route.routePattern === pathname) return true
    if (route.routePattern.endsWith('/*')) {
      const prefix = route.routePattern.slice(0, -2)
      return pathname.startsWith(prefix)
    }
    return false
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccessCheckResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      allowed: false,
      redirectTo: null,
      ruleName: null,
      reason: 'Method not allowed'
    })
  }

  try {
    const { pathname } = req.body

    if (!pathname) {
      return res.status(400).json({
        allowed: false,
        redirectTo: '/login',
        ruleName: null,
        reason: 'Missing pathname'
      })
    }

    // Get session
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    })

    // Find matching route config
    const routeConfig = await findMatchingRoute(pathname)

    // If no route config or public route, allow
    if (!routeConfig || routeConfig.isPublic) {
      return res.status(200).json({
        allowed: true,
        redirectTo: null,
        ruleName: null
      })
    }

    // If requires auth but no session, deny
    if (routeConfig.requiresAuth && !session?.user) {
      return res.status(200).json({
        allowed: false,
        redirectTo: '/login',
        ruleName: 'auth_required',
        reason: 'Authentication required'
      })
    }

    // If no access rule, check basic auth only
    if (!routeConfig.accessRuleId) {
      return res.status(200).json({
        allowed: !!session?.user,
        redirectTo: session?.user ? null : '/login',
        ruleName: null
      })
    }

    // Get user's statuses
    const userStatuses = await getUserStatuses(session!.user.id)

    // Get access rule
    const [rule] = await db
      .select()
      .from(accessControlRules)
      .where(eq(accessControlRules.id, routeConfig.accessRuleId))
      .limit(1)

    if (!rule) {
      return res.status(200).json({
        allowed: true,
        redirectTo: null,
        ruleName: null
      })
    }

    // Check all conditions based on the rule
    const checks: boolean[] = []

    // Check user status
    if (rule.userStatusIds && rule.userStatusIds.length > 0) {
      const userStatusId = userStatuses.userFunnelStatus
        ? await getStatusId('user_funnel', userStatuses.userFunnelStatus)
        : null
      checks.push(userStatusId !== null && rule.userStatusIds.includes(userStatusId))
    }

    // Check member status
    if (rule.memberStatusIds && rule.memberStatusIds.length > 0) {
      const memberStatusId = userStatuses.memberStatus
        ? await getStatusId('member_eligibility', userStatuses.memberStatus)
        : null
      checks.push(memberStatusId !== null && rule.memberStatusIds.includes(memberStatusId))
    }

    // Check subscription status
    if (rule.subscriptionStatusIds && rule.subscriptionStatusIds.length > 0) {
      const subStatusId = userStatuses.subscriptionStatus
        ? await getStatusId('subscription_status', userStatuses.subscriptionStatus)
        : null
      checks.push(subStatusId !== null && rule.subscriptionStatusIds.includes(subStatusId))
    }

    // Check KYC status
    if (rule.kycStatusIds && rule.kycStatusIds.length > 0) {
      const kycStatusId = userStatuses.kycStatus
        ? await getStatusId('kyc_status', userStatuses.kycStatus)
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
    const allowed = checks.length === 0
      ? true
      : rule.conditionLogic === 'any'
        ? checks.some(c => c)
        : checks.every(c => c)

    return res.status(200).json({
      allowed,
      redirectTo: allowed ? null : routeConfig.redirectRoute,
      ruleName: rule.name,
      reason: allowed ? undefined : `Access denied by rule: ${rule.name}`
    })

  } catch (error) {
    console.error('Access control check error:', error)
    return res.status(500).json({
      allowed: false,
      redirectTo: '/login',
      ruleName: 'error',
      reason: 'Access check failed'
    })
  }
}
