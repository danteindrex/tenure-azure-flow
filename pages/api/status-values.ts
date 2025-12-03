import type { NextApiRequest, NextApiResponse } from 'next';
import { pool as getPool } from '@/drizzle/db';

/**
 * Lookup table mapping for each category
 * Each category maps to its corresponding database table
 */
const LOOKUP_TABLES: Record<string, string> = {
  member_eligibility: 'member_eligibility_statuses',
  subscription: 'subscription_statuses',
  payment: 'payment_statuses',
  kyc: 'kyc_statuses',
  payout: 'payout_statuses',
  verification: 'verification_statuses',
  user_funnel: 'user_funnel_statuses',
  post: 'post_statuses',
  admin: 'admin_statuses',
  admin_alert: 'admin_alert_statuses',
  dispute: 'dispute_statuses',
  tax_form: 'tax_form_statuses',
  queue_entry: 'queue_entry_statuses',
  billing_schedule: 'billing_schedule_statuses',
  transaction: 'transaction_statuses',
  transaction_monitoring: 'transaction_monitoring_statuses',
  audit_log: 'audit_log_statuses',
  signup_session: 'signup_session_statuses',
};

interface StatusValue {
  id: number;
  name: string;
  description: string | null;
  color: string;
  categoryCode: string;
}

/**
 * API endpoint to fetch status values with colors from lookup tables
 * Returns status display info for dynamic UI rendering
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;

    let results: StatusValue[] = [];

    if (category && typeof category === 'string') {
      // Fetch from specific category table
      const tableName = LOOKUP_TABLES[category];
      if (!tableName) {
        return res.status(400).json({
          success: false,
          error: `Unknown category: ${category}. Valid categories: ${Object.keys(LOOKUP_TABLES).join(', ')}`,
        });
      }

      const query = `
        SELECT id, name, description, color
        FROM ${tableName}
        ORDER BY id
      `;
      const result = await getPool().query(query);
      results = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color || '#6B7280',
        categoryCode: category,
      }));
    } else {
      // Fetch from all lookup tables
      for (const [categoryCode, tableName] of Object.entries(LOOKUP_TABLES)) {
        try {
          const query = `
            SELECT id, name, description, color
            FROM ${tableName}
            ORDER BY id
          `;
          const result = await getPool().query(query);
          results.push(...result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            color: row.color || '#6B7280',
            categoryCode,
          })));
        } catch {
          // Table might not exist, skip
        }
      }
    }

    // Transform to a map for easy lookup by name within each category
    const statusMap: Record<string, { displayName: string; color: string; categoryCode: string }> = {};
    results.forEach(status => {
      const key = `${status.categoryCode}:${status.id}`;
      statusMap[key] = {
        displayName: status.name,
        color: status.color,
        categoryCode: status.categoryCode,
      };
    });

    // Cache for 5 minutes - status values rarely change
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      success: true,
      data: {
        statuses: results,
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
