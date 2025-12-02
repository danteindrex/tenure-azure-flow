/**
 * Status ID Constants
 *
 * These constants map to the IDs in the individual lookup tables created in the database.
 * Use these constants instead of hardcoded strings or numbers for type safety and maintainability.
 *
 * IMPORTANT: These IDs correspond to the lookup tables in the database.
 * If you change the database, update these constants accordingly.
 */

// =====================================================
// USER FUNNEL STATUS (user_funnel_statuses table)
// =====================================================
export const USER_STATUS = {
  PENDING: 1,      // User has registered but not completed onboarding
  ONBOARDED: 2,    // User has completed all onboarding steps
} as const;

export type UserStatusId = typeof USER_STATUS[keyof typeof USER_STATUS];

// =====================================================
// MEMBER ELIGIBILITY STATUS (member_eligibility_statuses table)
// =====================================================
export const MEMBER_STATUS = {
  INACTIVE: 1,     // Member is not active in the queue
  ACTIVE: 2,       // Member is active in the queue
  SUSPENDED: 3,    // Member has been suspended
  CANCELLED: 4,    // Member has cancelled
  WON: 5,          // Member has won the payout
  PAID: 6,         // Member has been paid
} as const;

export type MemberStatusId = typeof MEMBER_STATUS[keyof typeof MEMBER_STATUS];

// =====================================================
// SUBSCRIPTION STATUS (subscription_statuses table)
// =====================================================
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 1,       // Active subscription
  TRIALING: 2,     // In trial period
  PAST_DUE: 3,     // Payment failed, in grace period
  CANCELED: 4,     // Subscription cancelled
  INCOMPLETE: 5,   // Initial payment failed
  UNPAID: 6,       // Payment failed, no longer in grace period
} as const;

export type SubscriptionStatusId = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// =====================================================
// PAYMENT STATUS (payment_statuses table)
// =====================================================
export const PAYMENT_STATUS = {
  PENDING: 1,      // Payment is pending
  SUCCEEDED: 2,    // Payment succeeded
  FAILED: 3,       // Payment failed
  REFUNDED: 4,     // Payment was refunded
  CANCELED: 5,     // Payment was canceled
} as const;

export type PaymentStatusId = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// =====================================================
// KYC STATUS (kyc_statuses table)
// =====================================================
export const KYC_STATUS = {
  PENDING: 1,      // KYC pending verification
  IN_REVIEW: 2,    // KYC under review
  VERIFIED: 3,     // KYC verified
  REJECTED: 4,     // KYC rejected
  EXPIRED: 5,      // KYC verification expired
} as const;

export type KycStatusId = typeof KYC_STATUS[keyof typeof KYC_STATUS];

// =====================================================
// PAYOUT STATUS (payout_statuses table)
// =====================================================
export const PAYOUT_STATUS = {
  PENDING_APPROVAL: 1,  // Payout pending admin approval
  APPROVED: 2,          // Payout approved
  SCHEDULED: 3,         // Payout scheduled for processing
  PROCESSING: 4,        // Payout being processed
  COMPLETED: 5,         // Payout completed
  FAILED: 6,            // Payout failed
  CANCELLED: 7,         // Payout cancelled
} as const;

export type PayoutStatusId = typeof PAYOUT_STATUS[keyof typeof PAYOUT_STATUS];

// =====================================================
// VERIFICATION STATUS (verification_statuses table)
// =====================================================
export const VERIFICATION_STATUS = {
  PENDING: 1,      // Verification pending
  VERIFIED: 2,     // Verification completed
  FAILED: 3,       // Verification failed
  SKIPPED: 4,      // Verification skipped
} as const;

export type VerificationStatusId = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

// =====================================================
// ADMIN STATUS (admin_statuses table)
// =====================================================
export const ADMIN_STATUS = {
  ACTIVE: 1,       // Active admin
  INACTIVE: 2,     // Inactive admin
  SUSPENDED: 3,    // Suspended admin
} as const;

export type AdminStatusId = typeof ADMIN_STATUS[keyof typeof ADMIN_STATUS];

// =====================================================
// QUEUE ENTRY STATUS (queue_entry_statuses table)
// =====================================================
export const QUEUE_ENTRY_STATUS = {
  ACTIVE: 1,       // Active in queue
  PROCESSING: 2,   // Being processed
  COMPLETED: 3,    // Processing completed
  REMOVED: 4,      // Removed from queue
} as const;

export type QueueEntryStatusId = typeof QUEUE_ENTRY_STATUS[keyof typeof QUEUE_ENTRY_STATUS];

// =====================================================
// BILLING SCHEDULE STATUS (billing_schedule_statuses table)
// =====================================================
export const BILLING_SCHEDULE_STATUS = {
  ACTIVE: 1,       // Active schedule
  PAUSED: 2,       // Schedule paused
  CANCELLED: 3,    // Schedule cancelled
} as const;

export type BillingScheduleStatusId = typeof BILLING_SCHEDULE_STATUS[keyof typeof BILLING_SCHEDULE_STATUS];

