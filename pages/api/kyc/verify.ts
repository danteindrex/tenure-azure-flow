import type { NextApiRequest, NextApiResponse } from 'next';
import { authClient } from '@/lib/auth-client';

/**
 * Proxy endpoint to verify KYC
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
    const { sessionId, applicantId } = req.body;

    if (!sessionId && !applicantId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID or Applicant ID is required'
      });
    }

    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL;

    // Forward request to KYC microservice with user data
    const response = await fetch(`${KYC_SERVICE_URL}/kyc/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`, // Pass user ID for service-side validation
      },
      body: JSON.stringify({
        userId: user.id,
        sessionId,
        applicantId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error verifying KYC:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify KYC. Please try again.',
    });
  }
}
