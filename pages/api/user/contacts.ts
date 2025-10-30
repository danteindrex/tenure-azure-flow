import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get current user session using Better Auth
    const session = await auth.api.getSession({ 
      headers: new Headers(req.headers as any)
    });
    
    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return res.status(500).json({ error: "Supabase server configuration missing" });
    }

    const admin = createClient(url, serviceKey);

    // Get user ID from our users table
    const { data: userData, error: userError } = await admin
      .from("users")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userData.id;

    if (req.method === "GET") {
      // Fetch user contacts
      const { data: contacts, error: contactsError } = await admin
        .from("user_contacts")
        .select("*")
        .eq("user_id", userId);

      if (contactsError) {
        return res.status(500).json({ error: contactsError.message });
      }

      return res.status(200).json(contacts || []);
    }

    if (req.method === "POST") {
      const { contact_type, contact_value, is_primary } = req.body;

      if (!contact_type || !contact_value) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Upsert contact
      const { error: upsertError } = await admin
        .from("user_contacts")
        .upsert(
          {
            user_id: userId,
            contact_type,
            contact_value,
            is_primary: is_primary || false,
            is_verified: false, // New contacts need verification
          },
          { onConflict: "user_id,contact_type,contact_value" }
        );

      if (upsertError) {
        return res.status(500).json({ error: upsertError.message });
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}