// =====================================================
// DISPUTE STATUS (dispute_statuses table)
// =====================================================
export const DISPUTE_STATUS = {
  NEEDS_RESPONSE: 1,   // Needs merchant response
  UNDER_REVIEW: 2,     // Under review by payment provider
  WON: 3,              // Dispute won by merchant
  LOST: 4,             // Dispute lost by merchant
  CLOSED: 5,           // Dispute closed
} as const;

export type DisputeStatusId = typeof DISPUTE_STATUS[keyof typeof DISPUTE_STATUS];

// =====================================================
// TRANSACTION STATUS (transaction_statuses table)
// =====================================================
export const TRANSACTION_STATUS = {
  PENDING: 1,      // Transaction pending
  COMPLETED: 2,    // Transaction completed
  FAILED: 3,       // Transaction failed
  REVERSED: 4,     // Transaction reversed
} as const;

export type TransactionStatusId = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

// =====================================================
// ADMIN ALERT STATUS (admin_alert_statuses table)
// =====================================================
export const ADMIN_ALERT_STATUS = {
  UNREAD: 1,       // Alert not read
  READ: 2,         // Alert read
  ACKNOWLEDGED: 3, // Alert acknowledged
  RESOLVED: 4,     // Alert resolved
} as const;

export type AdminAlertStatusId = typeof ADMIN_ALERT_STATUS[keyof typeof ADMIN_ALERT_STATUS];

// =====================================================
// TAX FORM STATUS (tax_form_statuses table)
// =====================================================
export const TAX_FORM_STATUS = {
  NOT_SUBMITTED: 1, // Tax form not submitted
  PENDING_REVIEW: 2, // Tax form pending review
  APPROVED: 3,      // Tax form approved
  REJECTED: 4,      // Tax form rejected
} as const;

export type TaxFormStatusId = typeof TAX_FORM_STATUS[keyof typeof TAX_FORM_STATUS];

// =====================================================
// POST STATUS (post_statuses table)
// =====================================================
export const POST_STATUS = {
  DRAFT: 1,        // Post is a draft
  PUBLISHED: 2,    // Post is published
  ARCHIVED: 3,     // Post is archived
} as const;

export type PostStatusId = typeof POST_STATUS[keyof typeof POST_STATUS];

// =====================================================
// AUDIT LOG STATUS (audit_log_statuses table)
// =====================================================
export const AUDIT_LOG_STATUS = {
  SUCCESS: 1,      // Action succeeded
  FAILURE: 2,      // Action failed
  WARNING: 3,      // Action completed with warnings
} as const;

export type AuditLogStatusId = typeof AUDIT_LOG_STATUS[keyof typeof AUDIT_LOG_STATUS];

// =====================================================
// SIGNUP SESSION STATUS (signup_session_statuses table)
// =====================================================
export const SIGNUP_SESSION_STATUS = {
  IN_PROGRESS: 1,  // Signup in progress
  COMPLETED: 2,    // Signup completed
  ABANDONED: 3,    // Signup abandoned
  EXPIRED: 4,      // Signup session expired
} as const;

export type SignupSessionStatusId = typeof SIGNUP_SESSION_STATUS[keyof typeof SIGNUP_SESSION_STATUS];

// =====================================================
// TRANSACTION MONITORING STATUS (transaction_monitoring_statuses table)
// =====================================================
export const TRANSACTION_MONITORING_STATUS = {
  PENDING_REVIEW: 1,  // Pending manual review
  CLEARED: 2,         // Transaction cleared
  FLAGGED: 3,         // Transaction flagged for investigation
  BLOCKED: 4,         // Transaction blocked
} as const;

export type TransactionMonitoringStatusId = typeof TRANSACTION_MONITORING_STATUS[keyof typeof TRANSACTION_MONITORING_STATUS];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Checks if a user status ID represents an active/onboarded user
 */
export function isUserOnboarded(statusId: number | null | undefined): boolean {
  return statusId === USER_STATUS.ONBOARDED;
}

/**
 * Checks if a member status ID represents an active member
 */
export function isMemberActive(statusId: number | null | undefined): boolean {
  return statusId === MEMBER_STATUS.ACTIVE;
}

/**
 * Checks if a member status ID represents a member eligible for the queue
 */
export function isMemberEligibleForQueue(statusId: number | null | undefined): boolean {
  return statusId === MEMBER_STATUS.ACTIVE;
}

/**
 * Checks if a member has won or been paid
 */
export function hasMemberWonOrPaid(statusId: number | null | undefined): boolean {
  return statusId === MEMBER_STATUS.WON || statusId === MEMBER_STATUS.PAID;
}

/**
 * Checks if a subscription status ID represents an active subscription
 */
export function isSubscriptionActive(statusId: number | null | undefined): boolean {
  return statusId === SUBSCRIPTION_STATUS.ACTIVE || statusId === SUBSCRIPTION_STATUS.TRIALING;
}

/**
 * Checks if a payment status ID represents a successful payment
 */
