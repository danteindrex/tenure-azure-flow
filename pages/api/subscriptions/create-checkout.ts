import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { user } from "@/drizzle/schema/auth";
import { eq } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get user from Better Auth user table
    const userQuery = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const userData = userQuery[0];

    // Better Auth should have already created the user record
    // If somehow it doesn't exist, this is an error state
    if (!userData) {
      console.error('User not found in Better Auth table:', session.user.id);
      return res.status(500).json({
        error: 'User record not found. Please contact support.'
      });
    }

    // Call subscription service to create Stripe checkout session
    const subscriptionServiceUrl = process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001';

    const checkoutResponse = await fetch(`${subscriptionServiceUrl}/api/subscriptions/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`, // Add authentication
      },
      body: JSON.stringify({
        userId: userData.id, // Using normalized user ID
        successUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signup?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signup?step=5&canceled=true`,
      }),
    });

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      return res.status(500).json({
        error: 'Failed to create checkout session',
        details: errorData.message
      });
    }

    const checkoutData = await checkoutResponse.json();

    return res.status(200).json({
      success: true,
      checkoutUrl: checkoutData.data?.url,
      sessionId: checkoutData.data?.id,
    });

  } catch (err: unknown) {
    console.error('Checkout creation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    return res.status(500).json({
      error: 'Internal server error',
      message: errorMessage
    });
  }
}