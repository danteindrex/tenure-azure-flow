/**
 * Test Utilities and Helper Functions
 */

import { Page } from '@playwright/test';

// Generate unique test email
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

// Generate strong password
export function generateStrongPassword(): string {
  return `Test${Math.random().toString(36).slice(-8)}!123`;
}

// Generate weak password
export function generateWeakPassword(): string {
  return '123456';
}

// Wait for navigation with better error handling
export async function waitForNavigation(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  try {
    await page.waitForURL(urlPattern, { timeout });
  } catch (error) {
    console.error(`Navigation to ${urlPattern} failed. Current URL: ${page.url()}`);
    throw error;
  }
}

// Check if element exists without throwing
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch {
    return false;
  }
}

// Get error message from page
export async function getErrorMessage(page: Page): Promise<string | null> {
  const selectors = [
    '[role="alert"]',
    '.error-message',
    '[data-sonner-toast][data-type="error"]',
    'text=/error|failed|invalid/i'
  ];

  for (const selector of selectors) {
    const element = await page.$(selector);
    if (element) {
      const text = await element.textContent();
      if (text) return text.trim();
    }
  }

  return null;
}

// Clear database (only use in test environment)
export async function clearTestData(email: string) {
  if (!process.env.DATABASE_URL?.includes('test') && !process.env.CI) {
    console.warn('Skipping database cleanup - not in test environment');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      console.warn('Failed to cleanup test data:', await response.text());
    }
  } catch (error) {
    console.warn('Cleanup endpoint not available:', error);
  }
}

// Extract OTP from email (mock function - replace with actual email fetching)
export async function getOTPFromEmail(email: string): Promise<string> {
  // In a real scenario, you would:
  // 1. Use a test email service like Mailinator, Mailtrap, or Ethereal
  // 2. Fetch the latest email
  // 3. Extract the OTP code using regex

  // For development/testing, we'll use a mock OTP
  // In production tests, integrate with your email service

  // Check if we can access the test endpoint
  try {
    const response = await fetch(`http://localhost:3000/api/test/get-otp?email=${encodeURIComponent(email)}`);
    if (response.ok) {
      const data = await response.json();
      return data.otp;
    }
  } catch (error) {
    console.warn('OTP endpoint not available, using mock OTP');
  }

  // Fallback: return mock OTP for development
  return '123456';
}

// Common test user credentials
export const TEST_USERS = {
  existingUser: {
    email: 'existing@test.com',
    password: 'ExistingPassword123!',
  },
  oauthUser: {
    email: 'oauth@test.com',
    // OAuth users don't have passwords
  },
  adminUser: {
    email: 'admin@test.com',
    password: 'AdminPassword123!',
  }
};

// Common SQL injection attempts
export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users--",
  "admin'--",
  "' OR 1=1--",
  "' UNION SELECT NULL--",
];

// Common XSS payloads
export const XSS_PAYLOADS = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "javascript:alert('XSS')",
  "<svg/onload=alert('XSS')>",
];

// Common password patterns to test
export const PASSWORD_PATTERNS = {
  tooShort: 'Short1!',
  noUppercase: 'lowercase123!',
  noLowercase: 'UPPERCASE123!',
  noNumber: 'NoNumbers!',
  noSpecial: 'NoSpecial123',
  sequential: '12345678',
  repeated: 'aaaaaaaa',
  common: 'Password123!',
  strong: 'Tr0ng!P@ssw0rd#2024',
};

// Email patterns to test
export const EMAIL_PATTERNS = {
  valid: [
    'user@example.com',
    'user+tag@example.com',
    'user.name@example.com',
    'user_name@example.co.uk',
  ],
  invalid: [
    'not-an-email',
    '@example.com',
    'user@',
    'user @example.com',
    'user@example',
    'user..name@example.com',
  ],
};
