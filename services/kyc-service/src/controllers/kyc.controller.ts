import { Request, Response } from 'express';
import { db } from '../../drizzle/db';
import { kycVerification, userMemberships } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as plaidService from '../services/plaid.service';

/**
 * Create Plaid Link Token for Identity Verification
 * POST /kyc/create-link-token
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

    if (existingKYC && existingKYC.status === 'verified') {
      return res.status(400).json({
        success: false,
        error: 'User already has verified KYC'
      });
    }

    // Create Plaid Link token
    const { linkToken, expiration } = await plaidService.createIdentityVerificationLinkToken(
      userId,
      email
    );

    res.status(200).json({
      success: true,
      data: {
        linkToken,
        expiration
      }
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
 */
export async function verifyKYC(req: Request, res: Response) {
  try {
    if (!req.user || !req.userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Get verification results from Plaid
    const verificationData = await plaidService.getIdentityVerification(sessionId);

    // Map Plaid status to internal status
    const status = plaidService.mapPlaidStatusToInternal(verificationData.status);

    // Calculate risk score
    const riskScore = plaidService.extractRiskScore(verificationData);

    // Extract document info if available
    const documentType = (verificationData.documentary_verification as any)?.documents?.[0]?.type;

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
          verificationProvider: 'plaid',
          providerVerificationId: sessionId,
          verificationData: verificationData as any,
          documentType: documentType || existingKYC.documentType,
          riskScore,
          verifiedAt: status === 'verified' ? new Date().toISOString() : existingKYC.verifiedAt,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(kycVerification.id, existingKYC.id));
    } else {
      // Create new record
      await db.insert(kycVerification).values({
        userId: req.userId,
        status,
        verificationProvider: 'plaid',
        providerVerificationId: sessionId,
        verificationData: verificationData as any,
        verificationMethod: 'plaid',
        documentType: documentType || null,
        riskScore,
        verifiedAt: status === 'verified' ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // If verification is successful, update userMemberships table to mark as VERIFIED
    if (status === 'verified') {
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
        verifiedAt: status === 'verified' ? new Date().toISOString() : null,
        riskScore,
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
        verified: kycRecord.status === 'verified',
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
