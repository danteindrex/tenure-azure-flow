const database = require('../config/database');

class QueueModel {
  constructor() {
    this.supabase = database.getClient();
  }

  async getAllQueueMembers() {
    try {
      const { data: queueData, error: queueError } = await this.supabase
        .from('membership_queue')
        .select('*')
        .order('queue_position', { ascending: true });

      if (queueError) {
        throw queueError;
      }

      // Fetch user data to enrich queue data using normalized schema
      const userIds = queueData?.map(q => q.user_id) || [];
      const { data: users } = await this.supabase
        .from('users_complete') // Use the view for complete user data
        .select('id, email, status, first_name, last_name, full_name, join_date')
        .in('id', userIds);

      // Enrich queue data with user information
      const enrichedQueueData = queueData?.map(item => {
        const user = users?.find(u => u.id === item.user_id);
        return {
          ...item,
          user: user || null,
          user_name: user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || `User ${item.user_id}`,
          user_email: user?.email || '',
          user_status: user?.status || 'Unknown',
          user_join_date: user?.join_date || ''
        };
      }) || [];

      return enrichedQueueData;
    } catch (error) {
      throw new Error(`Failed to fetch queue members: ${error.message}`);
    }
  }

  async getQueueMemberById(userId) {
    try {
      const { data, error } = await this.supabase
        .from('membership_queue')
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

  async getQueueStatistics() {
    try {
      const queueData = await this.getAllQueueMembers();
      
      // Calculate total revenue from payments using normalized schema
      const { data: payments, error: paymentsError } = await this.supabase
        .from('user_payments')
        .select('amount')
        .eq('status', 'succeeded');

      let totalRevenue = 0;
      if (!paymentsError && payments) {
        totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      }

      const activeMembers = queueData.filter(member => member.subscription_active).length;
      const eligibleMembers = queueData.filter(member => member.is_eligible).length;
      const totalMembers = queueData.length;
      const maxWinners = parseInt(process.env.MAX_WINNERS_PER_PAYOUT) || 2;
      const potentialWinners = Math.min(maxWinners, eligibleMembers);

      return {
        totalMembers,
        activeMembers,
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

  async updateQueuePosition(userId, newPosition) {
    try {
      const { data, error } = await this.supabase
        .from('membership_queue')
        .update({ queue_position: newPosition, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      throw new Error(`Failed to update queue position: ${error.message}`);
    }
  }

  async addUserToQueue(userData) {
    try {
      const { data, error } = await this.supabase
        .from('membership_queue')
        .insert([{
          user_id: userData.user_id,
          queue_position: userData.queue_position,
          is_eligible: userData.is_eligible || false,
          subscription_active: userData.subscription_active || false,
          total_months_subscribed: userData.total_months_subscribed || 0,
          lifetime_payment_total: userData.lifetime_payment_total || 0,
          has_received_payout: false,
          notes: userData.notes || '',
          joined_queue_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      throw new Error(`Failed to add user to queue: ${error.message}`);
    }
  }

  // Legacy compatibility method
  async addMemberToQueue(memberData) {
    return this.addUserToQueue({
      user_id: memberData.memberid,
      ...memberData
    });
  }

  async removeUserFromQueue(userId) {
    try {
      const { data, error } = await this.supabase
        .from('membership_queue')
        .delete()
        .eq('user_id', userId)
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      throw new Error(`Failed to remove user from queue: ${error.message}`);
    }
  }

  // Legacy compatibility method
  async removeMemberFromQueue(memberId) {
    return this.removeUserFromQueue(memberId);
  }
}

module.exports = QueueModel;