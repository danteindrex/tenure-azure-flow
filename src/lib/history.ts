// History system service for managing user activity and transaction history
// Database operations moved to API endpoints for client-side compatibility
// Drizzle imports removed for client-side compatibility

export interface UserActivityHistory {
  id?: string;
  user_id: string;
  activity_type: 'login' | 'payment' | 'profile_update' | 'queue_update' | 'payout' | 'support_ticket' | 'other';
  activity_description: string;
  action?: string;
  description?: string;
  amount?: number;
  status?: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface TransactionHistory {
  id: string;
  user_id: string;
  transaction_type: 'payment' | 'refund' | 'payout' | 'fee';
  amount: number;
  currency: string;
  status: string;
  description: string;
  payment_method?: string;
  provider_transaction_id?: string;
  provider_invoice_id?: string;
  receipt_url?: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

export interface PaymentHistory {
  id: string;
  amount: number | string; // Can be string from database (decimal type)
  currency: string;
  status: string;
  payment_type: string;
  payment_date: string;
  provider_payment_id?: string;
  is_first_payment: boolean;
  receipt_url?: string;
}

export interface QueueHistory {
  id: string;
  user_id: string;
  action: 'joined' | 'position_changed' | 'status_updated';
  old_position?: number;
  new_position?: number;
  description: string;
  created_at: string;
}

export interface MilestoneHistory {
  id: string;
  user_id: string;
  milestone_type: 'first_payment' | 'tenure_milestone' | 'queue_position' | 'payout_received';
  milestone_description: string;
  achieved_at: string;
  metadata?: any;
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
  constructor() {
    // Using Drizzle ORM with existing database tables
  }

  // User Activity History - Placeholder implementations
  async logActivity(activity: Omit<UserActivityHistory, 'id' | 'created_at'>): Promise<boolean> {
    try {
      // TODO: Implement with proper user_activity_history table
      console.log('Logging activity:', activity);
      return true;
    } catch (error) {
      console.error('Error logging activity:', error);
      return false;
    }
  }

  async getUserActivityHistory(userId: string, limit: number = 50, offset: number = 0): Promise<UserActivityHistory[]> {
    try {
      // TODO: Implement with proper user_activity_history table
      console.log('Getting user activity history:', { userId, limit, offset });
      return [];
    } catch (error) {
      console.error('Error getting user activity history:', error);
      return [];
    }
  }

  async getActivityByType(userId: string, activityType: string, limit: number = 20): Promise<UserActivityHistory[]> {
    try {
      // TODO: Implement with proper user_activity_history table
      console.log('Getting activity by type:', { userId, activityType, limit });
      return [];
    } catch (error) {
      console.error('Error getting activity by type:', error);
      return [];
    }
  }

  // Payment History - Using API endpoint
  async getPaymentHistory(userId: string, limit: number = 50, offset: number = 0): Promise<PaymentHistory[]> {
    try {
      console.log('Fetching payment history for user:', userId);
      const response = await fetch(`/api/payments/history/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Payment history API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment history API error:', response.status, errorText);

        // Return empty array instead of throwing to allow the UI to still render
        console.warn('Returning empty payment history due to API error');
        return [];
      }

      const data = await response.json();
      console.log('Payment history API response:', data);
      return data.data || [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      // Return empty array on error so UI can still render
      return [];
    }
  }

  async getPaymentsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<PaymentHistory[]> {
    try {
      const response = await fetch(`/api/history/payments?userId=${userId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payments by date range');
      }

      const data = await response.json();
      return data.payments || [];
    } catch (error) {
      console.error('Error getting payments by date range:', error);
      return [];
    }
  }

  async getPaymentStatistics(userId: string): Promise<{
    totalPaid: number;
    totalPayments: number;
    firstPaymentDate: string | null;
    lastPaymentDate: string | null;
    averagePayment: number;
  }> {
    try {
      const payments = await this.getPaymentHistory(userId, 1000); // Get all payments

      if (payments.length === 0) {
        return {
          totalPaid: 0,
          totalPayments: 0,
          firstPaymentDate: null,
          lastPaymentDate: null,
          averagePayment: 0
        };
      }

      const totalPaid = payments.reduce((sum, payment) => {
        const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
        return sum + amount;
      }, 0);
      const totalPayments = payments.length;
      const averagePayment = totalPaid / totalPayments;

      // Sort by date to get first and last
      const sortedPayments = payments.sort((a, b) => 
        new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      );

      return {
        totalPaid,
        totalPayments,
        firstPaymentDate: sortedPayments[0].payment_date,
        lastPaymentDate: sortedPayments[sortedPayments.length - 1].payment_date,
        averagePayment
      };
    } catch (error) {
      console.error('Error getting payment statistics:', error);
      return {
        totalPaid: 0,
        totalPayments: 0,
        firstPaymentDate: null,
        lastPaymentDate: null,
        averagePayment: 0
      };
    }
  }

  // Transaction History - Placeholder implementation
  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0): Promise<TransactionHistory[]> {
    try {
      // Fetch payment history directly from API
      const response = await fetch(`/api/payments/history/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch payment history for transactions');
        return [];
      }

      const data = await response.json();
      const payments = data.data || [];

      return payments.map((payment: any) => ({
        id: payment.id,
        user_id: userId,
        transaction_type: 'payment' as const,
        amount: typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: `${payment.payment_type} payment`,
        payment_method: undefined,
        provider_transaction_id: payment.provider_payment_id,
        provider_invoice_id: payment.provider_invoice_id,
        receipt_url: payment.receipt_url,
        metadata: {
          is_first_payment: payment.is_first_payment,
          payment_type: payment.payment_type
        },
        created_at: payment.payment_date,
        updated_at: payment.payment_date
      }));
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  // Export user data for compliance
  async exportUserData(userId: string): Promise<{
    activities: UserActivityHistory[];
    payments: PaymentHistory[];
    transactions: TransactionHistory[];
  }> {
    try {
      const [activities, payments, transactions] = await Promise.all([
        this.getUserActivityHistory(userId, 1000),
        this.getPaymentHistory(userId, 1000),
        this.getTransactionHistory(userId, 1000)
      ]);

      return {
        activities,
        payments,
        transactions
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return {
        activities: [],
        payments: [],
        transactions: []
      };
    }
  }

  // Combined History - Fetches payment transactions
  async getCombinedHistory(userId: string, options: { limit?: number } = {}): Promise<{
    activities: UserActivityHistory[];
    transactions: TransactionHistory[];
    queue_changes: QueueHistory[];
    milestones: MilestoneHistory[];
  }> {
    try {
      console.log('Getting combined history:', { userId, options });

      // Fetch payment transactions
      const transactions = await this.getTransactionHistory(userId, options.limit || 50);

      console.log('Fetched transactions:', transactions);

      return {
        activities: [],
        transactions: transactions,
        queue_changes: [],
        milestones: []
      };
    } catch (error) {
      console.error('Error getting combined history:', error);
      return {
        activities: [],
        transactions: [],
        queue_changes: [],
        milestones: []
      };
    }
  }

  // History Summary - Fetches payment statistics
  async getHistorySummary(userId: string): Promise<HistorySummary> {
    try {
      console.log('Getting history summary:', { userId });

      // Get payment statistics
      const stats = await this.getPaymentStatistics(userId);
      const transactions = await this.getTransactionHistory(userId, 1000);

      const completedTransactions = transactions.filter(t => t.status === 'succeeded');
      const failedTransactions = transactions.filter(t => t.status === 'failed');

      return {
        total_activities: transactions.length,
        completed_activities: completedTransactions.length,
        failed_activities: failedTransactions.length,
        total_transactions: stats.totalPayments,
        total_amount: stats.totalPaid,
        recent_activities: []
      };
    } catch (error) {
      console.error('Error getting history summary:', error);
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

  // Search History - Placeholder implementation
  async searchHistory(userId: string, searchTerm: string, options: { limit?: number } = {}): Promise<{
    activities: UserActivityHistory[];
    transactions: TransactionHistory[];
  }> {
    try {
      // TODO: Implement with proper database queries
      console.log('Searching history:', { userId, searchTerm, options });
      return {
        activities: [],
        transactions: []
      };
    } catch (error) {
      console.error('Error searching history:', error);
      return {
        activities: [],
        transactions: []
      };
    }
  }
}

export default HistoryService;