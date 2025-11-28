/**
 * Status Values API
 *
 * GET /api/admin/status-system/values?categoryId=X - List values for category
 * POST /api/admin/status-system/values - Create new value
 * PUT /api/admin/status-system/values - Update value (display name, color, etc.)
 * DELETE /api/admin/status-system/values - Delete value (soft delete)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAdminAuth } from '@/lib/admin-auth'
import { db } from '@/drizzle/db'
import { statusValues, statusCategories } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const { categoryId, categoryCode } = req.query

        const query = db
          .select({
            id: statusValues.id,
            categoryId: statusValues.categoryId,
            code: statusValues.code,
            displayName: statusValues.displayName,
            description: statusValues.description,
            color: statusValues.color,
            icon: statusValues.icon,
            sortOrder: statusValues.sortOrder,
            isDefault: statusValues.isDefault,
            isTerminal: statusValues.isTerminal,
            isActive: statusValues.isActive,
            metadata: statusValues.metadata,
            categoryCode: statusCategories.code,
            categoryName: statusCategories.name,
          })
          .from(statusValues)
          .innerJoin(statusCategories, eq(statusValues.categoryId, statusCategories.id))
          .orderBy(statusValues.sortOrder)

        if (categoryId) {
          const values = await query.where(eq(statusValues.categoryId, Number(categoryId)))
          return res.status(200).json({ values })
        }

        if (categoryCode) {
          const values = await query.where(eq(statusCategories.code, String(categoryCode)))
          return res.status(200).json({ values })
        }

        // Return all values grouped by category
        const values = await query
        return res.status(200).json({ values })
      }

      case 'POST': {
        const {
          categoryId,
          code,
          displayName,
          description,
          color,
          icon,
          sortOrder,
          isDefault,
          isTerminal,
          metadata
        } = req.body

        if (!categoryId || !code || !displayName) {
          return res.status(400).json({ error: 'categoryId, code, and displayName are required' })
        }

        const [newValue] = await db
          .insert(statusValues)
          .values({
            categoryId,
            code,
            displayName,
            description,
            color: color || '#6B7280',
            icon,
            sortOrder: sortOrder || 0,
            isDefault: isDefault || false,
            isTerminal: isTerminal || false,
            isActive: true,
            metadata: metadata || {},
          })
          .returning()

        return res.status(201).json({ value: newValue })
      }

      case 'PUT': {
        const {
          id,
          displayName,
          description,
          color,
          icon,
          sortOrder,
          isDefault,
          isTerminal,
          isActive,
          metadata
        } = req.body

        if (!id) {
          return res.status(400).json({ error: 'ID is required' })
        }

        // Build update object with only provided fields
        const updateData: any = { updatedAt: new Date() }
        if (displayName !== undefined) updateData.displayName = displayName
        if (description !== undefined) updateData.description = description
        if (color !== undefined) updateData.color = color
        if (icon !== undefined) updateData.icon = icon
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder
        if (isDefault !== undefined) updateData.isDefault = isDefault
        if (isTerminal !== undefined) updateData.isTerminal = isTerminal
        if (isActive !== undefined) updateData.isActive = isActive
        if (metadata !== undefined) updateData.metadata = metadata

        const [updated] = await db
          .update(statusValues)
          .set(updateData)
          .where(eq(statusValues.id, id))
          .returning()

        return res.status(200).json({ value: updated })
      }

      case 'DELETE': {
        const { id } = req.body

        if (!id) {
          return res.status(400).json({ error: 'ID is required' })
        }

        // Soft delete by setting isActive to false
        const [deleted] = await db
          .update(statusValues)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(statusValues.id, id))
          .returning()

        return res.status(200).json({ value: deleted, message: 'Status value deactivated' })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Status values API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAdminAuth(handler)
