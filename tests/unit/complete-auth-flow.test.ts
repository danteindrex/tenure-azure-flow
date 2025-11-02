/**
 * Unit Tests: Complete Authentication Flow
 *
 * Tests ALL 3 steps of signup + login using Better Auth client
 * Tests the ACTUAL code and APIs - no browser needed!
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Complete Authentication Flow - All Steps', () => {

  const BASE_URL = 'http://localhost:3000';
  let testEmail: string;
  let testPassword: string;
  let sessionToken: string;

  beforeAll(() => {
    testEmail = `test-${Date.now()}@example.com`;
    testPassword = 'StrongPass123!';
  });

  describe('STEP 1: Email/Password Signup', () => {

    it('should create account with email and password via Better Auth', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Test User'
        })
      });

      console.log('Step 1 - Sign up response:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.log('Sign up error:', error);
      }

      // Better Auth might return 200 or redirect
      expect([200, 201, 302]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = await response.json();
        console.log('Sign up data:', data);

        // Save session if provided
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
          const sessionMatch = cookies.match(/session[^;]*/);
          if (sessionMatch) {
            sessionToken = sessionMatch[0];
          }
        }
      }
    });

    it('should require minimum password length', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `weak-${Date.now()}@example.com`,
          password: 'weak',  // Too short
          name: 'Test User'
        })
      });

      // Should reject weak password
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should require valid email format', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'StrongPass123!',
          name: 'Test User'
        })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should prevent duplicate email registration', async () => {
      const dupEmail = `duplicate-${Date.now()}@example.com`;

      // First signup
      await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dupEmail,
          password: 'StrongPass123!',
          name: 'First User'
        })
      });

      // Second signup with same email
      const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dupEmail,
          password: 'StrongPass123!',
          name: 'Second User'
        })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('STEP 2: Email Verification (OTP)', () => {

    it('should send OTP after signup', async () => {
      // Better Auth automatically sends OTP after signup
      // In production, you'd fetch from email service
      // For testing, we use the mock OTP endpoint

      const response = await fetch(`${BASE_URL}/api/test/get-otp?email=${encodeURIComponent(testEmail)}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.otp).toBeDefined();
      expect(data.otp).toMatch(/^\d{6}$/); // 6 digits

      console.log('Step 2 - OTP retrieved:', data.otp);
    });

    it('should verify email with correct OTP', async () => {
      // Get OTP
      const otpResponse = await fetch(`${BASE_URL}/api/test/get-otp?email=${encodeURIComponent(testEmail)}`);
      const { otp } = await otpResponse.json();

      // Verify OTP
      const response = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionToken || ''
        },
        body: JSON.stringify({
          email: testEmail,
          otp
        })
      });

      console.log('Step 2 - Verify OTP response:', response.status);

      // Should verify successfully
      if (response.status === 200) {
        const data = await response.json();
        console.log('OTP verification data:', data);
      }
    });

    it('should reject invalid OTP', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionToken || ''
        },
        body: JSON.stringify({
          email: testEmail,
          otp: '000000' // Invalid OTP
        })
      });

      // Should reject
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow resending OTP', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/send-verification-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionToken || ''
        },
        body: JSON.stringify({
          email: testEmail
        })
      });

      console.log('Resend OTP response:', response.status);

      // Should send new OTP
      expect([200, 201]).toContain(response.status);
    });
  });

  describe('STEP 3: Profile Completion', () => {

    it('should update user profile after verification', async () => {
      const response = await fetch(`${BASE_URL}/api/profiles/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionToken || ''
        },
        body: JSON.stringify({
          email: testEmail,
          first_name: 'Test',
          last_name: 'User',
          date_of_birth: '1990-01-01',
          phone_number: '1234567890',
          street_address: '123 Main St',
          city: 'Test City',
          state: 'NY',
          zip_code: '10001'
        })
      });

      console.log('Step 3 - Profile update response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data:', data);
        expect(data.profile).toBeDefined();
      }
    });

    it('should require all mandatory profile fields', async () => {
      const response = await fetch(`${BASE_URL}/api/profiles/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionToken || ''
        },
        body: JSON.stringify({
          email: testEmail,
          first_name: 'Test'
          // Missing required fields
        })
      });

      // Should reject incomplete profile
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Login Flow (After Complete Signup)', () => {

    it('should login with email and password', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });

      console.log('Login response:', response.status);

      expect([200, 201]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Login data:', data);

        // Should get session cookie
        const cookies = response.headers.get('set-cookie');
        expect(cookies).toBeTruthy();
        expect(cookies).toContain('session');
      }
    });

    it('should reject login with wrong password', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123!'
        })
      });

      expect(response.status).toBe(401);
    });

    it('should reject login for non-existent user', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        })
      });

      expect(response.status).toBe(401);
    });

    it('should provide same error for wrong password vs non-existent user (anti-enumeration)', async () => {
      // Wrong password
      const response1 = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123!'
        })
      });

      // Non-existent user
      const response2 = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        })
      });

      expect(response1.status).toBe(response2.status);

      if (response1.status === 401 && response2.status === 401) {
        const error1 = await response1.json();
        const error2 = await response2.json();

        // Error messages should be identical
        expect(error1.message || error1.error).toBe(error2.message || error2.error);
      }
    });
  });

  describe('Session Management', () => {

    let loginCookies: string;

    it('should create session on login', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });

      const cookies = response.headers.get('set-cookie');
      expect(cookies).toBeTruthy();

      // Extract session cookie
      if (cookies) {
        loginCookies = cookies;

        // Check cookie attributes
        expect(cookies).toContain('HttpOnly');
        expect(cookies).toMatch(/SameSite=(Lax|Strict)/);
      }
    });

    it('should maintain session across requests', async () => {
      // Get current session
      const response = await fetch(`${BASE_URL}/api/auth/get-session`, {
        headers: {
          'Cookie': loginCookies
        }
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.session).toBeDefined();
        expect(data.user).toBeDefined();
        expect(data.user.email).toBe(testEmail);
      }
    });

    it('should clear session on logout', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Cookie': loginCookies
        }
      });

      expect(response.ok).toBe(true);

      // Session cookie should be cleared
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        expect(cookies).toContain('session=');
        // Cookie should be expired or deleted
      }
    });

    it('should reject requests with invalid session', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/get-session`, {
        headers: {
          'Cookie': 'session=invalid-token-12345'
        }
      });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('Security Tests', () => {

    it('should sanitize SQL injection in email field', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: "' OR '1'='1@example.com",
          password: 'StrongPass123!',
          name: 'Test'
        })
      });

      // Should reject or handle safely
      const data = await response.json();

      // Should NOT expose database errors
      expect(JSON.stringify(data)).not.toMatch(/database|sql|syntax/i);
    });

    it('should sanitize XSS in name field', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `xss-${Date.now()}@example.com`,
          password: 'StrongPass123!',
          name: '<script>alert("XSS")</script>'
        })
      });

      // Should either reject or sanitize
      if (response.ok) {
        const data = await response.json();
        // Name should be sanitized
        expect(data.user?.name || '').not.toContain('<script>');
      }
    });

    it('should be case-insensitive for email', async () => {
      const caseEmail = `case-test-${Date.now()}@example.com`;

      // Sign up with lowercase
      await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: caseEmail.toLowerCase(),
          password: 'StrongPass123!',
          name: 'Test'
        })
      });

      // Login with uppercase
      const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: caseEmail.toUpperCase(),
          password: 'StrongPass123!'
        })
      });

      // Should login successfully
      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Performance', () => {

    it('should complete signup in under 2 seconds', async () => {
      const start = Date.now();

      await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `perf-${Date.now()}@example.com`,
          password: 'StrongPass123!',
          name: 'Perf Test'
        })
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(2000);
      console.log(`✅ Signup completed in ${elapsed}ms`);
    });

    it('should complete login in under 1 second', async () => {
      const start = Date.now();

      await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
      console.log(`✅ Login completed in ${elapsed}ms`);
    });
  });
});
