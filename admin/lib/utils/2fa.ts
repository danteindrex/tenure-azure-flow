// 2FA Utility Functions

import crypto from 'crypto';

/**
 * Generate a 5-digit login code
 */
export function generate5DigitCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

/**
 * Generate a 6-digit 2FA setup code
 */
export function generate2FACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate backup codes (10 codes, 8 characters each)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a code for secure storage
 */
export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a code against a hash
 */
export function verifyCodeHash(code: string, hash: string): boolean {
  return hashCode(code) === hash;
}

/**
 * Check if code is expired
 */
export function isCodeExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Get code expiration time (default 10 minutes)
 */
export function getCodeExpiration(minutes: number = 10): Date {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + minutes);
  return expiration;
}

/**
 * Format code for display (XXX XXX)
 */
export function formatCode(code: string): string {
  return code.slice(0, 3) + ' ' + code.slice(3);
}

/**
 * Validate 6-digit code format
 */
export function isValidCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validate 5-digit code format
 */
export function isValid5DigitCodeFormat(code: string): boolean {
  return /^\d{5}$/.test(code);
}
