import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { user, userProfiles, userContacts, userAddresses, userMemberships } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

    const user = session.user;

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

    // Start transaction-like operations
    try {
      // Use Better Auth user ID directly (no need to sync to custom table)
      const userId = user.id;

      // 2. Upsert user profile
      if (first_name || last_name || middle_name || date_of_birth || full_name) {
        // Check if profile exists first
        const existingProfile = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .limit(1)
          .then(rows => rows[0]);

        if (existingProfile) {
          // Update existing profile
          await db
            .update(userProfiles)
            .set({
              firstName: first_name ?? (full_name ? full_name.split(' ')[0] : null),
              lastName: last_name ?? (full_name && full_name.includes(' ') ? full_name.split(' ').slice(1).join(' ') : null),
              middleName: middle_name ?? null,
              dateOfBirth: date_of_birth ?? null,
              updatedAt: new Date()
            })
            .where(eq(userProfiles.userId, userId));
        } else {
          // Create new profile - generate unique ID
          await db.insert(userProfiles)
            .values({
              id: `profile_${userId}`, // Generate unique profile ID
              userId: userId,
              firstName: first_name ?? (full_name ? full_name.split(' ')[0] : null),
              lastName: last_name ?? (full_name && full_name.includes(' ') ? full_name.split(' ').slice(1).join(' ') : null),
              middleName: middle_name ?? null,
              dateOfBirth: date_of_birth ?? null,
            });
        }
      }

      // 3. Upsert phone contact
      if (phone) {
        await db.insert(userContacts)
          .values({
            userId: userId,
            contactType: 'phone',
            contactValue: phone,
            isPrimary: true,
            isVerified: false,
          })
          .onConflictDoUpdate({
            target: [userContacts.userId, userContacts.contactType, userContacts.contactValue],
            set: {
              isPrimary: true,
              updatedAt: new Date()
            }
          });
      }

      // 4. Upsert address
      if (street_address || city || state || zip_code) {
        // Check if address exists first
        const existingAddress = await db
          .select()
          .from(userAddresses)
          .where(eq(userAddresses.userId, userId))
          .limit(1)
          .then(rows => rows[0]);

        if (existingAddress) {
          // Update existing address
          await db
            .update(userAddresses)
            .set({
              addressType: 'primary',
              streetAddress: street_address ?? null,
              addressLine2: address_line_2 ?? null,
              city: city ?? null,
              state: state ?? null,
              postalCode: zip_code ?? null,
              countryCode: country_code ?? 'US',
              isPrimary: true,
              updatedAt: new Date()
            })
            .where(eq(userAddresses.userId, userId));
        } else {
          // Create new address
          await db.insert(userAddresses)
            .values({
              userId: userId,
              addressType: 'primary',
              streetAddress: street_address ?? null,
              addressLine2: address_line_2 ?? null,
              city: city ?? null,
              state: state ?? null,
              postalCode: zip_code ?? null,
              countryCode: country_code ?? 'US',
              isPrimary: true,
            });
        }
      }

      // 5. Upsert membership record
      const existingMembership = await db
        .select()
        .from(userMemberships)
        .where(eq(userMemberships.userId, userId))
        .limit(1)
        .then(rows => rows[0]);

      if (existingMembership) {
        // Update existing membership
        await db
          .update(userMemberships)
          .set({
            updatedAt: new Date()
          })
          .where(eq(userMemberships.userId, userId));
      } else {
        // Create new membership
        await db.insert(userMemberships)
          .values({
            userId: userId,
            joinDate: new Date().toISOString().split('T')[0],
            tenure: '0',
            verificationStatus: 'PENDING',
          });
      }

    } catch (error: any) {
      console.error('Profile upsert error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}
