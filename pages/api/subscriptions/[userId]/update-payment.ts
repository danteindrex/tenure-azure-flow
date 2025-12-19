import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { userId } = req.query;

    // Get current user session
    const session = await auth.api.getSession({
      headers: new Headers({
        'cookie': req.headers.cookie || ''
      })
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Security: Users can only update their own payment method
    if (session.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update another user\'s payment method' });
    }

    const { returnUrl } = req.body;

    // Forward to subscription service
    const subscriptionServiceUrl = process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001';

    console.log(`Forwarding update-payment request to: ${subscriptionServiceUrl}/api/subscriptions/${userId}/update-payment`);

    const serviceResponse = await fetch(`${subscriptionServiceUrl}/api/subscriptions/${userId}/update-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
        'Authorization': `Bearer ${session.user.id}`,
      },
      body: JSON.stringify({
        returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://home-solutions-eta.vercel.app'}/dashboard/settings`
      }),
    }).catch(err => {
      console.error('Failed to connect to subscription service:', err);
      throw new Error(`Subscription service unreachable: ${err.message}`);
    });

    if (!serviceResponse.ok) {
      const errorData = await serviceResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Subscription service error:', serviceResponse.status, errorData);
      return res.status(500).json({
        error: 'Failed to create billing portal session',
        details: errorData.message || `HTTP ${serviceResponse.status}`
      });
    }

    const responseData = await serviceResponse.json();

    return res.status(200).json(responseData);

  } catch (err: unknown) {
    console.error('Update payment error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    return res.status(500).json({
      error: 'Internal server error',
      message: errorMessage
    });
  }
}
