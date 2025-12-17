/**
 * Protected Routes API
 *
 * GET /api/admin/status-system/routes - List all protected routes
 * POST /api/admin/status-system/routes - Create new route
 * PUT /api/admin/status-system/routes - Update route
 * DELETE /api/admin/status-system/routes - Delete route
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAdminAuth } from '@/lib/admin-auth'
import { db } from '@/drizzle/db'
import { protectedRoutes, accessControlRules } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const routes = await db
          .select({
            id: protectedRoutes.id,
            routePattern: protectedRoutes.routePattern,
            routeName: protectedRoutes.routeName,
            accessRuleId: protectedRoutes.accessRuleId,
            redirectRoute: protectedRoutes.redirectRoute,
            showErrorMessage: protectedRoutes.showErrorMessage,
            errorMessage: protectedRoutes.errorMessage,
            requiresAuth: protectedRoutes.requiresAuth,
            isPublic: protectedRoutes.isPublic,
            priority: protectedRoutes.priority,
            isActive: protectedRoutes.isActive,
            ruleName: accessControlRules.name,
          })
          .from(protectedRoutes)
          .leftJoin(accessControlRules, eq(protectedRoutes.accessRuleId, accessControlRules.id))
          .orderBy(protectedRoutes.priority)

        return res.status(200).json({ routes })
      }

      case 'POST': {
        const {
          routePattern,
          routeName,
          accessRuleId,
          redirectRoute,
          showErrorMessage,
          errorMessage,
          requiresAuth,
          isPublic,
          priority
        } = req.body

        if (!routePattern) {
          return res.status(400).json({ error: 'routePattern is required' })
        }

        const [newRoute] = await db
          .insert(protectedRoutes)
          .values({
            routePattern,
            routeName,
            accessRuleId: accessRuleId || null,
            redirectRoute: redirectRoute || '/login',
            showErrorMessage: showErrorMessage || false,
            errorMessage,
            requiresAuth: requiresAuth !== false,
            isPublic: isPublic || false,
            priority: priority || 0,
            isActive: true,
          } as any)
          .returning()

        return res.status(201).json({ route: newRoute })
      }

      case 'PUT': {
        const {
          id,
          routePattern,
          routeName,
          accessRuleId,
          redirectRoute,
          showErrorMessage,
          errorMessage,
          requiresAuth,
          isPublic,
          priority,
          isActive
        } = req.body

        if (!id) {
          return res.status(400).json({ error: 'ID is required' })
        }

        const updateData: any = { updatedAt: new Date() }
        if (routePattern !== undefined) updateData.routePattern = routePattern
        if (routeName !== undefined) updateData.routeName = routeName
        if (accessRuleId !== undefined) updateData.accessRuleId = accessRuleId
        if (redirectRoute !== undefined) updateData.redirectRoute = redirectRoute
        if (showErrorMessage !== undefined) updateData.showErrorMessage = showErrorMessage
        if (errorMessage !== undefined) updateData.errorMessage = errorMessage
        if (requiresAuth !== undefined) updateData.requiresAuth = requiresAuth
        if (isPublic !== undefined) updateData.isPublic = isPublic
        if (priority !== undefined) updateData.priority = priority
        if (isActive !== undefined) updateData.isActive = isActive

        const [updated] = await db
          .update(protectedRoutes)
          .set(updateData)
          .where(eq(protectedRoutes.id, id))
          .returning()

        return res.status(200).json({ route: updated })
      }

      case 'DELETE': {
        const { id } = req.body

        if (!id) {
          return res.status(400).json({ error: 'ID is required' })
        }

        await db
          .delete(protectedRoutes)
          .where(eq(protectedRoutes.id, id))

        return res.status(200).json({ message: 'Route deleted' })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Protected routes API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAdminAuth(handler)
