import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const supabase = createPagesServerClient({ req, res });

    // Check if user exists in normalized database by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, status, auth_user_id, email_verified')
      .eq('email', email.trim())
      .single();

    if (userError || !userData) {
      return res.status(404).json({ 
        error: "User not found",
        userExists: false 
      });
    }

    return res.status(200).json({
      userExists: true,
      userId: userData.id,
      authUserId: userData.auth_user_id,
      status: userData.status,
      emailVerified: userData.email_verified,
      isActive: userData.status === 'Active',
      needsPayment: userData.status === 'Pending',
      needsEmailVerification: !userData.email_verified,
    });

  } catch (err: any) {
    console.error('Check user status error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err?.message || 'Unexpected error' 
    });
  }
}