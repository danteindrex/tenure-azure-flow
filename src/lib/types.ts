// Type definitions for the application

export interface MemberTenure {
  id: number;
  name: string;
  status: string;
  joinDate: string;
  continuousTenure: number;
  totalPaid: number;
  lastPaymentDate: string;
  position: number;
  memberId: number;
  memberName: string;
  isActive: boolean;
  tenureStart: Date;
  queuePosition: number;
}

export interface QueueMember {
  id: number;
  name: string;
  email: string;
  status: string;
  joinDate: string;
  position: number;
  continuousTenure: number;
  totalPaid: number;
  lastPaymentDate: string;
  nextPaymentDue: string;
  // subscription_active removed - all queue members have active subscriptions by definition
}

export interface MemberPaymentStatus {
  memberId: number;
  status: 'current' | 'overdue' | 'suspended';
  lastPaymentDate: string;
  nextPaymentDue: string;
  totalPaid: number;
  continuousTenure: number;
  hasJoiningFee: boolean;
  isInDefault: boolean;
  daysSinceLastPayment: number;
  lastMonthlyPayment?: Date;
  monthlyPaymentCount: number;
}

export interface QueueStatistics {
  totalMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  totalRevenue: number;
  averageTenure: number;
}

export interface PaymentRecord {
  id: number;
  memberId: number;
  amount: number;
  date: string;
  status: 'succeeded' | 'pending' | 'failed';
  type: 'joining_fee' | 'monthly_fee';
}