// Queue Service Adapter - Seamless integration with the Queue microservice
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { QueueMember, QueueStatistics as QueueStatsType } from './types';

interface QueueUser {
  id: string;
  user_id: string;
  queue_position: number;
  joined_at: string;
  is_eligible: boolean;
  subscription_active: boolean;
  total_months_subscribed: number;
  last_payment_date: string;
  lifetime_payment_total: number;
  has_received_payout: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  member?: {
    id: number;
    name: string;
    email: string;
    status: string;
    join_date: string;
  };
  member_name?: string;
  member_email?: string;
  member_status?: string;
  member_join_date?: string;
}

interface QueueStatistics {
  totalMembers: number;
  activeMembers: number;
  eligibleMembers: number;
  totalRevenue: number;
  potentialWinners: number;
  payoutThreshold: number;
  receivedPayouts: number;
}

interface QueueResponse {
  success: boolean;
  data: {
    queue: QueueMember[];
    statistics: QueueStatistics;
    pagination?: {
      total: number;
      limit: number;
      offset: number;
    };
  };
  error?: string;
  message?: string;
}

class QueueServiceAdapter {
  private baseUrl: string;
  private supabase: any;

  constructor() {
    // Use Next.js API route instead of direct microservice access from frontend
    this.baseUrl = '';
  }

  setSupabaseClient(supabase: any) {
    this.supabase = supabase;
  }

  private async getAuthToken(): Promise<string | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getQueueData(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<QueueResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.search) searchParams.append('search', params.search);
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.offset) searchParams.append('offset', params.offset.toString());

      const queryString = searchParams.toString();
      const endpoint = `/api/queue${queryString ? `?${queryString}` : ''}`;
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Queue service error:', error);
      // Fallback to direct database access if microservice is unavailable
      if (this.supabase) {
        return this.fallbackToDirectAccess(params);
      } else {
        throw new Error('Queue service unavailable and no fallback available');
      }
    }
  }

  async getQueueMember(memberId: number): Promise<{ success: boolean; data: QueueMember }> {
    try {
      return await this.makeRequest(`/api/queue/${memberId}`);
    } catch (error) {
      console.error('Queue member fetch error:', error);
      throw error;
    }
  }

  async getStatistics(): Promise<{ success: boolean; data: QueueStatistics }> {
    try {
      return await this.makeRequest('/api/queue/statistics');
    } catch (error) {
      console.error('Statistics fetch error:', error);
      throw error;
    }
  }

  async updateQueuePosition(memberId: number, newPosition: number): Promise<any> {
    try {
      return await this.makeRequest(`/api/queue/${memberId}/position`, {
        method: 'PUT',
        body: JSON.stringify({ newPosition }),
      });
    } catch (error) {
      console.error('Queue position update error:', error);
      throw error;
    }
  }

  async addMemberToQueue(memberData: Partial<QueueMember>): Promise<any> {
    try {
      return await this.makeRequest('/api/queue', {
        method: 'POST',
        body: JSON.stringify(memberData),
      });
    } catch (error) {
      console.error('Add member to queue error:', error);
      throw error;
    }
  }

  async removeMemberFromQueue(memberId: number): Promise<any> {
    try {
      return await this.makeRequest(`/api/queue/${memberId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Remove member from queue error:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<{ success: boolean; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.json();
    } catch (error) {
      return { success: false, status: 'unavailable' };
    }
  }

  // Fallback method for direct database access when microservice is unavailable
  private async fallbackToDirectAccess(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<QueueResponse> {
    if (!this.supabase) {
      throw new Error('Queue service unavailable and no database client available');
    }

    try {
      console.warn('Queue microservice unavailable, falling back to direct database access');

      // Fetch queue data directly from database
      const query = this.supabase
        .from('membership_queue')
        .select('*')
        .order('queue_position', { ascending: true });

      const { data: queueData, error: queueError } = await query;

      if (queueError) {
        throw queueError;
      }

      // Fetch user data with profiles
      const userIds = queueData?.map((q: any) => q.user_id) || [];
      const { data: userProfiles } = await this.supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, created_at')
        .in('user_id', userIds);

      const { data: userContacts } = await this.supabase
        .from('user_contacts')
        .select('user_id, contact_value')
        .in('user_id', userIds)
        .eq('contact_type', 'email')
        .eq('is_primary', true);

      // Enrich queue data and map to QueueMember interface
      const enrichedData = queueData?.map((item: any) => {
        const profile = userProfiles?.find((p: any) => p.user_id === item.user_id);
        const contact = userContacts?.find((c: any) => c.user_id === item.user_id);
        const fullName = profile ? `${profile.first_name} ${profile.last_name}` : `User ${item.user_id}`;

        return {
          id: item.user_id,
          name: fullName,
          email: contact?.contact_value || '',
          status: item.is_active ? 'Active' : 'Inactive',
          joinDate: profile?.created_at || item.joined_at || '',
          position: item.queue_position,
          continuousTenure: item.months_in_queue || 0,
          totalPaid: item.total_amount_paid || 0,
          lastPaymentDate: item.last_payment_date || '',
          nextPaymentDue: '', // Calculate if needed
          // Keep original fields for internal use
          memberid: item.user_id,
          queue_position: item.queue_position,
          joined_at: item.joined_at,
          is_eligible: item.is_eligible || false,
          has_received_payout: item.has_received_payout || false,
          continuous_tenure: item.months_in_queue || 0,
          total_paid: item.total_amount_paid || 0,
          last_payment_date: item.last_payment_date || '',
          next_payment_due: '',
          member: profile ? {
            id: item.user_id,
            name: fullName,
            email: contact?.contact_value || '',
            status: item.is_active ? 'Active' : 'Inactive',
            join_date: profile.created_at
          } : null,
          member_name: fullName,
          member_email: contact?.contact_value || '',
          member_status: item.is_active ? 'Active' : 'Inactive',
          member_join_date: profile?.created_at || ''
        };
      }) || [];

      // Apply search filter
      let filteredData = enrichedData;
      if (params?.search) {
        const searchTerm = params.search.toLowerCase();
        filteredData = enrichedData.filter((member: any) =>
          member.member_name?.toLowerCase().includes(searchTerm) ||
          member.member_email?.toLowerCase().includes(searchTerm) ||
          member.memberid.toString().includes(searchTerm)
        );
      }

      // Calculate statistics
      const { data: payments } = await this.supabase
        .from('user_payments')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = payments?.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0) || 0;
      // All members in queue have active subscriptions (inactive ones are removed)
      const activeMembers = enrichedData.length;
      const eligibleMembers = enrichedData.filter((member: any) => member.is_eligible).length;

      const statistics: QueueStatistics = {
        totalMembers: enrichedData.length,
        activeMembers,
        eligibleMembers,
        totalRevenue,
        potentialWinners: Math.min(2, eligibleMembers),
        payoutThreshold: 500000,
        receivedPayouts: enrichedData.filter((m: any) => m.has_received_payout).length
      };

      return {
        success: true,
        data: {
          queue: filteredData,
          statistics,
          pagination: {
            total: filteredData.length,
            limit: params?.limit || filteredData.length,
            offset: params?.offset || 0
          }
        }
      };
    } catch (error) {
      throw new Error(`Fallback database access failed: ${error}`);
    }
  }
}

// Create singleton instance
const queueService = new QueueServiceAdapter();

// Hook for React components
export const useQueueService = () => {
  const supabase = useSupabaseClient();
  
  // Set the supabase client for the service
  queueService.setSupabaseClient(supabase);
  
  return queueService;
};

export default queueService;