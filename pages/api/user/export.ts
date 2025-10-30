import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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

    // Collect all user data
    const exportData = {
      account: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
        createdAt: session.user.createdAt,
        exportedAt: new Date().toISOString(),
      },
      profile: null,
      contacts: [],
      addresses: [],
      preferences: null,
      membership: null,
    };

    // Get profile data
    const { data: profile } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (profile) {
      exportData.profile = profile;
    }

    // Get contacts
    const { data: contacts } = await admin
      .from("user_contacts")
      .select("*")
      .eq("user_id", userId);
    
    if (contacts) {
      exportData.contacts = contacts;
    }

    // Get addresses
    const { data: addresses } = await admin
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId);
    
    if (addresses) {
      exportData.addresses = addresses;
    }

    // Get preferences
    const { data: preferences } = await admin
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (preferences) {
      exportData.preferences = preferences;
    }

    // Get membership data
    const { data: membership } = await admin
      .from("user_memberships")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (membership) {
      exportData.membership = membership;
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="account-data-${new Date().toISOString().split('T')[0]}.json"`);
    
    return res.status(200).json(exportData);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}