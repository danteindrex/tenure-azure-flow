/**
 * Test Helper API: Get OTP Code
 *
 * In real testing, you would fetch this from a test email service
 * For now, this returns the most recent OTP sent via console logs
 *
 * SECURITY: This endpoint should ONLY be available in test/development environments
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory store for test OTPs (only for development)
const otpStore: Map<string, { otp: string; timestamp: number }> = new Map();

// This function would be called by email service in development mode
export function storeTestOTP(email: string, otp: string) {
  if (process.env.NODE_ENV !== 'production') {
    otpStore.set(email.toLowerCase(), {
      otp,
      timestamp: Date.now()
    });

    // Clean up old OTPs (older than 15 minutes)
    const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
    for (const [key, value] of otpStore.entries()) {
      if (value.timestamp < fifteenMinutesAgo) {
        otpStore.delete(key);
      }
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CRITICAL: Only allow in test/development
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_TEST_ENDPOINTS) {
    return res.status(403).json({ error: 'Test endpoints not available in production' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email required' });
  }

  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    // Return default OTP for testing
    // In real scenario, this would return actual OTP from email
    return res.status(200).json({
      otp: '123456', // Default test OTP
      note: 'Using default test OTP. In production, integrate with test email service.'
    });
  }

  // Check if OTP is still valid (within 10 minutes)
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  if (stored.timestamp < tenMinutesAgo) {
    otpStore.delete(email.toLowerCase());
    return res.status(404).json({ error: 'OTP expired' });
  }

  return res.status(200).json({
    otp: stored.otp,
    timestamp: stored.timestamp
  });
}