export function isPaymentSuccessful(statusId: number | null | undefined): boolean {
  return statusId === PAYMENT_STATUS.SUCCEEDED;
}

/**
 * Checks if a KYC status ID represents verified status
 */
export function isKycVerified(statusId: number | null | undefined): boolean {
  return statusId === KYC_STATUS.VERIFIED;
}

/**
 * Checks if a payout has been completed
 */
export function isPayoutCompleted(statusId: number | null | undefined): boolean {
  return statusId === PAYOUT_STATUS.COMPLETED;
}

// =====================================================
// STRIPE STATUS MAPPING
// =====================================================

/**
 * Maps Stripe subscription status strings to our internal status IDs
 */
export function mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatusId {
  const mapping: Record<string, SubscriptionStatusId> = {
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
 * Maps Stripe payment intent status strings to our internal status IDs
 */
export function mapStripePaymentStatus(stripeStatus: string): PaymentStatusId {
  const mapping: Record<string, PaymentStatusId> = {
    'succeeded': PAYMENT_STATUS.SUCCEEDED,
    'processing': PAYMENT_STATUS.PENDING,
    'requires_payment_method': PAYMENT_STATUS.FAILED,
    'requires_confirmation': PAYMENT_STATUS.PENDING,
    'requires_action': PAYMENT_STATUS.PENDING,
    'canceled': PAYMENT_STATUS.CANCELED,
    'requires_capture': PAYMENT_STATUS.PENDING,
  };
  return mapping[stripeStatus] ?? PAYMENT_STATUS.PENDING;
}

// =====================================================
// STATUS NAME LOOKUP FUNCTIONS
// =====================================================

/**
 * Gets the human-readable name for a payment status ID
 */
export function getPaymentStatusName(statusId: number | null | undefined): string {
  const names: Record<number, string> = {
    [PAYMENT_STATUS.PENDING]: 'Pending',
    [PAYMENT_STATUS.SUCCEEDED]: 'Succeeded',
    [PAYMENT_STATUS.FAILED]: 'Failed',
    [PAYMENT_STATUS.REFUNDED]: 'Refunded',
    [PAYMENT_STATUS.CANCELED]: 'Canceled',
  };
  return names[statusId ?? 0] ?? 'Unknown';
}

/**
 * Gets the human-readable name for a subscription status ID
 */
export function getSubscriptionStatusName(statusId: number | null | undefined): string {
  const names: Record<number, string> = {
    [SUBSCRIPTION_STATUS.ACTIVE]: 'Active',
    [SUBSCRIPTION_STATUS.TRIALING]: 'Trialing',
    [SUBSCRIPTION_STATUS.PAST_DUE]: 'Past Due',
    [SUBSCRIPTION_STATUS.CANCELED]: 'Canceled',
    [SUBSCRIPTION_STATUS.INCOMPLETE]: 'Incomplete',
    [SUBSCRIPTION_STATUS.UNPAID]: 'Unpaid',
  };
  return names[statusId ?? 0] ?? 'Unknown';
}

/**
 * Gets the human-readable name for a member status ID
 */
export function getMemberStatusName(statusId: number | null | undefined): string {
  const names: Record<number, string> = {
    [MEMBER_STATUS.INACTIVE]: 'Inactive',
    [MEMBER_STATUS.ACTIVE]: 'Active',
    [MEMBER_STATUS.SUSPENDED]: 'Suspended',
    [MEMBER_STATUS.CANCELLED]: 'Cancelled',
    [MEMBER_STATUS.WON]: 'Won',
    [MEMBER_STATUS.PAID]: 'Paid',
  };
  return names[statusId ?? 0] ?? 'Unknown';
}

/**
 * Gets the human-readable name for a KYC status ID
 */
export function getKycStatusName(statusId: number | null | undefined): string {
  const names: Record<number, string> = {
    [KYC_STATUS.PENDING]: 'Pending',
    [KYC_STATUS.IN_REVIEW]: 'In Review',
    [KYC_STATUS.VERIFIED]: 'Verified',
    [KYC_STATUS.REJECTED]: 'Rejected',
    [KYC_STATUS.EXPIRED]: 'Expired',
  };
  return names[statusId ?? 0] ?? 'Unknown';
}

/**
 * Gets the human-readable name for a payout status ID
 */
export function getPayoutStatusName(statusId: number | null | undefined): string {
  const names: Record<number, string> = {
    [PAYOUT_STATUS.PENDING_APPROVAL]: 'Pending Approval',
    [PAYOUT_STATUS.APPROVED]: 'Approved',
    [PAYOUT_STATUS.SCHEDULED]: 'Scheduled',
    [PAYOUT_STATUS.PROCESSING]: 'Processing',
    [PAYOUT_STATUS.COMPLETED]: 'Completed',
    [PAYOUT_STATUS.FAILED]: 'Failed',
    [PAYOUT_STATUS.CANCELLED]: 'Cancelled',
  };
  return names[statusId ?? 0] ?? 'Unknown';
}
