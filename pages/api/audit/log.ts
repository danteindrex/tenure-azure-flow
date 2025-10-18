import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const supabaseAuth = createPagesServerClient({ req, res });
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    const {
      action,
      resource_type,
      resource_id,
      details,
      user_type = user ? 'authenticated' : 'guest'
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    // Get client IP address
    const ip = req.headers['x-forwarded-for'] as string || 
               req.headers['x-real-ip'] as string || 
               req.connection.remoteAddress || 
               '127.0.0.1';

    // Get user agent
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !serviceKey) {
      return res.status(500).json({ error: "Supabase server configuration missing" });
    }

    const admin = createClient(url, serviceKey);

    // Insert audit log
    const { error } = await admin
      .from("user_audit_logs")
      .insert({
        user_id: user?.id || null,
        user_type,
        action,
        resource_type: resource_type || null,
        resource_id: resource_id || null,
        details: details || null,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (error) {
      console.error("Audit log error:", error);
      return res.status(500).json({ error: "Failed to log audit entry" });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Audit logging error:", err);
    return res.status(500).json({ error: err?.message || "Unexpected server error" });
  }
}
