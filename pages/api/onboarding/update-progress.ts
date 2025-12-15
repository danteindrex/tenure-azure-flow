import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { userContacts } from "@/drizzle/schema/users";
import { user } from "@/drizzle/schema/auth";
import { eq, and } from "drizzle-orm";
import { USER_STATUS } from "@/lib/status-ids";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { step, data, userId } = req.body;
    let currentUserId = userId;

    // If userId is not provided, get it from session
    if (!currentUserId) {
      const session = await auth.api.getSession({ 
        headers: new Headers(req.headers as any)
      });
      
      if (!session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      currentUserId = session.user.id;
    }

    switch (step) {
      case 'email-verified':
        // Email verification is handled by Better Auth automatically
        // No additional database updates needed
        break;

      case 'profile-completed':
        // Profile completion is handled by the profiles/upsert API
        // No additional database updates needed here
        break;

      case 'phone-verified': {
        // Update or create phone contact record as verified
        const { phone } = data;
        if (phone) {
          // First, check if phone contact exists for this user
          const existingContact = await db
            .select()
            .from(userContacts)
            .where(
              and(
                eq(userContacts.userId, currentUserId),
                eq(userContacts.contactType, 'phone')
              )
            )
            .limit(1)
            .then(rows => rows[0]);

          if (existingContact) {
            // Update existing contact to verified
            await db
              .update(userContacts)
              .set({
                contactValue: phone,
                isVerified: true,
                updatedAt: new Date()
              } as any)
              .where(eq(userContacts.id, existingContact.id));
          } else {
            // Check if this phone number already exists for a different user
            const phoneConflict = await db
              .select()
              .from(userContacts)
              .where(
                and(
                  eq(userContacts.contactType, 'phone'),
                  eq(userContacts.contactValue, phone)
                )
              )
              .limit(1)
              .then(rows => rows[0]);

            if (phoneConflict) {
              return res.status(409).json({
                error: 'Phone number already registered',
                message: 'This phone number is already associated with another account'
              });
            }

            // Create new verified phone contact
            await db
              .insert(userContacts)
              .values({
                userId: currentUserId,
                contactType: 'phone',
                contactValue: phone,
                isPrimary: true,
                isVerified: true
              } as any);
          }
        }
        break;
      }

      case 'payment-completed':
        // Update user status to Onboarded when payment is completed
        // Note: The user_status_id FK column references user_funnel_statuses lookup table
        await db
          .update(user)
          .set({
            userStatusId: USER_STATUS.ONBOARDED,
            updatedAt: new Date()
          } as any)
          .where(eq(user.id, currentUserId));
        break;

      default:
        return res.status(400).json({ error: "Invalid step" });
    }

    return res.status(200).json({
      success: true,
      message: `Progress updated for step: ${step}`
    });

  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}