import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const supabaseAuth = createPagesServerClient({ req, res });
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError) {
      return res.status(401).json({ error: userError.message });
    }
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get user ID from normalized database
    const { data: userData, error: userDataError } = await supabaseAuth
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userDataError || !userData) {
      return res.status(404).json({ error: 'User record not found' });
    }

    // Call subscription service to create Stripe checkout session
    const subscriptionServiceUrl = process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001';
    
    const checkoutResponse = await fetch(`${subscriptionServiceUrl}/api/subscriptions/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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