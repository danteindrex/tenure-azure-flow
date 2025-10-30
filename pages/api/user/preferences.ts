import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { pgTable, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";

// Define user_preferences table inline since it might not be in the schema yet
const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

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
      where: eq(users.authUserId, session.user.id),
      columns: { id: true }
    });

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userData.id;

    if (req.method === "GET") {
      // Fetch user preferences
      const preferencesData = await db.select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      // Return default preferences if none exist
      const defaultPreferences = {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: false,
        securityAlerts: true,
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
      };

      return res.status(200).json(
        preferencesData[0]?.preferences || defaultPreferences
      );
    }

    if (req.method === "POST") {
      const preferences = req.body;

      // Upsert preferences
      await db.insert(userPreferences)
        .values({
          userId: userId,
          preferences: preferences,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            preferences: preferences,
            updatedAt: new Date()
          }
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
