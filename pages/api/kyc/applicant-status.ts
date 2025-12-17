import type { NextApiRequest, NextApiResponse } from 'next';
import { authClient } from '@/lib/auth-client';

/**
 * GET /api/kyc/applicant-status
 * Get the verification status of a specific applicant from Sumsub
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
    // Validate session
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
    const { applicantId } = req.query;
    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL;

    console.log('🔍 Applicant Status Request:');
    console.log('  Service URL:', KYC_SERVICE_URL);
    console.log('  Applicant ID:', applicantId);

    if (!KYC_SERVICE_URL) {
      console.error('❌ KYC_SERVICE_URL environment variable is not set!');
      return res.status(500).json({
        success: false,
        error: 'KYC service URL not configured'
      });
    }

    if (!applicantId || typeof applicantId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Applicant ID is required'
      });
    }

    // Forward request to KYC microservice with proper cookie forwarding
    // Convert cookies object to cookie header string
    const cookieHeader = Object.entries(req.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const response = await fetch(`${KYC_SERVICE_URL}/kyc/applicant-status?applicantId=${encodeURIComponent(applicantId)}`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Authorization': req.headers.authorization || `Bearer ${user.id}`,
      },
    }).catch(err => {
      console.error('❌ Failed to connect to KYC service:', err.message);
      throw new Error(`KYC service unavailable: ${err.message}`);
    });

    console.log('📤 KYC Service Response:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ KYC Service Error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error getting applicant status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get applicant status. Please try again.',
    });
  }
}