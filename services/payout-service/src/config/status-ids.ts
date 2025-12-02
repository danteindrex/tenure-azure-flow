/**
 * Status ID Constants for Payout Service
 *
 * These constants map to the IDs in the lookup tables in the database.
 * Keep in sync with the main app's src/lib/status-ids.ts
 */

// User Funnel Status (user_funnel_statuses table)
export const USER_STATUS = {
  PENDING: 1,      // User has registered but not completed onboarding
  ONBOARDED: 2,    // User has completed all onboarding steps
} as const;

// Member Eligibility Status (member_eligibility_statuses table)
export const MEMBER_STATUS = {
  INACTIVE: 1,     // Member is not active in the queue
  ACTIVE: 2,       // Member is active in the queue
  SUSPENDED: 3,    // Member has been suspended
  CANCELLED: 4,    // Member has cancelled
  WON: 5,          // Member has won the payout
  PAID: 6,         // Member has been paid
} as const;

// Subscription Status (subscription_statuses table)
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 1,       // Active subscription
  TRIALING: 2,     // In trial period
  PAST_DUE: 3,     // Payment failed, in grace period
  CANCELED: 4,     // Subscription cancelled
  INCOMPLETE: 5,   // Initial payment failed
  UNPAID: 6,       // Payment failed, no longer in grace period
} as const;

// KYC Status (kyc_statuses table)
export const KYC_STATUS = {
  PENDING: 1,      // KYC pending verification
  IN_REVIEW: 2,    // KYC under review
  VERIFIED: 3,     // KYC verified
  REJECTED: 4,     // KYC rejected
  EXPIRED: 5,      // KYC verification expired
} as const;

// Payout Status (payout_statuses table)
export const PAYOUT_STATUS = {
  PENDING_APPROVAL: 1,  // Payout pending admin approval
  APPROVED: 2,          // Payout approved
  SCHEDULED: 3,         // Payout scheduled for processing
  PROCESSING: 4,        // Payout being processed
  COMPLETED: 5,         // Payout completed
  FAILED: 6,            // Payout failed
  CANCELLED: 7,         // Payout cancelled
} as const;

// Payment Status (payment_statuses table)
export const PAYMENT_STATUS = {
  PENDING: 1,      // Payment is pending
  SUCCEEDED: 2,    // Payment succeeded
  FAILED: 3,       // Payment failed
  REFUNDED: 4,     // Payment was refunded
  CANCELED: 5,     // Payment was canceled
} as const;

/**
 * Checks if a subscription status ID represents an active subscription
 */
export function isSubscriptionActive(statusId: number | null | undefined): boolean {
  return statusId === SUBSCRIPTION_STATUS.ACTIVE || statusId === SUBSCRIPTION_STATUS.TRIALING;
}

/**
 * Checks if a KYC status ID represents verified status
 */
export function isKycVerified(statusId: number | null | undefined): boolean {
  return statusId === KYC_STATUS.VERIFIED;
}
