import { pool } from '../config/database';

/**
 * Queue Model - View-Based Queue System
 * 
 * This model queries the active_member_queue_view which dynamically calculates
 * queue positions from user subscriptions and payments. No manual reorganization needed.
 */

export interface ActiveMemberQueue {
  membership_id: string; // Primary identifier - each membership is a separate queue entry
  user_id: string;
  email: string;
  user_created_at: Date;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  full_name: string | null;
  subscription_id: string;
  subscription_status: string;
  provider_subscription_id: string | null;
  join_date: Date;
  verification_status: string;
  tenure_start_date: Date;
  last_payment_date: Date;
  total_successful_payments: number;
  lifetime_payment_total: number;
  has_received_payout: boolean;
  queue_position: number;
  is_eligible: boolean;
  meets_time_requirement: boolean;
  calculated_at: Date;
}

export interface QueueStatistics {
  total_members: number;
  eligible_members: number;
  members_meeting_time_req: number;
  total_revenue: number;
  oldest_member_date: Date | null;
  newest_member_date: Date | null;
}

export class QueueModel {
  /**
   * Get queue positions for a specific user (may return multiple memberships)
   * Note: Users can have multiple active subscriptions/memberships
   */
  static async getUserQueuePositions(userId: string): Promise<ActiveMemberQueue[]> {
    const query = `
      SELECT * FROM active_member_queue_view
      WHERE user_id = $1
      ORDER BY queue_position ASC
    `;
    const result = await pool.query<ActiveMemberQueue>(query, [userId]);
    return result.rows;
  }

  /**
   * Get queue position for a specific membership
   */
  static async getMembershipQueuePosition(membershipId: string): Promise<ActiveMemberQueue | null> {
    const query = `
      SELECT * FROM active_member_queue_view
      WHERE membership_id = $1
    `;
    const result = await pool.query<ActiveMemberQueue>(query, [membershipId]);
    return result.rows[0] || null;
  }

  /**
   * @deprecated Use getUserQueuePositions instead (returns array for multi-membership support)
   * Get first queue position for a user (backward compatibility)
   */
  static async getUserQueuePosition(userId: string): Promise<ActiveMemberQueue | null> {
    const positions = await this.getUserQueuePositions(userId);
    return positions[0] || null;
  }

  /**
   * Get all active queue members ordered by position
   */
  static async getAllQueueMembers(limit?: number, offset?: number): Promise<ActiveMemberQueue[]> {
    let query = `
      SELECT * FROM active_member_queue_view
      ORDER BY queue_position ASC
    `;
    
    const params: any[] = [];
    
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    
    if (offset) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }
    
    const result = await pool.query<ActiveMemberQueue>(query, params);
    return result.rows;
  }

  /**
   * Get the next N winners based on queue position
   */
  static async getNextWinners(count: number): Promise<ActiveMemberQueue[]> {
    const query = `
      SELECT * FROM active_member_queue_view
      WHERE is_eligible = true
      ORDER BY queue_position ASC
      LIMIT $1
    `;
    const result = await pool.query<ActiveMemberQueue>(query, [count]);
    return result.rows;
  }

  /**
   * Get queue statistics
   */
  static async getQueueStatistics(): Promise<QueueStatistics> {
    const query = `
      SELECT 
        COUNT(*)::int as total_members,
        COUNT(*) FILTER (WHERE is_eligible = true)::int as eligible_members,
        COUNT(*) FILTER (WHERE meets_time_requirement = true)::int as members_meeting_time_req,
        COALESCE(SUM(lifetime_payment_total), 0)::numeric as total_revenue,
        MIN(tenure_start_date) as oldest_member_date,
        MAX(tenure_start_date) as newest_member_date
      FROM active_member_queue_view
    `;
    const result = await pool.query<QueueStatistics>(query);
    return result.rows[0];
  }

  /**
   * Search queue members by email or name
   */
  static async searchQueueMembers(searchTerm: string, limit: number = 50): Promise<ActiveMemberQueue[]> {
    const query = `
      SELECT * FROM active_member_queue_view
      WHERE 
        email ILIKE $1 
        OR full_name ILIKE $1
        OR first_name ILIKE $1
        OR last_name ILIKE $1
      ORDER BY queue_position ASC
      LIMIT $2
    `;
    const result = await pool.query<ActiveMemberQueue>(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  // ============================================================================
  // DEPRECATED METHODS - Kept for backward compatibility during migration
  // ============================================================================

  /**
   * @deprecated Use getUserQueuePosition instead
   * Legacy method for backward compatibility
   */
  static async findByMemberId(memberId: number): Promise<ActiveMemberQueue | null> {
    return this.getUserQueuePosition(memberId.toString());
  }

  /**
   * @deprecated No longer needed - subscription cancellation automatically excludes from view
   * This method is now a no-op. Queue positions are calculated dynamically.
   */
  static async removeFromQueue(userId: number): Promise<void> {
    // No-op: View automatically excludes canceled subscriptions
    // Queue positions are recalculated dynamically
    console.warn('removeFromQueue() is deprecated and no longer needed with view-based queue');
    return;
  }

  /**
   * @deprecated No longer needed - payment stats are calculated from user_payments table
   * This method is now a no-op. Stats are calculated dynamically in the view.
   */
  static async updatePaymentStats(
    memberId: number,
    totalMonths: number,
    lifetimeTotal: number,
    lastPaymentDate: Date
  ): Promise<ActiveMemberQueue | null> {
    // No-op: View automatically calculates stats from user_payments
    console.warn('updatePaymentStats() is deprecated and no longer needed with view-based queue');
    return this.getUserQueuePosition(memberId.toString());
  }
}
