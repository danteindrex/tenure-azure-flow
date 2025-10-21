import { createClient } from '@supabase/supabase-js';

class QueueService {
  constructor() {
    this.supabase = null;
    this.initializeSupabase();
  }

  initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      throw new Error('Supabase configuration missing');
    }
  }

  // Get all queue members with enriched data
  async getAllQueueMembers() {
    try {
      // Fetch queue data first
      const { data: queueMembers, error: queueError } = await this.supabase
        .from('queue')
        .select('*')
        .order('queue_position', { ascending: true });

      if (queueError) {
        throw new Error(`Failed to fetch queue data: ${queueError.message}`);
      }

      // Fetch member data separately and join manually
      const memberIds = queueMembers?.map(q => q.memberid) || [];
      
      if (memberIds.length === 0) {
        return [];
      }

      const { data: members, error: memberError } = await this.supabase
        .from('member')
        .select('id, name, email, status, join_date')
        .in('id', memberIds);

      if (memberError) {
        console.warn('Error fetching member data:', memberError);
      }

      // Transform data to include member details
      return queueMembers?.map(item => {
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

    } catch (error) {
      console.error('Error in getAllQueueMembers:', error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStatistics() {
    try {
      // Get queue data for statistics
      const { data: queueData, error: queueError } = await this.supabase
        .from('queue')
        .select('subscription_active, is_eligible, lifetime_payment_total');

      if (queueError) {
        throw new Error(`Failed to fetch queue statistics: ${queueError.message}`);
      }

      // Calculate total revenue from payments
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payment')
        .select('amount')
        .eq('status', 'Completed');

      let totalRevenue = 0;
      if (!paymentsError && payments) {
        totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      }

      const activeMembers = queueData?.filter(member => member.subscription_active).length || 0;
      const eligibleMembers = queueData?.filter(member => member.is_eligible).length || 0;
      const totalMembers = queueData?.length || 0;
      const winnersCount = Math.min(2, eligibleMembers);
      const potentialPayoutPerWinner = totalRevenue > 0 ? totalRevenue / Math.max(winnersCount, 1) : 0;

      return {
        totalMembers,
        activeMembers,
        eligibleMembers,
        totalRevenue,
        potentialWinners: winnersCount,
        potentialPayoutPerWinner,
        nextPayoutDate: "March 15, 2025" // This could be calculated based on business rules
      };

    } catch (error) {
      console.error('Error in getQueueStatistics:', error);
      throw error;
    }
  }

  // Get specific member's queue information
  async getMemberQueueInfo(memberId) {
    try {
      const { data: memberQueue, error: queueError } = await this.supabase
        .from('queue')
        .select('*')
        .eq('memberid', memberId)
        .single();

      if (queueError) {
        throw new Error(`Member not found in queue: ${queueError.message}`);
      }

      // Get member details
      const { data: member, error: memberError } = await this.supabase
        .from('member')
        .select('id, name, email, status, join_date')
        .eq('id', memberId)
        .single();

      if (memberError) {
        console.warn('Error fetching member data:', memberError);
      }

      // Calculate potential payout
      const statistics = await this.getQueueStatistics();

      return {
        ...memberQueue,
        member: member || null,
        member_name: member?.name || `Member ${memberId}`,
        member_email: member?.email || '',
        member_status: member?.status || 'Unknown',
        member_join_date: member?.join_date || '',
        potentialPayoutPerWinner: statistics.potentialPayoutPerWinner
      };

    } catch (error) {
      console.error('Error in getMemberQueueInfo:', error);
      throw error;
    }
  }

  // Update member queue information
  async updateMemberQueue(memberId, updateData) {
    try {
      const allowedFields = [
        'queue_position', 
        'subscription_active', 
        'is_eligible', 
        'total_months_subscribed',
        'last_payment_date',
        'lifetime_payment_total',
        'has_received_payout',
        'notes'
      ];

      // Filter update data to only allowed fields
      const filteredData = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      filteredData.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('queue')
        .update(filteredData)
        .eq('memberid', memberId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update member queue: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error in updateMemberQueue:', error);
      throw error;
    }
  }

  // Add new member to queue
  async addMemberToQueue(memberData) {
    try {
      const { data, error } = await this.supabase
        .from('queue')
        .insert({
          memberid: memberData.memberid,
          queue_position: memberData.queue_position || 999999, // Will be updated by admin
          joined_at: new Date().toISOString(),
          is_eligible: memberData.is_eligible || false,
          subscription_active: memberData.subscription_active || false,
          total_months_subscribed: memberData.total_months_subscribed || 0,
          last_payment_date: memberData.last_payment_date || null,
          lifetime_payment_total: memberData.lifetime_payment_total || 0,
          has_received_payout: false,
          notes: memberData.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add member to queue: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error in addMemberToQueue:', error);
      throw error;
    }
  }

  // Remove member from queue
  async removeMemberFromQueue(memberId) {
    try {
      const { data, error } = await this.supabase
        .from('queue')
        .delete()
        .eq('memberid', memberId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to remove member from queue: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error in removeMemberFromQueue:', error);
      throw error;
    }
  }

  // Recalculate queue positions based on business rules
  async recalculateQueuePositions() {
    try {
      // This would implement the business logic for queue positioning
      // For now, we'll maintain existing positions
      const queueMembers = await this.getAllQueueMembers();
      
      // Sort by current position and update if needed
      const sortedMembers = queueMembers.sort((a, b) => a.queue_position - b.queue_position);
      
      const updates = [];
      for (let i = 0; i < sortedMembers.length; i++) {
        const expectedPosition = i + 1;
        if (sortedMembers[i].queue_position !== expectedPosition) {
          updates.push(
            this.updateMemberQueue(sortedMembers[i].memberid, {
              queue_position: expectedPosition
            })
          );
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      return {
        updated: updates.length,
        total: sortedMembers.length
      };

    } catch (error) {
      console.error('Error in recalculateQueuePositions:', error);
      throw error;
    }
  }
}

export default QueueService;