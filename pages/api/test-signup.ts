import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !serviceKey) {
    return res.status(500).json({ error: "Supabase environment variables missing" });
  }

  const body = req.body || {};
  const email: string = (body.email || "").trim() || `tenure.test+${Date.now()}@example.com`;
  const password: string = body.password || "Test1234!";
  const meta = body.meta || {
    full_name: "Test User",
    phone: "+10000000000",
    street_address: "123 Test St",
    city: "Testville",
    state: "CA",
    zip_code: "90001",
  };

  const client = createClient(url, anon);
  const admin = createClient(url, serviceKey);

  try {
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: typeof req !== "undefined" ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3337"}/login` : undefined,
      },
    });

    if (signUpError) {
      return res.status(500).json({ email, signUpError: signUpError.message });
    }

    // Check if user row exists after signup (trigger or server upsert)
    const { data: users, error: userErr } = await admin
      .from("users_complete")
      .select("auth_user_id, email, full_name, phone, city, state, postal_code, street_address, user_created_at")
      .eq("email", email)
      .limit(1);

    if (userErr) {
      return res.status(500).json({ email, error: userErr.message });
    }

    const found = Array.isArray(users) && users.length > 0 ? users[0] : null;
    return res.status(200).json({
      email,
      signup_session: !!signUpData.session,
      user_id: signUpData.user?.id || null,
      member_found: !!found,
      member: found,
    });
  } catch (e: any) {
    return res.status(500).json({ email, error: e?.message || "Unexpected error" });
  }
}