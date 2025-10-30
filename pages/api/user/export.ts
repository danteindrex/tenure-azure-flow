import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users, userProfiles, userContacts, userAddresses, userMemberships } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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

    // Get user ID from our users table
    const userData = await db.query.users.findFirst({
      where: eq(users.authUserId, session.user.id),
      columns: { id: true }
    });

    if (!userData) {
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
      profile: null as any,
      contacts: [] as any[],
      addresses: [] as any[],
      preferences: null as any,
      membership: null as any,
    };

    // Get profile data
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });

    if (profile) {
      exportData.profile = profile;
    }

    // Get contacts
    const contacts = await db.query.userContacts.findMany({
      where: eq(userContacts.userId, userId)
    });

    if (contacts && contacts.length > 0) {
      exportData.contacts = contacts;
    }

    // Get addresses
    const addresses = await db.query.userAddresses.findMany({
      where: eq(userAddresses.userId, userId)
    });

    if (addresses && addresses.length > 0) {
      exportData.addresses = addresses;
    }

    // Get preferences - Note: user_preferences table might not exist yet
    // Check if the table exists in your schema before querying
    try {
      const preferences = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, userId)
      });
      if (preferences) {
        exportData.preferences = preferences;
      }
    } catch (err) {
      // Table might not exist yet, skip silently
      console.log('user_preferences table not found, skipping');
    }

    // Get membership data
    const membership = await db.query.userMemberships.findFirst({
      where: eq(userMemberships.userId, userId)
    });

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