/**
 * Approval Workflow Types
 * 
 * Types for payout approval management
 */

export interface ApprovalWorkflow {
  requiredApprovals: number;
  currentApprovals: number;
  approvers: Approver[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  completedAt?: Date;
}

export interface Approver {
  adminId: number;
  adminName: string;
  adminEmail: string;
  decision?: 'approved' | 'rejected';
  reason?: string;
  timestamp?: Date;
}

export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
  timestamp: Date;
  adminId: number;
  adminName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ApprovalStatus {
  isComplete: boolean;
  isApproved: boolean;
  isRejected: boolean;
  pendingApprovers: number[];
  completedApprovals: Approver[];
  requiredApprovals: number;
  currentApprovals: number;
  rejectionReason?: string;
}

export interface ApprovalRequest {
  payoutId: string;
  userId: string;
  amount: number;
  queuePosition: number;
  requestedBy: number;
  requestedAt: Date;
  requiredApprovals: number;
}

export interface ApprovalSubmission {
  payoutId: string;
  adminId: number;
  decision: 'approved' | 'rejected';
  reason?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
  };
}

export interface ApprovalThresholdConfig {
  amount: number;
  requiredApprovals: number;
  allowedRoles: string[];
}

export interface ApprovalHistory {
  payoutId: string;
  workflow: ApprovalWorkflow;
  decisions: ApprovalDecision[];
  finalStatus: 'approved' | 'rejected' | 'pending';
  completedAt?: Date;
}
