import { pool } from '../../drizzle/db';

/**
 * Queue Model - View-Based Queue System
 *
 * This model queries the active_member_queue_view which dynamically calculates
 * queue positions from user subscriptions and payments. No manual reorganization needed.
 */
class QueueModel {
  /**
   * Get all active queue members from the view
   */
  async getAllQueueMembers(): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM active_member_queue_view ORDER BY queue_position ASC'
      );

      return result.rows || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch queue members: ${error.message}`);
    }
  }

  /**
   * Get queue member by user ID from the view
   */
  async getQueueMemberById(userId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM active_member_queue_view WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Queue member not found');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Failed to fetch queue member: ${error.message}`);
    }
  }

  /**
   * Get queue statistics from the view
   */
  async getQueueStatistics(): Promise<any> {
    try {
      const queueData = await this.getAllQueueMembers();

      const totalMembers = queueData.length;
      const eligibleMembers = queueData.filter((member: any) => member.is_eligible).length;
      const totalRevenue = queueData.reduce((sum: number, member: any) =>
        sum + parseFloat(member.lifetime_payment_total || 0), 0
      );
      const maxWinners = parseInt(process.env.MAX_WINNERS_PER_PAYOUT || '2');
      const potentialWinners = Math.min(maxWinners, eligibleMembers);

      return {
        totalMembers,
        activeMembers: totalMembers, // All members in view are active
        eligibleMembers,
        totalRevenue,
        potentialWinners,
        payoutThreshold: parseInt(process.env.DEFAULT_PAYOUT_THRESHOLD || '500000'),
        receivedPayouts: queueData.filter((m: any) => m.has_received_payout).length
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate statistics: ${error.message}`);
    }
  }

  /**
   * Search queue members by email or name
   */
  async searchQueueMembers(searchTerm: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM active_member_queue_view
         WHERE email ILIKE $1
            OR full_name ILIKE $1
            OR first_name ILIKE $1
            OR last_name ILIKE $1
         ORDER BY queue_position ASC
         LIMIT $2`,
        [`%${searchTerm}%`, limit]
      );

      return result.rows || [];
    } catch (error: any) {
      throw new Error(`Failed to search queue members: ${error.message}`);
    }
  }

  // ============================================================================
  // DEPRECATED METHODS - Kept for backward compatibility during migration
  // ============================================================================

  /**
   * @deprecated No longer needed - positions are calculated dynamically in the view
   */
  async updateQueuePosition(userId: string, newPosition: number): Promise<any> {
    console.warn('updateQueuePosition() is deprecated - queue positions are calculated dynamically');
    // Return current position from view
    return this.getQueueMemberById(userId);
  }

  /**
   * @deprecated No longer needed - users are automatically added to queue when they have active subscriptions
   */
  async addUserToQueue(userData: any): Promise<any> {
    console.warn('addUserToQueue() is deprecated - users automatically appear in queue with active subscriptions');
    // Return current position from view if exists
    return this.getQueueMemberById(userData.user_id);
  }

  /**
   * @deprecated Legacy compatibility method
   */
  async addMemberToQueue(memberData: any): Promise<any> {
    return this.addUserToQueue({
      user_id: memberData.memberid,
      ...memberData
    });
  }

  /**
   * @deprecated No longer needed - subscription cancellation automatically excludes from view
   */
  async removeUserFromQueue(userId: string): Promise<null> {
    console.warn('removeUserFromQueue() is deprecated - users automatically excluded when subscription canceled');
    // No-op: View automatically excludes canceled subscriptions
    return null;
  }

  /**
   * @deprecated Legacy compatibility method
   */
  async removeMemberFromQueue(memberId: string): Promise<null> {
    return this.removeUserFromQueue(memberId);
  }
}

export default QueueModel;
