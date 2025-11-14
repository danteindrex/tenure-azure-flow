/**
 * Winner Selection Types
 * 
 * Types for winner selection and validation
 */

export interface Winner {
  userId: string;
  email: string;
  fullName: string;
  queuePosition: number;
  tenureStartDate: Date;
  lastPaymentDate: Date;
  totalPayments: number;
  lifetimeTotal: number;
  subscriptionStatus: string;
  subscriptionId?: string;
  kycStatus?: string;
}

export interface ValidationResult {
  isValid: boolean;
  kycVerified: boolean;
  hasActiveSubscription: boolean;
  hasValidBankInfo: boolean;
  hasValidTaxInfo: boolean;
  errors: string[];
  warnings: string[];
}

export interface WinnerValidationDetails {
  userId: string;
  validation: ValidationResult;
  winner: Winner;
  timestamp: Date;
}

export interface WinnerSelectionCriteria {
  maxWinners: number;
  requireKycVerification: boolean;
  requireActiveSubscription: boolean;
  excludeRecentPayouts: boolean;
  excludePayoutDays?: number;
}

export interface WinnerSelectionResult {
  winners: Winner[];
  totalEligible: number;
  totalSelected: number;
  selectionCriteria: WinnerSelectionCriteria;
  validationResults: Map<string, ValidationResult>;
  timestamp: Date;
}

export interface PayoutCreationRequest {
  winners: Winner[];
  initiatedBy: number;
  notes?: string;
}

export interface PayoutCreationResult {
  success: boolean;
  payoutIds: string[];
  failedUsers: Array<{
    userId: string;
    reason: string;
  }>;
  createdCount: number;
  failedCount: number;
}
