// Database operations moved to API endpoints for client-side compatibility

// Business Rules Constants (BR-1 through BR-10)
export const BUSINESS_RULES = {
  JOINING_FEE: 300,           // BR-1: $300 one-time joining fee
  MONTHLY_FEE: 25,            // BR-2: $25 monthly recurring fee
  PAYOUT_THRESHOLD: 100000,   // BR-3: $100K minimum for payout
  REWARD_PER_WINNER: 100000,  // BR-4: $100K per winning member
  RETENTION_FEE: 300,         // BR-7: 12 months pre-pay ($25 x 12)
  BUSINESS_LAUNCH_DATE: new Date('2024-01-01'), // BR-3: Official launch date
  PAYOUT_MONTHS_REQUIRED: 12, // BR-3: 12 months after launch
  PAYMENT_GRACE_DAYS: 30      // BR-8: Days before default
};

export interface UserTenure {
  userId: string;
  userName: string;
  tenureStart: Date;
  continuousTenure: boolean;
  isActive: boolean;
  queuePosition: number;
}

export interface PayoutStatus {
  fundReady: boolean;
  timeReady: boolean;
  payoutReady: boolean;
  totalRevenue: number;
  potentialWinners: number;
  nextPayoutDate: Date | null;
}

export interface MemberTenure {
  memberId: number;
  memberName: string;
  isActive: boolean;
  tenureStart: Date;
  continuousTenure: number; // months
  totalPaid: number;
  lastPaymentDate: string;
  position: number;
  queuePosition: number;
}

export interface MemberPaymentStatus {
  memberId: string;
  status: 'current' | 'overdue' | 'suspended';
  lastPaymentDate: string;
  nextPaymentDue: string;
  totalPaid: number;
  continuousTenure: number;
  hasJoiningFee: boolean;
  isInDefault: boolean;
  daysSinceLastPayment: number;
  lastMonthlyPayment: Date | null;
  monthlyPaymentCount: number;
}

class BusinessLogicService {
  constructor() {
    // Using Drizzle ORM with existing database tables
  }

  /**
   * BR-9: Calculate tenure start from joining fee payment date
   * Uses normalized user_payments table
   */
  async getMemberTenureStart(userId: string): Promise<Date | null> {
    try {
      const response = await fetch(`/api/business-rules/tenure-start?userId=${userId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenure start');
      }

      const data = await response.json();
      return data.tenureStart ? new Date(data.tenureStart) : null;
    } catch (error) {
      console.error('Error getting member tenure start:', error);
      return null;
    }
  }

  /**
   * BR-3, BR-4, BR-5: Get all members with continuous tenure for queue ranking
   * Uses normalized tables with proper joins
   */
  async getMembersWithContinuousTenure(): Promise<MemberTenure[]> {
    try {
      const response = await fetch('/api/business-rules/continuous-tenure', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members with continuous tenure');
      }

      const data = await response.json();
      return data.members || [];
    } catch (error) {
      console.error('Error getting members with continuous tenure:', error);
      return [];
    }
  }

  /**
   * BR-6: Check if member has continuous tenure (no missed payments)
   */
  async checkContinuousTenure(userId: string, tenureStart: Date): Promise<boolean> {
    try {
      const response = await fetch(`/api/business-rules/check-tenure?userId=${userId}&tenureStart=${tenureStart.toISOString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to check continuous tenure');
      }

      const data = await response.json();
      return data.hasContinuousTenure || false;
    } catch (error) {
      console.error('Error checking continuous tenure:', error);
      return false;
    }
  }

  /**
   * BR-3: Check if payout conditions are met
   */
  async checkPayoutConditions(): Promise<PayoutStatus> {
    try {
      const response = await fetch('/api/business-rules/payout-conditions', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to check payout conditions');
      }

      const data = await response.json();
      return data.payoutStatus || {
        fundReady: false,
        timeReady: false,
        payoutReady: false,
        totalRevenue: 0,
        potentialWinners: 0,
        nextPayoutDate: null
      };
    } catch (error) {
      console.error('Error checking payout conditions:', error);
      return {
        fundReady: false,
        timeReady: false,
        payoutReady: false,
        totalRevenue: 0,
        potentialWinners: 0,
        nextPayoutDate: null
      };
    }
  }

  /**
   * Get member payment status for dashboard
   */
  async getMemberPaymentStatus(userId: string): Promise<MemberPaymentStatus> {
    try {
      const response = await fetch(`/api/business-rules/payment-status?userId=${userId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get member payment status');
      }

      const data = await response.json();
      return data.paymentStatus || {
        memberId: userId,
        status: 'suspended',
        lastPaymentDate: '',
        nextPaymentDue: '',
        totalPaid: 0,
        continuousTenure: 0,
        hasJoiningFee: false,
        isInDefault: true,
        daysSinceLastPayment: 999,
        lastMonthlyPayment: null,
        monthlyPaymentCount: 0
      };
    } catch (error) {
      console.error('Error getting member payment status:', error);
      return {
        memberId: userId,
        status: 'suspended',
        lastPaymentDate: '',
        nextPaymentDue: '',
        totalPaid: 0,
        continuousTenure: 0,
        hasJoiningFee: false,
        isInDefault: true,
        daysSinceLastPayment: 999,
        lastMonthlyPayment: null,
        monthlyPaymentCount: 0
      };
    }
  }

  /**
   * BR-8: Enforce payment defaults and queue management
   */
  async enforcePaymentDefaults(): Promise<{ processed: number; defaulted: number }> {
    try {
      const response = await fetch('/api/business-rules/enforce-defaults', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to enforce payment defaults');
      }

      const data = await response.json();
      return data.result || { processed: 0, defaulted: 0 };
    } catch (error) {
      console.error('Error enforcing payment defaults:', error);
      return { processed: 0, defaulted: 0 };
    }
  }

  /**
   * BR-4, BR-5: Process payout to winners
   */
  async processPayoutToWinners(): Promise<{ success: boolean; winners: string[]; error?: string }> {
    try {
      const response = await fetch('/api/business-rules/process-payout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to process payout to winners');
      }

      const data = await response.json();
      return data.result || {
        success: false,
        winners: [],
        error: 'Unknown error'
      };
    } catch (error) {
      console.error('Error processing payout to winners:', error);
      return {
        success: false,
        winners: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const businessLogicService = new BusinessLogicService();
export default businessLogicService;