import { Request, Response } from 'express';
import { db } from '../../drizzle/db';
import { kycVerification, userMemberships } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as plaidService from '../services/plaid.service';
import * as sumsubService from '../services/sumsub.service';
import { KYC_STATUS } from '../config/status-constants';

// KYC provider configuration
const KYC_PROVIDER = process.env.KYC_PROVIDER || 'plaid'; // 'plaid' or 'sumsub'

/**
 * Create Link Token/Access Token for Identity Verification
 * POST /kyc/create-link-token
 * Supports both Plaid and Sumsub providers based on KYC_PROVIDER env var
 */
export async function createLinkToken(req: Request, res: Response) {
  try {
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { email, id: userId } = req.user;

    // Check if user already has a verified KYC
    const existingKYC = await db.query.kycVerification.findFirst({
      where: eq(kycVerification.userId, userId)
    });

    if (existingKYC && existingKYC.status === KYC_STATUS.VERIFIED) {
      return res.status(400).json({
        success: false,
        error: 'User already has verified KYC'
      });
    }

    let tokenData;

    if (KYC_PROVIDER === 'sumsub') {
      // Create Sumsub access token
      const { accessToken, expiresAt, applicantId } = await sumsubService.createSumsubAccessToken(
        userId,
        email
      );

      tokenData = {
        accessToken,
        expiresAt,
        applicantId,
        provider: 'sumsub'
      };
    } else {
      // Create Plaid Link token (default)
      const { linkToken, expiration } = await plaidService.createIdentityVerificationLinkToken(
        userId,
        email
      );

      tokenData = {
        linkToken,
        expiration,
        provider: 'plaid'
      };
    }

    res.status(200).json({
      success: true,
      data: tokenData
    });
  } catch (error: any) {
    console.error('Create link token error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create link token'
    });
  }
}

/**
 * Verify KYC and store results
 * POST /kyc/verify
 * Supports both Plaid and Sumsub providers based on KYC_PROVIDER env var
 */
export async function verifyKYC(req: Request, res: Response) {
  try {
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { sessionId, applicantId } = req.body;
    const verificationId = sessionId || applicantId;

    if (!verificationId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID or Applicant ID is required'
      });
    }

    let verificationData: any;
    let status: string;
    let riskScore: number;
    let documentType: string | null = null;
    let provider: string;

    if (KYC_PROVIDER === 'sumsub') {
      // Get verification results from Sumsub
      verificationData = await sumsubService.getApplicantData(verificationId);

      // Map Sumsub status to internal status
      status = sumsubService.mapSumsubStatusToInternal(verificationData.review?.reviewStatus || 'pending');

      // Calculate risk score
      riskScore = sumsubService.extractRiskScore(verificationData);

      // Extract document info
      const docInfo = sumsubService.extractDocumentInfo(verificationData);
      documentType = docInfo.documentType || null;

      provider = 'sumsub';
    } else {
      // Get verification results from Plaid (default)
      verificationData = await plaidService.getIdentityVerification(verificationId);

      // Map Plaid status to internal status
      status = plaidService.mapPlaidStatusToInternal(verificationData.status);

      // Calculate risk score
      riskScore = plaidService.extractRiskScore(verificationData);

      // Extract document info if available
      documentType = (verificationData.documentary_verification as any)?.documents?.[0]?.type;

      provider = 'plaid';
    }

    // Check if KYC record exists
    const existingKYC = await db.query.kycVerification.findFirst({
      where: eq(kycVerification.userId, req.userId)
    });

    if (existingKYC) {
      // Update existing record
      await db
        .update(kycVerification)
        .set({
          status,
          verificationProvider: provider,
          providerVerificationId: verificationId,
          verificationData: verificationData as any,
          documentType: documentType || existingKYC.documentType,
          riskScore,
          verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : existingKYC.verifiedAt,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(kycVerification.id, existingKYC.id));
    } else {
      // Create new record
      await db.insert(kycVerification).values({
        userId: req.userId,
        status,
        verificationProvider: provider,
        providerVerificationId: verificationId,
        verificationData: verificationData as any,
        verificationMethod: provider === 'sumsub' ? 'plaid' : provider, // Use 'plaid' for sumsub to match constraint
        documentType: documentType || null,
        riskScore,
        verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // If verification is successful, update userMemberships table to mark as VERIFIED
    if (status === KYC_STATUS.VERIFIED) {
      await db
        .update(userMemberships)
        .set({
          verificationStatus: 'VERIFIED',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userMemberships.userId, req.userId));
    }

    res.status(200).json({
      success: true,
      data: {
        status,
        verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : null,
        riskScore,
        provider,
      }
    });
  } catch (error: any) {
    console.error('Verify KYC error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify KYC'
    });
  }
}

/**
 * Get user's KYC status
 * GET /kyc/status
 */
export async function getKYCStatus(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const kycRecord = await db.query.kycVerification.findFirst({
      where: eq(kycVerification.userId, req.userId)
    });

    if (!kycRecord) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'not_started',
          verified: false
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: kycRecord.status,
        verified: kycRecord.status === KYC_STATUS.VERIFIED,
        verifiedAt: kycRecord.verifiedAt,
        verificationProvider: kycRecord.verificationProvider,
        riskScore: kycRecord.riskScore,
        createdAt: kycRecord.createdAt,
      }
    });
  } catch (error: any) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get KYC status'
    });
  }
}

/**
 * Get applicant data for admin audit (Sumsub only)
 * GET /kyc/admin/applicant/:applicantId
 */
