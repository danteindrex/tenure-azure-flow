/**
 * Test Helper API: Cleanup Test Data
 *
 * SECURITY: This endpoint should ONLY be available in test/development environments
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../drizzle/db';
import { user, session, account, verification } from '../../../drizzle/schema/auth';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CRITICAL: Only allow in test/development
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_TEST_ENDPOINTS) {
    return res.status(403).json({ error: 'Test endpoints not available in production' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Only allow cleanup of test emails
  if (!email.includes('test-') && !email.includes('@example.com')) {
    return res.status(400).json({ error: 'Only test emails can be cleaned up' });
  }

  try {
    // Find user
    const users = await db.select().from(user).where(eq(user.email, email));

    if (users.length === 0) {
      return res.status(200).json({ message: 'User not found (already clean)' });
    }

    const userId = users[0].id;

    // Delete in order (child records first)
    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(account).where(eq(account.userId, userId));
    await db.delete(verification).where(eq(verification.identifier, email));

    // Delete from user_profiles if exists
    try {
      await db.execute(`DELETE FROM user_profiles WHERE email = '${email}'`);
    } catch (e) {
      // Table might not exist, ignore
    }

    // Finally delete user
    await db.delete(user).where(eq(user.id, userId));

    return res.status(200).json({ message: 'Test data cleaned up successfully' });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ error: 'Cleanup failed' });
  }
}
