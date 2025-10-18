import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const supabase = createPagesServerClient({ req, res });

    // Try to sign in to check if user exists and get their status
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      return res.status(401).json({ 
        error: "Authentication failed",
        message: authError.message 
      });
    }

    if (!authData.user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check member status in database
    const { data: memberData, error: memberError } = await supabase
      .from('member')
      .select('status, id')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (memberError) {
      return res.status(404).json({ 
        error: "Member record not found",
        userExists: true,
        needsProfile: true
      });
    }

    return res.status(200).json({
      userExists: true,
      userId: authData.user.id,
      memberId: memberData.id,
      status: memberData.status,
      isActive: memberData.status === 'Active',
      needsPayment: memberData.status === 'Pending',
    });

  } catch (err: any) {
    console.error('Check user status error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err?.message || 'Unexpected error' 
    });
  }
}