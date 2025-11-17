import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user session
    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: req.headers.cookie || ''
      })
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Forward request to Tenure Queue microservice
    const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:3001';
    const { search, limit, offset } = req.query;

    const searchParams = new URLSearchParams();
    if (search) searchParams.append('search', search as string);
    if (limit) searchParams.append('limit', limit as string);
    if (offset) searchParams.append('offset', offset as string);

    const queryString = searchParams.toString();
    const microserviceUrl = `${queueServiceUrl}/api/queue${queryString ? `?${queryString}` : ''}`;

    // Forward cookies from the original request to the microservice
    const cookieHeader = req.headers.cookie || '';

    const response = await fetch(microserviceUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${session.user.id}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tenure Queue service error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch queue data from Tenure Queue service',
        details: errorText
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Queue API error:', error);
    return res.status(500).json({
      error: 'Failed to connect to Tenure Queue service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}