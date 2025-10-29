import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users, userContacts } from "@/drizzle/schema/users";
import { eq, and } from "drizzle-orm";

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

      case 'phone-verified':
        // Update or create phone contact record as verified
        const { phone } = data;
        if (phone) {
          // First, check if phone contact exists
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
              })
              .where(eq(userContacts.id, existingContact.id));
          } else {
            // Create new verified phone contact
            await db
              .insert(userContacts)
              .values({
                userId: currentUserId,
                contactType: 'phone',
                contactValue: phone,
                isPrimary: true,
                isVerified: true
              });
          }
        }
        break;

      case 'payment-completed':
        // Update user status to Active when payment is completed
        await db
          .update(users)
          .set({
            status: 'Active',
            updatedAt: new Date()
          })
          .where(eq(users.id, currentUserId));
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