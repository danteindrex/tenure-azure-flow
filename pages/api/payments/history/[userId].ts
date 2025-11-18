import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    // Get current user session with better error handling
    let session;
    try {
      // Pass headers directly to avoid Next.js module resolution issues
      session = await auth.api.getSession({
        headers: new Headers(req.headers as any)
      });
    } catch (sessionError) {
      console.error('Session validation error:', sessionError);
      // If session validation fails, return 401 but log the error
      console.error('Full session error:', sessionError instanceof Error ? sessionError.stack : sessionError);
      return res.status(401).json({
        error: 'Failed to validate session',
        details: sessionError instanceof Error ? sessionError.message : 'Unknown error'
      });
    }

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Security: Users can only access their own payment history
    if (session.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access another user\'s payment history' });
    }

    // Forward request to Subscription Service microservice
    const subscriptionServiceUrl = (process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001').replace(/\/$/, '');
    const microserviceUrl = `${subscriptionServiceUrl}/api/subscriptions/${userId}/payments`;

    // Forward cookies and authorization header to the microservice
    const cookieHeader = req.headers.cookie || '';

    const response = await fetch(microserviceUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${session.user.id}`, // Add authorization header
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Subscription service error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch payment history from subscription service',
        details: errorText
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Payment history API error:', error);
    return res.status(500).json({
      error: 'Failed to connect to subscription service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
