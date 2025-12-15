import type { NextApiRequest, NextApiResponse } from 'next';
import { authClient } from '@/lib/auth-client';

/**
 * Proxy endpoint to create KYC verification token
 * Validates session on frontend side and passes user data to KYC service
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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

    console.log('🔍 Create Link Token Request:');
    console.log('  Service URL:', KYC_SERVICE_URL);
    console.log('  All env vars:', Object.keys(process.env).filter(key => key.includes('KYC') || key.includes('SERVICE')));

    if (!KYC_SERVICE_URL) {
      console.error('❌ KYC_SERVICE_URL environment variable is not set!');
      return res.status(500).json({
        success: false,
        error: 'KYC service URL not configured'
      });
    }

    // Forward request to KYC microservice with user data
    const response = await fetch(`${KYC_SERVICE_URL}/kyc/create-link-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`, // Pass user ID for service-side validation
      },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        ...req.body,
      }),
    });

    console.log('📤 KYC Service Response:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ KYC Service Error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error creating KYC link token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create link token. Please try again.',
    });
  }
}
