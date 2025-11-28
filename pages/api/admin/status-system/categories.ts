/**
 * Status Categories API
 *
 * GET /api/admin/status-system/categories - List all categories
 * POST /api/admin/status-system/categories - Create new category
 * PUT /api/admin/status-system/categories - Update category
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAdminAuth } from '@/lib/admin-auth'
import { db } from '@/drizzle/db'
import { statusCategories } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        const categories = await db
          .select()
          .from(statusCategories)
          .orderBy(statusCategories.name)

        return res.status(200).json({ categories })
      }

      case 'POST': {
        const { code, name, description, tableName, columnName } = req.body

        if (!code || !name) {
          return res.status(400).json({ error: 'Code and name are required' })
        }

        const [newCategory] = await db
          .insert(statusCategories)
          .values({
            code,
            name,
            description,
            tableName,
            columnName,
            isSystem: false,
            isActive: true,
          })
          .returning()

        return res.status(201).json({ category: newCategory })
      }

      case 'PUT': {
        const { id, name, description, isActive } = req.body

        if (!id) {
          return res.status(400).json({ error: 'ID is required' })
        }

        const [updated] = await db
          .update(statusCategories)
          .set({
            name,
            description,
            isActive,
            updatedAt: new Date(),
          })
          .where(eq(statusCategories.id, id))
          .returning()

        return res.status(200).json({ category: updated })
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Status categories API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAdminAuth(handler)
