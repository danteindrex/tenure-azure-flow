import type { NextApiRequest, NextApiResponse } from 'next';
import { authClient } from '@/lib/auth-client';

/**
 * Proxy endpoint to get user's KYC verification status
 * Validates session on frontend side and passes user data to KYC service
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Validate session using Better Auth client
    const session = await authClient.getSession({
      fetchOptions: {
        headers: {
          cookie: req.headers.cookie || '',
        },
      },
    });

    if (!session?.data?.user) {
      return res.status(401).json({
        success: false,
        error: 'No session token provided'
      });
    }

    const user = session.data.user;
    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL;

    console.log('🔍 KYC Status Request:');
    console.log('  Service URL:', KYC_SERVICE_URL);
    console.log('  User ID:', user.id);

    if (!KYC_SERVICE_URL) {
      console.error('❌ KYC_SERVICE_URL environment variable is not set!');
      return res.status(500).json({
        success: false,
        error: 'KYC service URL not configured'
      });
    }

    // Forward request to KYC microservice with proper cookie forwarding
    // Convert cookies object to cookie header string
    const cookieHeader = Object.entries(req.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const response = await fetch(`${KYC_SERVICE_URL}/kyc/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader, // Forward Better Auth session cookie
        'Authorization': req.headers.authorization || `Bearer ${user.id}`, // Pass user ID as backup
      },
    }).catch(err => {
      console.error('❌ Failed to connect to KYC service:', err.message);
      throw new Error(`KYC service unavailable: ${err.message}`);
    });

    console.log('📤 KYC Service Response:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error fetching KYC status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC status. Please try again.',
    });
  }
}
