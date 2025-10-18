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

    if (userError) {
      return res.status(401).json({ error: userError.message });
    }
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { email, full_name, phone, street_address, city, state, zip_code } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Missing required field: email" });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return res.status(500).json({ error: "Supabase server configuration missing" });
    }

    const admin = createClient(url, serviceKey);

    const { error } = await admin
      .from("member")
      .upsert(
        {
          auth_user_id: user.id,
          email,
          name: full_name ?? null,
          phone: phone ?? null,
          street_address: street_address ?? null,
          city: city ?? null,
          state: state ?? null,
          zip_code: zip_code ?? null,
        },
        { onConflict: "auth_user_id" }
      );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Unexpected server error" });
  }
}