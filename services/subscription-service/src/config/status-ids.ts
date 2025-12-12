
export const USER_STATUS = {
  PENDING: 1,      
  ONBOARDED: 2,    
} as const;

export const MEMBER_STATUS = {
  INACTIVE: 1,     
  ACTIVE: 2,       
  SUSPENDED: 3,    
  CANCELLED: 4,    
  WON: 5,          
  PAID: 6,         
} as const;


export const SUBSCRIPTION_STATUS = {
  ACTIVE: 1,      
  TRIALING: 2,     
  PAST_DUE: 3,     
  CANCELED: 4,    
  INCOMPLETE: 5,   
  UNPAID: 6,      
} as const;

// Payment Status (payment_statuses table)
export const PAYMENT_STATUS = {
  PENDING: 1,      
  SUCCEEDED: 2,    
  FAILED: 3,       
  REFUNDED: 4,     
  CANCELED: 5,    
} as const;

// Verification Status (verification_statuses table)
export const VERIFICATION_STATUS = {
  PENDING: 1,      
  VERIFIED: 2,    
  FAILED: 3,       
  SKIPPED: 4,      
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
