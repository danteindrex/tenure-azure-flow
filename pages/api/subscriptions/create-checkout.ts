import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema/users";
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

    // Get user from database
    const userQuery = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    let userData = userQuery[0];

    // If user record doesn't exist, create it
    if (!userData) {
      console.log('User record not found, creating new record for:', session.user.email);

      const newUserData = await db
        .insert(users)
        .values({
          id: session.user.id,
          authUserId: session.user.id,
          email: session.user.email || '',
          emailVerified: true,
          status: 'Pending'
        })
        .returning();

      if (!newUserData || newUserData.length === 0) {
        console.error('Failed to create user record');
        return res.status(500).json({ error: 'Failed to create user record' });
      }

      userData = newUserData[0];
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
        successUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signup?canceled=true`,
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