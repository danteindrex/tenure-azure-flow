import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { passkey } from "@/drizzle/migrations/schema";
import { eq } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get current user session using Better Auth
    const session = await auth.api.getSession({ 
      headers: new Headers(req.headers as any)
    });
    
    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.method === "GET") {
      // List passkeys for user
      const passkeys = await db
        .select()
        .from(passkey)
        .where(eq(passkey.userId, session.user.id));

      return res.status(200).json(passkeys || []);
    }

    if (req.method === "POST") {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Passkey name is required" });
      }

      // Create passkey registration options
      const passkeyData = {
        userId: session.user.id,
        name: name,
        credentialId: crypto.randomUUID(),
        publicKey: "placeholder_key",
        counter: 0,
        deviceType: "platform",
        backedUp: false,
        transports: ["internal"],
      };

      const [newPasskey] = await db
        .insert(passkey)
        .values(passkeyData)
        .returning();

      return res.status(200).json(newPasskey);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}