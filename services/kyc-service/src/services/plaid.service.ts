import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

/**
 * Create a Plaid Link token for Identity Verification
 */
export async function createIdentityVerificationLinkToken(
  userId: string,
  email: string
): Promise<{ linkToken: string; expiration: string }> {
  try {
    const templateId = process.env.PLAID_IDV_TEMPLATE_ID;

    if (!templateId) {
      throw new Error('PLAID_IDV_TEMPLATE_ID is not configured');
    }

    const request = {
      client_user_id: userId,
      user: {
        client_user_id: userId,
        email_address: email,
      },
      identity_verification: {
        template_id: templateId,
      },
      products: [Products.IdentityVerification],
      client_name: 'Tenure Azure Flow',
      language: 'en',
      country_codes: [CountryCode.Us],
    };

    const response = await plaidClient.linkTokenCreate(request);

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    };
  } catch (error: any) {
    console.error('Error creating Plaid Link token:', error.response?.data || error.message);
    throw new Error('Failed to create Plaid Link token');
  }
}

/**
 * Get Identity Verification status and details
 */
export async function getIdentityVerification(sessionId: string) {
  try {
    const response = await plaidClient.identityVerificationGet({
      identity_verification_id: sessionId,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching identity verification:', error.response?.data || error.message);
    throw new Error('Failed to fetch identity verification');
  }
}

/**
 * Parse Plaid verification status to our internal status
 */
export function mapPlaidStatusToInternal(plaidStatus: string): string {
  const statusMap: Record<string, string> = {
    'success': 'verified',
    'failed': 'rejected',
    'expired': 'expired',
    'pending_review': 'in_review',
    'requires_input': 'pending',
    'active': 'pending',
  };

  return statusMap[plaidStatus] || 'pending';
}

/**
 * Extract risk score from Plaid verification data
 */
export function extractRiskScore(verificationData: any): number {
  // Plaid provides various checks - we'll create a simple risk score
  // based on verification results (0-100, where 0 is lowest risk)

  let riskScore = 0;
  const steps = verificationData.steps || [];

  steps.forEach((step: any) => {
    if (step.status === 'failed') {
      riskScore += 25;
    } else if (step.status === 'manually_approved') {
      riskScore += 10;
    }
  });

  // Cap at 100
  return Math.min(riskScore, 100);
}
