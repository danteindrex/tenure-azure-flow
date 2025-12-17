/**
 * KYC Service Status Constants
 *
 * These constants map to the status values in the kyc_verification table.
 * Use these constants instead of hardcoded strings for type safety and maintainability.
 */

export const KYC_STATUS = {
  PENDING: 1,
  IN_REVIEW: 2,
  VERIFIED: 3,
  REJECTED: 4,
  EXPIRED: 5
} as const;

export type KycStatus = typeof KYC_STATUS[keyof typeof KYC_STATUS];

/**
 * Helper functions for KYC status checks
 */

/**
 * Checks if a KYC status represents a verified state
 */
export function isKycVerified(status: number | null | undefined): boolean {
  return status === KYC_STATUS.VERIFIED;
}

/**
 * Checks if a KYC status represents a pending state
 */
export function isKycPending(status: number | null | undefined): boolean {
  return status === KYC_STATUS.PENDING;
}

/**
 * Checks if a KYC status represents a rejected state
 */
export function isKycRejected(status: number | null | undefined): boolean {
  return status === KYC_STATUS.REJECTED;
}

/**
 * Gets the human-readable name for a KYC status
 */
export function getKycStatusName(status: number | null | undefined): string {
  const names: Record<number, string> = {
    [KYC_STATUS.PENDING]: 'Pending',
    [KYC_STATUS.IN_REVIEW]: 'In Review',
    [KYC_STATUS.VERIFIED]: 'Verified',
    [KYC_STATUS.REJECTED]: 'Rejected',
    [KYC_STATUS.EXPIRED]: 'Expired'
  };
  return names[status || 0] || 'Unknown';
}