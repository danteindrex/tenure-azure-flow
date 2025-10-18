import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const email = (req.query.email || "").toString().trim();
  if (!email) return res.status(400).json({ error: "Missing 'email' query parameter" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: "Supabase server configuration missing" });

  const admin = createClient(url, serviceKey);
  try {
    const { data, error } = await admin
      .from("member")
      .select("auth_user_id, email, name, phone, city, state, zip_code, street_address, created_at")
      .eq("email", email)
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return res.status(200).json({ email, found: !!found, member: found });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unexpected error" });
  }
}