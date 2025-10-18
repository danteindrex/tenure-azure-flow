import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Supabase server configuration missing' });
    }

    const adminSupabase = createClient(url, serviceKey);

    // First, verify the current password by attempting to sign in
    const { data: signInData, error: signInError } = await adminSupabase.auth.signInWithPassword({
      email: '', // We'll get this from the user record
      password: currentPassword
    });

    if (signInError) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Get user email for verification
    const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify current password with actual user email
    const { error: verifyError } = await adminSupabase.auth.signInWithPassword({
      email: userData.user.email!,
      password: currentPassword
    });

    if (verifyError) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update the password
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Update security settings to track password change
    const { error: securityUpdateError } = await adminSupabase
      .from('user_security_settings')
      .upsert({
        user_id: userId,
        password_last_changed: new Date().toISOString(),
        password_strength_score: calculatePasswordStrength(newPassword),
        require_password_change: false,
        updated_at: new Date().toISOString()
      });

    if (securityUpdateError) {
      console.error('Security settings update error:', securityUpdateError);
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
