/**
 * Access Control Rules API
 *
 * GET /api/admin/status-system/access-rules - List all rules
 * POST /api/admin/status-system/access-rules - Create new rule
 * PUT /api/admin/status-system/access-rules - Update rule
 * DELETE /api/admin/status-system/access-rules - Delete rule
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAdminAuth } from '@/lib/admin-auth'
import { db } from '@/drizzle/db'
import { accessControlRules } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const rules = await db
          .select()
          .from(accessControlRules)
          .orderBy(accessControlRules.priority)

        return res.status(200).json({ rules })
      }

      case 'POST': {
        const {
          name,
          description,
          userStatusIds,
          memberStatusIds,
          subscriptionStatusIds,
          kycStatusIds,
          requiresEmailVerified,
          requiresPhoneVerified,
          requiresProfileComplete,
          requiresActiveSubscription,
          conditionLogic,
          priority
        } = req.body

        if (!name) {
          return res.status(400).json({ error: 'Name is required' })
        }

        const [newRule] = await db
          .insert(accessControlRules)
          .values({
            name,
            description,
            userStatusIds: userStatusIds || [],
            memberStatusIds: memberStatusIds || [],
            subscriptionStatusIds: subscriptionStatusIds || [],
            kycStatusIds: kycStatusIds || [],
            requiresEmailVerified: requiresEmailVerified || false,
            requiresPhoneVerified: requiresPhoneVerified || false,
            requiresProfileComplete: requiresProfileComplete || false,
            requiresActiveSubscription: requiresActiveSubscription || false,
            conditionLogic: conditionLogic || 'all',
            priority: priority || 0,
            isActive: true,
          } as any)
          .returning()

        return res.status(201).json({ rule: newRule })
      }

      case 'PUT': {
        const {
          id,
          name,
          description,
          userStatusIds,
          memberStatusIds,
          subscriptionStatusIds,
          kycStatusIds,
          requiresEmailVerified,
          requiresPhoneVerified,
          requiresProfileComplete,
          requiresActiveSubscription,
          conditionLogic,
          priority,
          isActive
        } = req.body

        if (!id) {
          return res.status(400).json({ error: 'ID is required' })
        }

        const updateData: any = { updatedAt: new Date() }
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (userStatusIds !== undefined) updateData.userStatusIds = userStatusIds
        if (memberStatusIds !== undefined) updateData.memberStatusIds = memberStatusIds
        if (subscriptionStatusIds !== undefined) updateData.subscriptionStatusIds = subscriptionStatusIds
        if (kycStatusIds !== undefined) updateData.kycStatusIds = kycStatusIds
        if (requiresEmailVerified !== undefined) updateData.requiresEmailVerified = requiresEmailVerified
        if (requiresPhoneVerified !== undefined) updateData.requiresPhoneVerified = requiresPhoneVerified
        if (requiresProfileComplete !== undefined) updateData.requiresProfileComplete = requiresProfileComplete
        if (requiresActiveSubscription !== undefined) updateData.requiresActiveSubscription = requiresActiveSubscription
        if (conditionLogic !== undefined) updateData.conditionLogic = conditionLogic
        if (priority !== undefined) updateData.priority = priority
        if (isActive !== undefined) updateData.isActive = isActive

        const [updated] = await db
          .update(accessControlRules)
          .set(updateData)
          .where(eq(accessControlRules.id, id))
          .returning()

        return res.status(200).json({ rule: updated })
      }

      case 'DELETE': {
        const { id } = req.body

        if (!id) {
          return res.status(400).json({ error: 'ID is required' })
        }

        await db
          .delete(accessControlRules)
          .where(eq(accessControlRules.id, id))

        return res.status(200).json({ message: 'Rule deleted' })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Access rules API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAdminAuth(handler)
