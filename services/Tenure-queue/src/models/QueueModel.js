const database = require('../config/database');

/**
 * Queue Model - View-Based Queue System
 * 
 * This model queries the active_member_queue_view which dynamically calculates
 * queue positions from user subscriptions and payments. No manual reorganization needed.
 */
class QueueModel {
  constructor() {
    this.supabase = database.getClient();
  }

  /**
   * Get all active queue members from the view
   */
  async getAllQueueMembers() {
    try {
      const { data: queueData, error: queueError } = await this.supabase
        .from('active_member_queue_view')
        .select('*')
        .order('queue_position', { ascending: true });

      if (queueError) {
        throw queueError;
      }

      // Data is already enriched by the view - no need for additional joins
      return queueData || [];
    } catch (error) {
      throw new Error(`Failed to fetch queue members: ${error.message}`);
    }
  }

  /**
   * Get queue member by user ID from the view
   */
  async getQueueMemberById(userId) {
    try {
      const { data, error } = await this.supabase
        .from('active_member_queue_view')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to fetch queue member: ${error.message}`);
    }
  }

  /**
   * Get queue statistics from the view
   */
  async getQueueStatistics() {
    try {
      const queueData = await this.getAllQueueMembers();
      
      const totalMembers = queueData.length;
      const eligibleMembers = queueData.filter(member => member.is_eligible).length;
      const totalRevenue = queueData.reduce((sum, member) => sum + parseFloat(member.lifetime_payment_total || 0), 0);
      const maxWinners = parseInt(process.env.MAX_WINNERS_PER_PAYOUT) || 2;
      const potentialWinners = Math.min(maxWinners, eligibleMembers);

      return {
        totalMembers,
        activeMembers: totalMembers, // All members in view are active
        eligibleMembers,
        totalRevenue,
        potentialWinners,
        payoutThreshold: parseInt(process.env.DEFAULT_PAYOUT_THRESHOLD) || 500000,
        receivedPayouts: queueData.filter(m => m.has_received_payout).length
      };
    } catch (error) {
      throw new Error(`Failed to calculate statistics: ${error.message}`);
    }
  }

  /**
   * Search queue members by email or name
   */
  async searchQueueMembers(searchTerm, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('active_member_queue_view')
        .select('*')
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .order('queue_position', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new Error(`Failed to search queue members: ${error.message}`);
    }
  }

  // ============================================================================
  // DEPRECATED METHODS - Kept for backward compatibility during migration
  // ============================================================================

  /**
   * @deprecated No longer needed - positions are calculated dynamically in the view
   */
  async updateQueuePosition(userId, newPosition) {
    console.warn('updateQueuePosition() is deprecated - queue positions are calculated dynamically');
    // Return current position from view
    return this.getQueueMemberById(userId);
  }

  /**
   * @deprecated No longer needed - users are automatically added to queue when they have active subscriptions
   */
  async addUserToQueue(userData) {
    console.warn('addUserToQueue() is deprecated - users automatically appear in queue with active subscriptions');
    // Return current position from view if exists
    return this.getQueueMemberById(userData.user_id);
  }

  /**
   * @deprecated Legacy compatibility method
   */
  async addMemberToQueue(memberData) {
    return this.addUserToQueue({
      user_id: memberData.memberid,
      ...memberData
    });
  }

  /**
   * @deprecated No longer needed - subscription cancellation automatically excludes from view
   */
  async removeUserFromQueue(userId) {
    console.warn('removeUserFromQueue() is deprecated - users automatically excluded when subscription canceled');
    // No-op: View automatically excludes canceled subscriptions
    return null;
  }

  /**
   * @deprecated Legacy compatibility method
   */
  async removeMemberFromQueue(memberId) {
    return this.removeUserFromQueue(memberId);
  }
}

module.exports = QueueModel;