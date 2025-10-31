import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users, userProfiles, userContacts, userAddresses, userMemberships } from "@/drizzle/schema";
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
      // 1. Upsert user record
      const userResult = await db.insert(users)
        .values({
          authUserId: user.id,
          email,
          emailVerified: true, // Assume verified if they can call this API
        })
        .onConflictDoUpdate({
          target: users.authUserId,
          set: {
            email,
            emailVerified: true,
            updatedAt: new Date()
          }
        })
        .returning();

      const userId = userResult[0].id;

      // 2. Upsert user profile
      if (first_name || last_name || middle_name || date_of_birth || full_name) {
        await db.insert(userProfiles)
          .values({
            id: userId, // Using userId as profile ID based on schema
            userId: userId,
            firstName: first_name ?? (full_name ? full_name.split(' ')[0] : null),
            lastName: last_name ?? (full_name && full_name.includes(' ') ? full_name.split(' ').slice(1).join(' ') : null),
            middleName: middle_name ?? null,
            dateOfBirth: date_of_birth ?? null,
          })
          .onConflictDoUpdate({
            target: userProfiles.userId,
            set: {
              firstName: first_name ?? (full_name ? full_name.split(' ')[0] : null),
              lastName: last_name ?? (full_name && full_name.includes(' ') ? full_name.split(' ').slice(1).join(' ') : null),
              middleName: middle_name ?? null,
              dateOfBirth: date_of_birth ?? null,
              updatedAt: new Date()
            }
          });
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
          })
                    .onConflictDoUpdate({
            target: userAddresses.userId,
            set: {
              addressType: 'primary',
              streetAddress: street_address ?? null,
              addressLine2: address_line_2 ?? null,
              city: city ?? null,
              state: state ?? null,
              postalCode: zip_code ?? null,
              countryCode: country_code ?? 'US',
              isPrimary: true,
              updatedAt: new Date()
            }
          });
      }

      // 5. Upsert membership record
      await db.insert(userMemberships)
        .values({
          userId: userId,
          joinDate: new Date().toISOString().split('T')[0],
          tenure: '0',
          verificationStatus: 'PENDING',
        })
        .onConflictDoUpdate({
          target: userMemberships.userId,
          set: {
            updatedAt: new Date()
          }
        });

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
