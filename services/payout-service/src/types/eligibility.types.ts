/**
 * Eligibility Types
 * 
 * Types for eligibility checking and validation
 */

export interface EligibilityResult {
  isEligible: boolean;
  totalRevenue: number;
  companyAgeMonths: number;
  potentialWinners: number;
  eligibleMemberCount: number;
  nextCheckDate: Date;
  reason?: string;
  meetsRevenueRequirement: boolean;
  meetsTimeRequirement: boolean;
  revenueThreshold: number;
  timeThresholdMonths: number;
}

export interface EligibilityCheckConfig {
  revenueThreshold: number;
  timeThresholdMonths: number;
  businessLaunchDate: Date;
  payoutAmountPerWinner: number;
}

export interface RevenueSnapshot {
  totalRevenue: number;
  successfulPayments: number;
  averagePaymentAmount: number;
  lastPaymentDate: Date;
  calculatedAt: Date;
}

export interface CompanyAgeInfo {
  launchDate: Date;
  currentDate: Date;
  ageInMonths: number;
  ageInDays: number;
  meetsRequirement: boolean;
  requiredMonths: number;
}

export interface EligibilityCheckResult {
  eligibility: EligibilityResult;
  revenue: RevenueSnapshot;
  companyAge: CompanyAgeInfo;
  eligibleMembers: EligibleMemberSummary[];
}

export interface EligibleMemberSummary {
  userId: string;
  email: string;
  fullName: string;
  queuePosition: number;
  tenureStartDate: Date;
  totalPayments: number;
  lifetimeTotal: number;
  subscriptionStatus: string;
}
