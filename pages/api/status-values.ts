import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/drizzle/db';
import { statusCategories, statusValues } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * API endpoint to fetch status values with colors from the database
 * Returns status display info for dynamic UI rendering
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;

    // Build query - optionally filter by category
    const query = db
      .select({
        id: statusValues.id,
        code: statusValues.code,
        displayName: statusValues.displayName,
        color: statusValues.color,
        categoryCode: statusCategories.code,
        categoryName: statusCategories.name,
        sortOrder: statusValues.sortOrder,
        isDefault: statusValues.isDefault,
        isTerminal: statusValues.isTerminal,
      })
      .from(statusValues)
      .innerJoin(statusCategories, eq(statusValues.categoryId, statusCategories.id))
      .where(eq(statusValues.isActive, true));

    const results = await query;

    // Filter by category if provided
    let filteredResults = results;
    if (category && typeof category === 'string') {
      filteredResults = results.filter(r => r.categoryCode === category);
    }

    // Transform to a map for easy lookup by code
    const statusMap: Record<string, { displayName: string; color: string; categoryCode: string }> = {};
    filteredResults.forEach(status => {
      statusMap[status.code] = {
        displayName: status.displayName,
        color: status.color || '#6B7280', // Default gray if no color
        categoryCode: status.categoryCode,
      };
    });

    // Cache for 5 minutes - status values rarely change
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      success: true,
      data: {
        statuses: filteredResults,
        statusMap,
      },
    });
  } catch (error) {
    console.error('Error fetching status values:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch status values',
    });
  }
}
