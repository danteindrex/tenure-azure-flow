const database = require('../config/database');

class QueueModel {
  constructor() {
    this.supabase = database.getClient();
  }

  async getAllQueueMembers() {
    try {
      const { data: queueData, error: queueError } = await this.supabase
        .from('queue')
        .select('*')
        .order('queue_position', { ascending: true });

      if (queueError) {
        throw queueError;
      }

      // Fetch member data to enrich queue data
      const memberIds = queueData?.map(q => q.memberid) || [];
      const { data: members } = await this.supabase
        .from('member')
        .select('id, name, email, status, join_date')
        .in('id', memberIds);

      // Enrich queue data with member information
      const enrichedQueueData = queueData?.map(item => {
        const member = members?.find(m => m.id === item.memberid);
        return {
          ...item,
          member: member || null,
          member_name: member?.name || `Member ${item.memberid}`,
          member_email: member?.email || '',
          member_status: member?.status || 'Unknown',
          member_join_date: member?.join_date || ''
        };
      }) || [];

      return enrichedQueueData;
    } catch (error) {
      throw new Error(`Failed to fetch queue members: ${error.message}`);
    }
  }

  async getQueueMemberById(memberId) {
    try {
      const { data, error } = await this.supabase
        .from('queue')
        .select('*')
        .eq('memberid', memberId)
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
      
      // Calculate total revenue from payments
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payment')
        .select('amount')
        .eq('status', 'Completed');

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

  async updateQueuePosition(memberId, newPosition) {
    try {
      const { data, error } = await this.supabase
        .from('queue')
        .update({ queue_position: newPosition, updated_at: new Date().toISOString() })
        .eq('memberid', memberId)
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      throw new Error(`Failed to update queue position: ${error.message}`);
    }
  }

  async addMemberToQueue(memberData) {
    try {
      const { data, error } = await this.supabase
        .from('queue')
        .insert([{
          memberid: memberData.memberid,
          queue_position: memberData.queue_position,
          is_eligible: memberData.is_eligible || false,
          subscription_active: memberData.subscription_active || false,
          total_months_subscribed: memberData.total_months_subscribed || 0,
          lifetime_payment_total: memberData.lifetime_payment_total || 0,
          has_received_payout: false,
          notes: memberData.notes || '',
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      throw new Error(`Failed to add member to queue: ${error.message}`);
    }
  }

  async removeMemberFromQueue(memberId) {
    try {
      const { data, error } = await this.supabase
        .from('queue')
        .delete()
        .eq('memberid', memberId)
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      throw new Error(`Failed to remove member from queue: ${error.message}`);
    }
  }
}

module.exports = QueueModel;