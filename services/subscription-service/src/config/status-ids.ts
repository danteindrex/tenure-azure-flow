/**
 * Status ID Constants for Subscription Service
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

// Payment Status (payment_statuses table)
export const PAYMENT_STATUS = {
  PENDING: 1,      // Payment is pending
  SUCCEEDED: 2,    // Payment succeeded
  FAILED: 3,       // Payment failed
  REFUNDED: 4,     // Payment was refunded
  CANCELED: 5,     // Payment was canceled
} as const;

// Verification Status (verification_statuses table)
export const VERIFICATION_STATUS = {
  PENDING: 1,      // Verification pending
  VERIFIED: 2,     // Verification completed
  FAILED: 3,       // Verification failed
  SKIPPED: 4,      // Verification skipped
} as const;

/**
 * Maps Stripe subscription status strings to our internal status IDs
 */
export function mapStripeSubscriptionStatus(stripeStatus: string): number {
  const mapping: Record<string, number> = {
    'active': SUBSCRIPTION_STATUS.ACTIVE,
    'trialing': SUBSCRIPTION_STATUS.TRIALING,
    'past_due': SUBSCRIPTION_STATUS.PAST_DUE,
    'canceled': SUBSCRIPTION_STATUS.CANCELED,
    'incomplete': SUBSCRIPTION_STATUS.INCOMPLETE,
    'incomplete_expired': SUBSCRIPTION_STATUS.CANCELED,
    'unpaid': SUBSCRIPTION_STATUS.UNPAID,
    'paused': SUBSCRIPTION_STATUS.CANCELED,
  };
  return mapping[stripeStatus] ?? SUBSCRIPTION_STATUS.CANCELED;
}

/**
 * Checks if a subscription status ID represents an active subscription
 */
export function isSubscriptionActive(statusId: number | null | undefined): boolean {
  return statusId === SUBSCRIPTION_STATUS.ACTIVE || statusId === SUBSCRIPTION_STATUS.TRIALING;
}
