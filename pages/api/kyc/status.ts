import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Proxy endpoint to get user's KYC verification status
 * Forwards request to KYC microservice with session cookie
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
    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL || 'http://localhost:3002';

    // Forward request to KYC microservice with session cookie
    const response = await fetch(`${KYC_SERVICE_URL}/kyc/status`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '', // Forward session cookie
      },
    });

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
