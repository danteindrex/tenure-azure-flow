import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { userSecuritySettings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { currentPassword, newPassword, userId } = req.body;

    if (!currentPassword || !newPassword || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Get current user session using Better Auth
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Verify the userId matches the session user
    if (session.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to change this password' });
    }

    // Get user email for verification
    const userEmail = session.user.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Verify current password using Better Auth
    // Better Auth doesn't have a direct password verification API in the same way
    // So we'll use the signIn API to verify the current password
    try {
      const verifyResult = await fetch(`${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          password: currentPassword,
        }),
      });

      if (!verifyResult.ok) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    } catch (err) {
      console.error('Password verification error:', err);
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update the password using Better Auth's change-password endpoint
    try {
      const updateResult = await fetch(`${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || '',
        },
        body: JSON.stringify({
          newPassword: newPassword,
          currentPassword: currentPassword,
        }),
      });

      if (!updateResult.ok) {
        const errorData = await updateResult.json().catch(() => ({}));
        console.error('Password update failed:', errorData);
        return res.status(updateResult.status).json({
          error: errorData.error || 'Failed to update password'
        });
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Update security settings to track password change
    try {
      await db.insert(userSecuritySettings)
        .values({
          userId: userId,
          passwordLastChanged: new Date(),
          passwordStrengthScore: calculatePasswordStrength(newPassword),
          requirePasswordChange: false,
          updatedAt: new Date()
        } as any)
        .onConflictDoUpdate({
          target: userSecuritySettings.userId,
          set: {
            passwordLastChanged: new Date(),
            passwordStrengthScore: calculatePasswordStrength(newPassword),
            requirePasswordChange: false,
            updatedAt: new Date()
          } as any
        });
    } catch (err) {
      console.error('Security settings update error:', err);
      // Don't fail the request, just log the error
    }

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}

// Simple password strength calculator
function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Length check
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  // Common patterns (penalties)
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/123|abc|qwe|asd|zxc/i.test(password)) score -= 10; // Common sequences

  return Math.max(0, Math.min(100, score));
}
