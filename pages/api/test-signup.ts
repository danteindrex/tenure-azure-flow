import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users as user } from "@/drizzle/migrations/schema";
import { eq } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  const email: string = (body.email || "").trim() || `tenure.test+${Date.now()}@example.com`;
  const password: string = body.password || "Test1234!";
  const meta = body.meta || {
    full_name: "Test User",
    phone: "+10000000000",
    street_address: "123 Test St",
    city: "Testville",
    state: "CA",
    zip_code: "90001",
  };

  try {
    // Sign up using Better Auth
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: meta.full_name,
        callbackURL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3337"}/login`,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      return res.status(500).json({
        email,
        signUpError: "Failed to create user account"
      });
    }

    // Check if user row exists after signup
    const userRecord = await db.query.users.findFirst({
      where: eq(user.email, email),
      columns: {
        id: true,
        email: true,
        createdAt: true,
      }
    });

    // For complete user data, you might want to join with profile table
    // But for this test, we'll just return basic info
    const found = userRecord || null;

    return res.status(200).json({
      email,
      signup_token: !!signUpResult.token,
      user_id: signUpResult.user?.id || null,
      member_found: !!found,
      member: found,
    });
  } catch (e: any) {
    console.error('Test signup error:', e);
    return res.status(500).json({
      email,
      error: e?.message || "Unexpected error"
    });
  }
}
