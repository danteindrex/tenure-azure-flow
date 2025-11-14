/**
 * Payout Management Types
 * 
 * Core types for payout records and status management
 */

export type PayoutStatus = 
  | 'pending_approval'
  | 'pending_bank_info'
  | 'pending_tax_info'
  | 'approved'
  | 'ready_for_payment'
  | 'payment_sent'
  | 'completed'
  | 'payment_failed'
  | 'rejected'
  | 'cancelled'
  | 'requires_manual_review';

export interface EligibilitySnapshot {
  totalRevenue: number;
  companyAgeMonths: number;
  queuePosition: number;
  tenureStartDate: string;
  totalPayments: number;
  lifetimeTotal: number;
  selectionCriteria: string;
  timestamp: string;
}

export interface ApprovalDecision {
  adminId: number;
  decision: 'approved' | 'rejected';
  reason?: string;
  timestamp: string;
}

export interface BankDetails {
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  encrypted: boolean;
}

export interface TaxWithholding {
  withholdingRate: number;
  withheldAmount: number;
  netPayoutAmount: number;
  reason: string;
}

export interface ProcessingDetails {
  sentDate?: string;
  expectedArrivalDate?: string;
  completedDate?: string;
  trackingNumber?: string;
  confirmationNumber?: string;
  notes?: string;
  grossAmount?: number;
  retentionFee?: number;
  taxWithholding?: number;
  netAmount?: number;
  breakdown?: Array<{
    description: string;
    amount: number;
  }>;
  membershipRemovalScheduled?: string;
  membershipRemoved?: boolean;
  membershipRemovedAt?: string;
  removalReason?: string;
}

export interface InternalNote {
  adminId: number;
  note: string;
  timestamp: string;
}

export interface AuditTrailEntry {
  action: string;
  actor: string;
  timestamp: string;
  details: any;
}

export interface PayoutManagementRecord {
  id: string;
  payoutId: string;
  userId: string;
  queuePosition: number;
  amount: number;
  currency: string;
  status: PayoutStatus;
  retentionFee: number;
  netAmount: number;
  membershipRemovalDate?: Date;
  eligibilityCheck: EligibilitySnapshot;
  approvalWorkflow: ApprovalDecision[];
  scheduledDate?: Date;
  paymentMethod: 'ach' | 'check';
  bankDetails?: BankDetails;
  taxWithholding?: TaxWithholding;
  processing?: ProcessingDetails;
  receiptUrl?: string;
  internalNotes: InternalNote[];
  auditTrail: AuditTrailEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutSummary {
  id: string;
  payoutId: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  netAmount: number;
  status: PayoutStatus;
  queuePosition: number;
  createdAt: Date;
  scheduledDate?: Date;
}

export interface PayoutListFilters {
  status?: PayoutStatus | PayoutStatus[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}
