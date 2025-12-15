import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Proxy endpoint to verify KYC and store results
 * Forwards Plaid session ID to KYC microservice
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
    const { sessionId, applicantId } = req.body;

    if (!sessionId && !applicantId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID or Applicant ID is required'
      });
    }

    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL || 'http://localhost:3003';

    // Forward request to KYC microservice with session cookie
    const response = await fetch(`${KYC_SERVICE_URL}/kyc/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '', // Forward session cookie
      },
      body: JSON.stringify({ sessionId, applicantId }),
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
