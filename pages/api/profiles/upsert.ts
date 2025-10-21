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

    const { 
      email, 
      first_name, 
      last_name, 
      middle_name, 
      date_of_birth,
      phone, 
      street_address, 
      address_line_2,
      city, 
      state, 
      zip_code,
      country_code,
      // Legacy support
      full_name 
    } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Missing required field: email" });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return res.status(500).json({ error: "Supabase server configuration missing" });
    }

    const admin = createClient(url, serviceKey);

    // Start transaction-like operations
    try {
      // 1. Upsert user record
      const { data: userData, error: userError } = await admin
        .from("users")
        .upsert(
          {
            auth_user_id: user.id,
            email,
            email_verified: true, // Assume verified if they can call this API
          },
          { onConflict: "auth_user_id" }
        )
        .select()
        .single();

      if (userError) {
        throw new Error(`User upsert failed: ${userError.message}`);
      }

      const userId = userData.id;

      // 2. Upsert user profile
      if (first_name || last_name || middle_name || date_of_birth || full_name) {
        const { error: profileError } = await admin
          .from("user_profiles")
          .upsert(
            {
              user_id: userId,
              first_name: first_name ?? (full_name ? full_name.split(' ')[0] : null),
              last_name: last_name ?? (full_name && full_name.includes(' ') ? full_name.split(' ').slice(1).join(' ') : null),
              middle_name: middle_name ?? null,
              date_of_birth: date_of_birth ?? null,
            },
            { onConflict: "user_id" }
          );

        if (profileError) {
          throw new Error(`Profile upsert failed: ${profileError.message}`);
        }
      }

      // 3. Upsert phone contact
      if (phone) {
        const { error: contactError } = await admin
          .from("user_contacts")
          .upsert(
            {
              user_id: userId,
              contact_type: 'phone',
              contact_value: phone,
              is_primary: true,
              is_verified: false,
            },
            { onConflict: "user_id,contact_type,contact_value" }
          );

        if (contactError) {
          throw new Error(`Contact upsert failed: ${contactError.message}`);
        }
      }

      // 4. Upsert address
      if (street_address || city || state || zip_code) {
        const { error: addressError } = await admin
          .from("user_addresses")
          .upsert(
            {
              user_id: userId,
              address_type: 'primary',
              street_address: street_address ?? null,
              address_line_2: address_line_2 ?? null,
              city: city ?? null,
              state: state ?? null,
              postal_code: zip_code ?? null,
              country_code: country_code ?? 'US',
              is_primary: true,
            },
            { onConflict: "user_id,address_type" }
          );

        if (addressError) {
          throw new Error(`Address upsert failed: ${addressError.message}`);
        }
      }

      // 5. Upsert membership record
      const { error: membershipError } = await admin
        .from("user_memberships")
        .upsert(
          {
            user_id: userId,
            join_date: new Date().toISOString().split('T')[0],
            tenure: 0,
            verification_status: 'PENDING',
          },
          { onConflict: "user_id" }
        );

      if (membershipError) {
        throw new Error(`Membership upsert failed: ${membershipError.message}`);
      }

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}