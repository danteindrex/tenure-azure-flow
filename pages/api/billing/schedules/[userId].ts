import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as any)
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.query;

    // Security: Users can only access their own billing schedules
    if (session.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access another user\'s billing schedules' });
    }

    // Forward request to Subscription Service microservice
    const subscriptionServiceUrl = process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001';
    const microserviceUrl = `${subscriptionServiceUrl}/api/billing/schedules/${userId}`;

    // Forward cookies from the original request to the microservice
    const cookieHeader = req.headers.cookie || '';

    const response = await fetch(microserviceUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Subscription service error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch billing schedules from subscription service',
        details: errorText
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Billing schedules API error:', error);
    return res.status(500).json({
      error: 'Failed to connect to subscription service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
