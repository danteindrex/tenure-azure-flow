import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users as user, userContacts } from "@/drizzle/migrations/schema";
import { eq, and } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get current user session using Better Auth
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get user ID from our users table
    const userData = await db.query.users.findFirst({
      where: eq(user.id, session.user.id),
      columns: { id: true }
    });

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userData.id;

    if (req.method === "GET") {
      // Fetch user contacts
      const contacts = await db.query.userContacts.findMany({
        where: eq(userContacts.userId, userId)
      });

      return res.status(200).json(contacts || []);
    }

    if (req.method === "POST") {
      const { contact_type, contact_value, is_primary } = req.body;

      if (!contact_type || !contact_value) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Upsert contact
      await db.insert(userContacts)
        .values({
          userId: userId,
          contactType: contact_type,
          contactValue: contact_value,
          isPrimary: is_primary || false,
          isVerified: false, // New contacts need verification
        } as any)
        .onConflictDoUpdate({
          target: [userContacts.userId, userContacts.contactType, userContacts.contactValue],
          set: {
            isPrimary: is_primary || false,
            updatedAt: new Date()
          } as any
        });

      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}
