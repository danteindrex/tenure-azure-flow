import { createClient } from '@supabase/supabase-js';
import { MemberTenure, MemberPaymentStatus } from './types';

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
  fundStatus: string;
  timeStatus: string;
  daysUntilEligible: number;
}

export interface UserPaymentStatus {
  hasJoiningFee: boolean;
  joiningFeeDate: Date | null;
  lastMonthlyPayment: Date | null;
  daysSinceLastPayment: number;
  isInDefault: boolean;
  nextPaymentDue: Date | null;
  totalPaid: number;
  monthlyPaymentCount: number;
}

class BusinessLogicService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * BR-9: Calculate tenure start from joining fee payment date
   */
  async getMemberTenureStart(memberId: number): Promise<Date | null> {
    try {
      const { data: joiningPayment, error } = await this.supabase
        .from('payment')
        .select('payment_date')
        .eq('memberid', memberId)
        .eq('amount', BUSINESS_RULES.JOINING_FEE)
        .eq('status', 'Completed')
        .order('payment_date', { ascending: true })
        .limit(1)
        .single();

      if (error || !joiningPayment) {
        return null;
      }

      return new Date(joiningPayment.payment_date);
    } catch (error) {
      console.error('Error getting member tenure start:', error);
      return null;
    }
  }

  /**
   * BR-5, BR-6, BR-10: Get winner order based on continuous tenure and tie-breaker
   */
  async getWinnerOrder(): Promise<MemberTenure[]> {
    try {
      // Get all active members with their joining fee payment
      const { data: members, error } = await this.supabase
        .from('member')
        .select(`
          id,
          name,
          status,
          payment!inner(payment_date, amount, status)
        `)
        .eq('status', 'Active')
        .eq('payment.amount', BUSINESS_RULES.JOINING_FEE)
        .eq('payment.status', 'Completed');

      if (error || !members) {
        console.error('Error fetching members for winner order:', error);
        return [];
      }

      // Process each member to check continuous tenure
      const memberTenures: MemberTenure[] = [];

      for (const member of members) {
        const tenureStart = new Date(member.payment[0].payment_date);
        const hasContinuousTenure = await this.checkContinuousTenure(member.id, tenureStart);
        
        // Calculate tenure in months
        const tenureMonths = Math.floor((Date.now() - tenureStart.getTime()) / (1000 * 60 * 60 * 24 * 30));

        memberTenures.push({
          id: member.id,
          name: member.name,
          status: member.status,
          joinDate: member.payment[0].payment_date,
          continuousTenure: hasContinuousTenure ? tenureMonths : 0,
          totalPaid: member.payment.reduce((sum: number, p: any) => sum + p.amount, 0),
          lastPaymentDate: member.payment[member.payment.length - 1].payment_date,
          position: 0, // Will be set after sorting
          memberId: member.id,
          memberName: member.name,
          isActive: member.status === 'Active',
          tenureStart,
          queuePosition: 0 // Will be set after sorting
        });
      }

      // Sort by tenure (earliest first), then by member ID for tie-breaking (BR-10)
      const sortedMembers = memberTenures
        .filter(m => m.continuousTenure && m.isActive)
        .sort((a, b) => {
          const tenureCompare = a.tenureStart.getTime() - b.tenureStart.getTime();
          return tenureCompare !== 0 ? tenureCompare : a.memberId - b.memberId;
        });

      // Assign queue positions
      return sortedMembers.map((member, index) => ({
        ...member,
        queuePosition: index + 1
      }));

    } catch (error) {
      console.error('Error calculating winner order:', error);
      return [];
    }
  }

  /**
   * Check if member has continuous tenure (no payment gaps > 30 days)
   */
  async checkContinuousTenure(memberId: number, tenureStart: Date): Promise<boolean> {
    try {
      const { data: payments, error } = await this.supabase
        .from('payment')
        .select('payment_date, amount')
        .eq('memberid', memberId)
        .eq('status', 'Completed')
        .order('payment_date', { ascending: true });

      if (error || !payments || payments.length === 0) {
        return false;
      }

      // Check for gaps in monthly payments
      let lastPaymentDate = tenureStart;
      
      for (const payment of payments) {
        const paymentDate = new Date(payment.payment_date);
        const daysSinceLastPayment = Math.floor(
          (paymentDate.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If gap is more than grace period, tenure is broken
        if (daysSinceLastPayment > BUSINESS_RULES.PAYMENT_GRACE_DAYS && payment.amount === BUSINESS_RULES.MONTHLY_FEE) {
          return false;
        }

        lastPaymentDate = paymentDate;
      }

      // Check if current payment is overdue
      const daysSinceLastPayment = Math.floor(
        (Date.now() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceLastPayment <= BUSINESS_RULES.PAYMENT_GRACE_DAYS;

    } catch (error) {
      console.error('Error checking continuous tenure:', error);
      return false;
    }
  }

  /**
   * BR-3: Calculate payout status based on fund and time requirements
   */
  async getPayoutStatus(): Promise<PayoutStatus> {
    try {
      // Get total revenue from all completed payments
      const { data: payments, error } = await this.supabase
        .from('payment')
        .select('amount')
        .eq('status', 'Completed');

      if (error) {
        console.error('Error fetching payments for payout status:', error);
        return this.getDefaultPayoutStatus();
      }

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Calculate time since business launch
      const monthsSinceLaunch = Math.floor(
        (Date.now() - BUSINESS_RULES.BUSINESS_LAUNCH_DATE.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      const daysUntilEligible = Math.max(0, 
        (BUSINESS_RULES.PAYOUT_MONTHS_REQUIRED * 30) - 
        Math.floor((Date.now() - BUSINESS_RULES.BUSINESS_LAUNCH_DATE.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Check conditions
      const fundReady = totalRevenue >= BUSINESS_RULES.PAYOUT_THRESHOLD;
      const timeReady = monthsSinceLaunch >= BUSINESS_RULES.PAYOUT_MONTHS_REQUIRED;
      const payoutReady = fundReady && timeReady;

      // Calculate potential winners (BR-4, BR-6)
      const potentialWinners = Math.floor(totalRevenue / BUSINESS_RULES.REWARD_PER_WINNER);

      return {
        fundReady,
        timeReady,
        payoutReady,
        totalRevenue,
        potentialWinners,
        fundStatus: fundReady 
          ? 'Fund Ready' 
          : `Need $${(BUSINESS_RULES.PAYOUT_THRESHOLD - totalRevenue).toLocaleString()} more`,
        timeStatus: timeReady 
          ? 'Time Requirement Met' 
          : `${BUSINESS_RULES.PAYOUT_MONTHS_REQUIRED - monthsSinceLaunch} months remaining`,
        daysUntilEligible
      };

    } catch (error) {
      console.error('Error calculating payout status:', error);
      return this.getDefaultPayoutStatus();
    }
  }

  private getDefaultPayoutStatus(): PayoutStatus {
    return {
      fundReady: false,
      timeReady: false,
      payoutReady: false,
      totalRevenue: 0,
      potentialWinners: 0,
      fundStatus: 'Loading...',
      timeStatus: 'Loading...',
      daysUntilEligible: 0
    };
  }

  /**
   * Get member payment status including default risk
   */
  async getMemberPaymentStatus(memberId: number): Promise<MemberPaymentStatus> {
    try {
      // Get joining fee payment
      const { data: joiningPayment, error: joiningError } = await this.supabase
        .from('payment')
        .select('payment_date')
        .eq('memberid', memberId)
        .eq('amount', BUSINESS_RULES.JOINING_FEE)
        .eq('status', 'Completed')
        .order('payment_date', { ascending: true })
        .limit(1)
        .single();

      // Get all monthly payments
      const { data: monthlyPayments, error: monthlyError } = await this.supabase
        .from('payment')
        .select('payment_date, amount')
        .eq('memberid', memberId)
        .eq('amount', BUSINESS_RULES.MONTHLY_FEE)
        .eq('status', 'Completed')
        .order('payment_date', { ascending: false });

      // Get total payments
      const { data: allPayments, error: totalError } = await this.supabase
        .from('payment')
        .select('amount')
        .eq('memberid', memberId)
        .eq('status', 'Completed');

      const hasJoiningFee = !joiningError && joiningPayment;
      const joiningFeeDate = hasJoiningFee ? new Date(joiningPayment.payment_date) : null;
      const lastMonthlyPayment = monthlyPayments && monthlyPayments.length > 0 
        ? new Date(monthlyPayments[0].payment_date) 
        : null;

      const daysSinceLastPayment = lastMonthlyPayment 
        ? Math.floor((Date.now() - lastMonthlyPayment.getTime()) / (1000 * 60 * 60 * 24))
        : (hasJoiningFee ? Math.floor((Date.now() - joiningFeeDate!.getTime()) / (1000 * 60 * 60 * 24)) : 999);

      const isInDefault = daysSinceLastPayment > BUSINESS_RULES.PAYMENT_GRACE_DAYS;

      // Calculate next payment due
      let nextPaymentDue: Date | null = null;
      if (lastMonthlyPayment) {
        nextPaymentDue = new Date(lastMonthlyPayment);
        nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
      } else if (hasJoiningFee) {
        nextPaymentDue = new Date(joiningFeeDate!);
        nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
      }

      const totalPaid = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const monthlyPaymentCount = monthlyPayments?.length || 0;

      return {
        memberId,
        status: isInDefault ? 'overdue' : (hasJoiningFee ? 'current' : 'suspended'),
        lastPaymentDate: lastMonthlyPayment?.toISOString() || '',
        nextPaymentDue: nextPaymentDue?.toISOString() || '',
        totalPaid,
        continuousTenure: monthlyPaymentCount,
        hasJoiningFee,
        isInDefault,
        daysSinceLastPayment,
        lastMonthlyPayment,
        monthlyPaymentCount
      };

    } catch (error) {
      console.error('Error getting member payment status:', error);
      return {
        memberId,
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
   * BR-8: Enforce payment default penalties
   */
  async enforcePaymentDefaults(): Promise<{ updated: number; removed: number }> {
    try {
      let updated = 0;
      let removed = 0;

      // Get all active members
      const { data: activeMembers, error } = await this.supabase
        .from('member')
        .select('id, name')
        .eq('status', 'Active');

      if (error || !activeMembers) {
        console.error('Error fetching active members:', error);
        return { updated: 0, removed: 0 };
      }

      for (const member of activeMembers) {
        const paymentStatus = await this.getMemberPaymentStatus(member.id);

        if (paymentStatus.isInDefault) {
          // Mark member as inactive (BR-8)
          const { error: updateError } = await this.supabase
            .from('member')
            .update({ 
              status: 'Inactive',
              default_date: new Date().toISOString()
            })
            .eq('id', member.id);

          if (!updateError) {
            updated++;

            // Remove from queue
            const { error: queueError } = await this.supabase
              .from('queue')
              .delete()
              .eq('memberid', member.id);

            if (!queueError) {
              removed++;
            }

            console.log(`Member ${member.name} (ID: ${member.id}) marked inactive due to payment default`);
          }
        }
      }

      return { updated, removed };

    } catch (error) {
      console.error('Error enforcing payment defaults:', error);
      return { updated: 0, removed: 0 };
    }
  }

  /**
   * Update queue positions based on current tenure rankings
   */
  async updateQueuePositions(): Promise<boolean> {
    try {
      const winnerOrder = await this.getWinnerOrder();

      for (const member of winnerOrder) {
        await this.supabase
          .from('queue')
          .upsert({
            memberid: member.memberId,
            queue_position: member.queuePosition,
            subscription_active: member.isActive,
            updated_at: new Date().toISOString()
          });
      }

      return true;
    } catch (error) {
      console.error('Error updating queue positions:', error);
      return false;
    }
  }
}

export default BusinessLogicService;