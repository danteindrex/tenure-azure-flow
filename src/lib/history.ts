// History system service for managing user activity and transaction history
import SupabaseClientSingleton from './supabase';

export interface UserActivityHistory {
  id?: string;
  user_id?: string;
  activity_type: 'payment' | 'queue' | 'milestone' | 'profile' | 'login' | 'logout' | 'settings' | 'support' | 'referral' | 'bonus' | 'system';
  action: string;
  description?: string;
  amount?: number;
  status: 'completed' | 'failed' | 'pending' | 'cancelled';
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  session_id?: string;
  device_type?: string;
  location?: string;
  reference_id?: string;
  parent_activity_id?: string;
}

export interface TransactionHistory {
  id?: string;
  user_id?: string;
  transaction_type: 'payment' | 'refund' | 'bonus' | 'payout' | 'fee' | 'adjustment';
  amount: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  description?: string;
  metadata?: Record<string, any>;
  processed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QueueHistory {
  id?: string;
  user_id?: string;
  old_position?: number;
  new_position?: number;
  position_change?: number;
  reason?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface MilestoneHistory {
  id?: string;
  milestone_type: 'fund_amount' | 'user_count' | 'payout' | 'special';
  milestone_value?: number;
  description: string;
  achieved_at?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface HistorySummary {
  total_activities: number;
  completed_activities: number;
  failed_activities: number;
  total_transactions: number;
  total_amount: number;
  recent_activities: UserActivityHistory[];
}

class HistoryService {
  private supabase: ReturnType<typeof SupabaseClientSingleton.getInstance>;

  constructor(supabaseClient?: ReturnType<typeof SupabaseClientSingleton.getInstance>) {
    this.supabase = supabaseClient || SupabaseClientSingleton.getInstance();
  }

  // User Activity History
  async getUserActivityHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    activity_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<UserActivityHistory[]> {
    try {
      let query = this.supabase
        .from('user_activity_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options?.activity_type) {
        query = query.eq('activity_type', options.activity_type);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.start_date) {
        query = query.gte('created_at', options.start_date);
      }

      if (options?.end_date) {
        query = query.lte('created_at', options.end_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user activity history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserActivityHistory:', error);
      return [];
    }
  }

  async createUserActivity(activity: Omit<UserActivityHistory, 'id' | 'created_at'>): Promise<UserActivityHistory | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_activity_history')
        .insert(activity)
        .select()
        .single();

      if (error) {
        console.error('Error creating user activity:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createUserActivity:', error);
      return null;
    }
  }

  // Transaction History
  async getTransactionHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    transaction_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TransactionHistory[]> {
    try {
      let query = this.supabase
        .from('transaction_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options?.transaction_type) {
        query = query.eq('transaction_type', options.transaction_type);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.start_date) {
        query = query.gte('created_at', options.start_date);
      }

      if (options?.end_date) {
        query = query.lte('created_at', options.end_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transaction history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      return [];
    }
  }

  async createTransaction(transaction: Omit<TransactionHistory, 'id' | 'created_at' | 'updated_at'>): Promise<TransactionHistory | null> {
    try {
      const { data, error } = await this.supabase
        .from('transaction_history')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createTransaction:', error);
      return null;
    }
  }

  // Queue History
  async getQueueHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<QueueHistory[]> {
    try {
      let query = this.supabase
        .from('queue_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching queue history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getQueueHistory:', error);
      return [];
    }
  }

  async createQueueHistory(queueData: Omit<QueueHistory, 'id' | 'created_at'>): Promise<QueueHistory | null> {
    try {
      const { data, error } = await this.supabase
        .from('queue_history')
        .insert(queueData)
        .select()
        .single();

      if (error) {
        console.error('Error creating queue history:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createQueueHistory:', error);
      return null;
    }
  }

  // Milestone History
  async getMilestoneHistory(options?: {
    limit?: number;
    offset?: number;
    milestone_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<MilestoneHistory[]> {
    try {
      let query = this.supabase
        .from('milestone_history')
        .select('*')
        .order('achieved_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options?.milestone_type) {
        query = query.eq('milestone_type', options.milestone_type);
      }

      if (options?.start_date) {
        query = query.gte('achieved_at', options.start_date);
      }

      if (options?.end_date) {
        query = query.lte('achieved_at', options.end_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching milestone history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMilestoneHistory:', error);
      return [];
    }
  }

  // Combined History (for the main history page)
  async getCombinedHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    activity_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    activities: UserActivityHistory[];
    transactions: TransactionHistory[];
    queue_changes: QueueHistory[];
    milestones: MilestoneHistory[];
  }> {
    try {
      const [activities, transactions, queue_changes, milestones] = await Promise.all([
        this.getUserActivityHistory(userId, options),
        this.getTransactionHistory(userId, options),
        this.getQueueHistory(userId, options),
        this.getMilestoneHistory(options)
      ]);

      return {
        activities,
        transactions,
        queue_changes,
        milestones
      };
    } catch (error) {
      console.error('Error in getCombinedHistory:', error);
      return {
        activities: [],
        transactions: [],
        queue_changes: [],
        milestones: []
      };
    }
  }

  // History Summary
  async getHistorySummary(userId: string): Promise<HistorySummary> {
    try {
      const [activities, transactions] = await Promise.all([
        this.getUserActivityHistory(userId, { limit: 1000 }),
        this.getTransactionHistory(userId, { limit: 1000 })
      ]);

      const total_activities = activities.length;
      const completed_activities = activities.filter(a => a.status === 'completed').length;
      const failed_activities = activities.filter(a => a.status === 'failed').length;
      const total_transactions = transactions.length;
      const total_amount = transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const recent_activities = activities.slice(0, 10);

      return {
        total_activities,
        completed_activities,
        failed_activities,
        total_transactions,
        total_amount,
        recent_activities
      };
    } catch (error) {
      console.error('Error in getHistorySummary:', error);
      return {
        total_activities: 0,
        completed_activities: 0,
        failed_activities: 0,
        total_transactions: 0,
        total_amount: 0,
        recent_activities: []
      };
    }
  }

  // Search History
  async searchHistory(userId: string, searchTerm: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    activities: UserActivityHistory[];
    transactions: TransactionHistory[];
  }> {
    try {
      const { data: activities, error: activitiesError } = await this.supabase
        .from('user_activity_history')
        .select('*')
        .eq('user_id', userId)
        .or(`action.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      const { data: transactions, error: transactionsError } = await this.supabase
        .from('transaction_history')
        .select('*')
        .eq('user_id', userId)
        .or(`description.ilike.%${searchTerm}%,payment_reference.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (activitiesError) {
        console.error('Error searching activities:', activitiesError);
      }

      if (transactionsError) {
        console.error('Error searching transactions:', transactionsError);
      }

      return {
        activities: activities || [],
        transactions: transactions || []
      };
    } catch (error) {
      console.error('Error in searchHistory:', error);
      return {
        activities: [],
        transactions: []
      };
    }
  }
}

export default HistoryService;
