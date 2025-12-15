import axios from 'axios';

// Sumsub API configuration
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || '';
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || '';
const SUMSUB_WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET || '';
const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || 'Home solutions verify';

/**
 * Generate Sumsub access token for WebSDK
 */
export async function createSumsubAccessToken(
  userId: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<{ accessToken: string; expiresAt: string; applicantId?: string }> {
  try {
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      throw new Error('SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY must be configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(timestamp);

    const requestBody = {
      userId,
      levelName: SUMSUB_LEVEL_NAME,
      ttlInSecs: 600, // 10 minutes
      ...(firstName && lastName && {
        applicant: {
          externalUserId: userId,
          email,
          info: {
            firstName,
            lastName,
          },
        },
      }),
    };

    const response = await axios.post(
      `${SUMSUB_BASE_URL}/resources/accessTokens`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': SUMSUB_APP_TOKEN,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': timestamp.toString(),
        },
      }
    );

    const expiresAt = new Date(Date.now() + 600 * 1000).toISOString(); // 10 minutes from now

    return {
      accessToken: response.data.token,
      expiresAt,
      applicantId: response.data.applicantId,
    };
  } catch (error: any) {
    console.error('Error creating Sumsub access token:', error.response?.data || error.message);
    throw new Error('Failed to create Sumsub access token');
  }
}

/**
 * Get applicant verification status from Sumsub
 */
export async function getApplicantStatus(applicantId: string) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(timestamp);

    const response = await axios.get(
      `${SUMSUB_BASE_URL}/resources/applicants/${applicantId}/status`,
      {
        headers: {
          'X-App-Token': SUMSUB_APP_TOKEN,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': timestamp.toString(),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error fetching applicant status:', error.response?.data || error.message);
    throw new Error('Failed to fetch applicant status');
  }
}

/**
 * Get applicant data from Sumsub
 */
export async function getApplicantData(applicantId: string) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(timestamp);

    const response = await axios.get(
      `${SUMSUB_BASE_URL}/resources/applicants/${applicantId}/one`,
      {
        headers: {
          'X-App-Token': SUMSUB_APP_TOKEN,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': timestamp.toString(),
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error fetching applicant data:', error.response?.data || error.message);
    throw new Error('Failed to fetch applicant data');
  }
}

/**
 * Generate HMAC signature for Sumsub API authentication
 */
function generateSignature(timestamp: number): string {
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(timestamp + SUMSUB_APP_TOKEN)
    .digest('hex');

  return signature;
}

/**
 * Map Sumsub verification status to our internal status
 */
export function mapSumsubStatusToInternal(sumsubStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'queued': 'pending',
    'prechecked': 'pending',
    'init': 'pending',
    'review': 'in_review',
    'onHold': 'in_review',
    'completed': 'verified',
    'approved': 'verified',
    'accepted': 'verified',
    'rejected': 'rejected',
    'declined': 'rejected',
    'expired': 'expired',
  };

  return statusMap[sumsubStatus] || 'pending';
}

/**
 * Extract risk score from Sumsub verification data
 */
export function extractRiskScore(applicantData: any): number {
  // Sumsub provides risk scoring through their AML and fraud detection
  // We'll create a risk score based on review results and checks

  let riskScore = 0;

  const review = applicantData?.review;
  if (review) {
    // If rejected, high risk
    if (review.reviewStatus === 'rejected') {
      riskScore += 80;
    }

    // Check for failed checks
    const checks = review.checks || [];
    checks.forEach((check: any) => {
      if (check.checkResult === 'failed') {
        riskScore += 20;
      } else if (check.checkResult === 'warning') {
        riskScore += 10;
      }
    });

    // Moderate risk for manual review
    if (review.reviewStatus === 'onHold') {
      riskScore += 30;
    }
  }

  // Cap at 100
  return Math.min(riskScore, 100);
}

/**
 * Extract document information from Sumsub applicant data
 */
export function extractDocumentInfo(applicantData: any): { documentType?: string; documentNumber?: string } {
  const info = applicantData?.info || {};
  const documents = info.documents || [];

  if (documents.length > 0) {
    const primaryDoc = documents[0];
    return {
      documentType: primaryDoc.idDocType,
      documentNumber: primaryDoc.number,
    };
  }

  return {};
}