import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { userAddresses } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = session.user;

    // Fetch user addresses
    const addresses = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, user.id));

    return res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unexpected server error";
    return res.status(500).json({ error: errorMessage });
  }
}