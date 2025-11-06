import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Proxy endpoint to create Plaid Link token for KYC verification
 * Forwards request to KYC microservice with session cookie
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
    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL || 'http://localhost:3002';

    // Forward request to KYC microservice with session cookie
    const response = await fetch(`${KYC_SERVICE_URL}/kyc/create-link-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '', // Forward session cookie
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
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