export async function getApplicantDataForAudit(req: Request, res: Response) {
  try {
    // TODO: Add admin authentication check
    const { applicantId } = req.params;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: 'Applicant ID is required'
      });
    }

    if (KYC_PROVIDER !== 'sumsub') {
      return res.status(400).json({
        success: false,
        error: 'Audit endpoints only available for Sumsub provider'
      });
    }

    const applicantData = await sumsubService.getApplicantData(applicantId);

    res.status(200).json({
      success: true,
      data: applicantData
    });
  } catch (error: any) {
    console.error('Get applicant data for audit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get applicant data'
    });
  }
}

/**
 * Get applicant status for admin audit (Sumsub only)
 * GET /kyc/admin/applicant/:applicantId/status
 */
export async function getApplicantStatusForAudit(req: Request, res: Response) {
  try {
    // TODO: Add admin authentication check
    const { applicantId } = req.params;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: 'Applicant ID is required'
      });
    }

    if (KYC_PROVIDER !== 'sumsub') {
      return res.status(400).json({
        success: false,
        error: 'Audit endpoints only available for Sumsub provider'
      });
    }

    const statusData = await sumsubService.getApplicantStatus(applicantId);

    res.status(200).json({
      success: true,
      data: statusData
    });
  } catch (error: any) {
    console.error('Get applicant status for audit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get applicant status'
    });
  }
}

/**
 * Handle Sumsub applicant reviewed webhook
 * POST /kyc/webhook/applicant-reviewed
 */
export async function handleApplicantReviewedWebhook(req: Request, res: Response) {
  try {
    const { applicantId, reviewStatus, reviewResult, webhookData } = req.body;

    console.log('Processing Sumsub webhook for applicant:', applicantId, 'status:', reviewStatus);

    // Find the KYC record by provider verification ID (applicantId)
    const existingKYC = await db.query.kycVerification.findFirst({
      where: eq(kycVerification.providerVerificationId, applicantId)
    });

    if (!existingKYC) {
      console.log('No KYC record found for applicant:', applicantId);
      return res.status(200).json({
        success: true,
        message: 'No matching KYC record found'
      });
    }

    // Update the KYC record with the new status
    const status = sumsubService.mapSumsubStatusToInternal(reviewStatus);

    // Get full applicant data for risk scoring
    let verificationData: any = existingKYC.verificationData;
    let riskScore = existingKYC.riskScore;

    try {
      const applicantData = await sumsubService.getApplicantData(applicantId);
      verificationData = applicantData;
      riskScore = sumsubService.extractRiskScore(applicantData);

      // Extract document info
      const docInfo = sumsubService.extractDocumentInfo(applicantData);
    } catch (error) {
      console.error('Error fetching updated applicant data:', error);
    }

    await db
      .update(kycVerification)
      .set({
        status,
        verificationData,
        riskScore,
        verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : existingKYC.verifiedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(kycVerification.id, existingKYC.id));

    // If verification is successful, update userMemberships table
    if (status === KYC_STATUS.VERIFIED) {
      await db
        .update(userMemberships)
        .set({
          verificationStatus: 'VERIFIED',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userMemberships.userId, existingKYC.userId));
    }

    console.log('Successfully updated KYC record for applicant:', applicantId, 'new status:', status);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process webhook'
    });
  }
}

/**
 * Get all verified KYC users for admin audit
 * GET /kyc/admin/verified-users
 */
export async function getAllVerifiedUsers(req: Request, res: Response) {
  try {
    // TODO: Add admin authentication check

    const verifiedUsers = await db.query.kycVerification.findMany({
      where: eq(kycVerification.status, KYC_STATUS.VERIFIED),
      orderBy: (table, { desc }) => [desc(table.verifiedAt)],
    });

    // Get user details for each verification
    const usersWithDetails = await Promise.all(
      verifiedUsers.map(async (verification) => {
        // Get user membership details
        const membership = await db.query.userMemberships.findFirst({
          where: eq(userMemberships.userId, verification.userId)
        });

        return {
          id: verification.id,
          userId: verification.userId,
          status: verification.status,
          verificationProvider: verification.verificationProvider,
          providerVerificationId: verification.providerVerificationId,
          documentType: verification.documentType,
          documentNumber: verification.documentNumber,
          riskScore: verification.riskScore,
          verifiedAt: verification.verifiedAt,
          createdAt: verification.createdAt,
          verificationData: verification.verificationData,
          membership: membership ? {
            memberId: membership.id,
            status: membership.verificationStatus,
            joinDate: membership.createdAt,
          } : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithDetails,
      total: usersWithDetails.length,
    });
  } catch (error: any) {
    console.error('Error fetching verified users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch verified users'
    });
  }
}

/**
 * Get KYC statistics for admin dashboard
 * GET /kyc/admin/stats
 */
export async function getKYCStats(req: Request, res: Response) {
  try {
    // TODO: Add admin authentication check

    const [
      totalVerifications,
      verifiedCount,
      pendingCount,
      rejectedCount,
      sumsubCount,
      plaidCount,
    ] = await Promise.all([
      db.$count(kycVerification),
      db.$count(kycVerification, eq(kycVerification.status, KYC_STATUS.VERIFIED)),
      db.$count(kycVerification, eq(kycVerification.status, KYC_STATUS.PENDING)),
      db.$count(kycVerification, eq(kycVerification.status, KYC_STATUS.REJECTED)),
      db.$count(kycVerification, eq(kycVerification.verificationProvider, 'sumsub')),
      db.$count(kycVerification, eq(kycVerification.verificationProvider, 'plaid')),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalVerifications,
        verified: verifiedCount,
        pending: pendingCount,
        rejected: rejectedCount,
        byProvider: {
          sumsub: sumsubCount,
          plaid: plaidCount,
        },
        verificationRate: totalVerifications > 0 ? (verifiedCount / totalVerifications * 100).toFixed(1) : '0',
      },
    });
  } catch (error: any) {
    console.error('Error fetching KYC stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch KYC stats'
    });
  }
}
