import { Request, Response } from 'express';
import { db } from '../../drizzle/db';
import { kycVerification, userMemberships, users, userAddresses } from '../../drizzle/schema';
import { eq, count } from 'drizzle-orm';
import * as plaidService from '../services/plaid.service';
import { createSumsubService, DocumentMetadata } from '../services/sumsub.service';
import { KYC_STATUS, getKycStatusName } from '../config/status-constants';

// Initialize Sumsub service
const sumsubService = createSumsubService();

// KYC provider configuration
const KYC_PROVIDER = (process.env.KYC_PROVIDER || 'sumsub').trim(); // 'sumsub' or 'plaid'
console.log('🔧 KYC_PROVIDER:', KYC_PROVIDER);

/**
 * Convert country code to alpha-3 format for Sumsub
 */
function convertToAlpha3(countryCode: string): string {
  const countryMap: Record<string, string> = {
    'US': 'USA',
    'CA': 'CAN',
    'GB': 'GBR',
    'UK': 'GBR',
    'DE': 'DEU',
    'FR': 'FRA',
    'IT': 'ITA',
    'ES': 'ESP',
    'AU': 'AUS',
    'JP': 'JPN',
    'CN': 'CHN',
    'IN': 'IND',
    'BR': 'BRA',
    'MX': 'MEX',
    'AR': 'ARG',
    'CO': 'COL',
    'PE': 'PER',
    'CL': 'CHL',
    'VE': 'VEN',
    'UY': 'URY',
    'PY': 'PRY',
    'BO': 'BOL',
    'EC': 'ECU',
    'GY': 'GUY',
    'SR': 'SUR',
    'FK': 'FLK'
  };

  return countryMap[countryCode.toUpperCase()] || countryCode.toUpperCase();
}

/**
 * Create Link Token/Access Token for Identity Verification
 * POST /kyc/create-link-token
 * Supports both Plaid and Sumsub providers based on KYC_PROVIDER env var
 */
export async function createLinkToken(req: Request, res: Response) {
  try {
    // Try to get user from session validation (for direct calls)
    let userId = req.userId;
    let email = req.user?.email;

    // If no session validation, try to get from request body (from frontend proxy)
    if (!userId) {
      userId = req.body?.userId;
      email = req.body?.email;
    }

    // Also check Authorization header for user ID
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!userId || !email) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    let tokenData;

    console.log('🔄 About to check KYC_PROVIDER for createLinkToken:', KYC_PROVIDER);
    console.log('KYC_PROVIDER === "sumsub":', KYC_PROVIDER === 'sumsub');
    if (KYC_PROVIDER === 'sumsub') {
      console.log('🔄 Using Sumsub provider for createLinkToken');
      // Sumsub doesn't need link tokens - return success
      tokenData = {
        provider: 'sumsub',
        message: 'Sumsub provider - no link token needed'
      };
    } else {
      console.log('🔄 Using Plaid provider for createLinkToken');
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
 * Generate hosted verification link for QR code
 * POST /kyc/generate-hosted-link
 */
export async function generateHostedLink(req: Request, res: Response) {
  try {
    // Get user from session validation
    const userId = req.userId || req.body?.userId;
    const email = req.user?.email || req.body?.email;

    if (!userId || !email) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (KYC_PROVIDER !== 'sumsub') {
      return res.status(400).json({
        success: false,
        error: 'Hosted links only available for Sumsub provider'
      });
    }

    // Generate access token
    const accessToken = await sumsubService.generateAccessToken(userId, email);

    // Generate hosted URL
    const hostedUrl = await sumsubService.generateHostedUrl(accessToken);

    res.status(200).json({
      success: true,
      data: {
        hostedUrl,
        accessToken
      }
    });
  } catch (error: any) {
    console.error('Generate hosted link error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate hosted link'
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
    // Try to get user from session validation (for direct calls)
    let userId = req.userId;

    // If no session validation, try to get from request body or Authorization header
    if (!userId) {
      userId = req.body?.userId;
    }

    // Also check Authorization header for user ID
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!userId) {
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
    let status: number;
    let riskScore: number;
    let documentType: string | null = null;
    let provider: string;

    if (KYC_PROVIDER === 'sumsub') {
      // Get verification results from Sumsub
      verificationData = await sumsubService.getApplicantData(verificationId);

    // Map Sumsub status to internal status ID
    const statusName = sumsubService.mapSumsubStatusToInternal(verificationData.review?.reviewStatus || 'pending');
    const statusMap: Record<string, number> = {
      'pending': KYC_STATUS.PENDING,
      'in_review': KYC_STATUS.IN_REVIEW,
      'verified': KYC_STATUS.VERIFIED,
      'rejected': KYC_STATUS.REJECTED,
      'expired': KYC_STATUS.EXPIRED
    };
    status = statusMap[statusName] || KYC_STATUS.PENDING;

    // Calculate risk score
    riskScore = sumsubService.extractRiskScore(verificationData);

    // Extract document info
    const docInfo = sumsubService.extractDocumentInfo(verificationData);
    documentType = docInfo.documentType || null;

    provider = 'sumsub';
    } else {
      // Get verification results from Plaid (default)
      verificationData = await plaidService.getIdentityVerification(verificationId);

    // Map Plaid status to internal status ID
    const statusName = plaidService.mapPlaidStatusToInternal(verificationData.status);
    const statusMap: Record<string, number> = {
      'pending': KYC_STATUS.PENDING,
      'in_review': KYC_STATUS.IN_REVIEW,
      'verified': KYC_STATUS.VERIFIED,
      'rejected': KYC_STATUS.REJECTED,
      'expired': KYC_STATUS.EXPIRED
    };
    status = statusMap[statusName] || KYC_STATUS.PENDING;

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
          kycStatusId: status,
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
        kycStatusId: status,
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
          verificationStatusId: 2, // 2 = Verified in verification_statuses table
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userMemberships.userId, req.userId));
    }

    res.status(200).json({
      success: true,
      data: {
        status: getKycStatusName(status),
        verified: status === KYC_STATUS.VERIFIED,
        verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : null,
        riskScore,
        provider,
        documentType,
        verificationData
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
    // Try to get user from session validation (for direct calls)
    let userId = req.userId;

    // If no session validation, check Authorization header for user ID
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const kycRecord = await db.query.kycVerification.findFirst({
      where: eq(kycVerification.userId, userId)
    });

    if (!kycRecord) {
      // Declare variables for when no KYC record exists
      let status: number = KYC_STATUS.PENDING;
      const existingKYC = { verifiedAt: null, verificationProvider: null };
      
      return res.status(200).json({
        success: true,
        data: {
          status: getKycStatusName(status),
          verified: status === KYC_STATUS.VERIFIED,
          verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : existingKYC.verifiedAt,
          provider: existingKYC.verificationProvider
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: getKycStatusName(kycRecord.kycStatusId),
        verified: kycRecord.kycStatusId === KYC_STATUS.VERIFIED,
        verifiedAt: kycRecord.verifiedAt,
        provider: kycRecord.verificationProvider,
        applicantId: kycRecord.providerVerificationId,
        createdAt: kycRecord.createdAt
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
    const tokenData = applicantData; // Assign applicantData to tokenData for consistency

    res.status(200).json({
      success: true,
      data: tokenData
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
    const applicantData = statusData; // Assign statusData to applicantData for consistency

    res.status(200).json({
      success: true,
      data: applicantData
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

    console.log('🔗 Processing Sumsub webhook:', {
      applicantId,
      reviewStatus,
      reviewAnswer: reviewResult?.reviewAnswer,
      correlationId: req.body.correlationId,
      timestamp: new Date().toISOString()
    });

    // Find the KYC record by provider verification ID (applicantId)
    const existingKYC = await db.query.kycVerification.findFirst({
      where: eq(kycVerification.providerVerificationId, applicantId)
    });

    if (!existingKYC) {
      console.log('❌ No KYC record found for applicant:', applicantId);
      console.log('📊 Available applicant IDs in database:');

      // Log all existing applicant IDs for debugging
      const allRecords = await db.select({
        providerVerificationId: kycVerification.providerVerificationId,
        userId: kycVerification.userId,
        createdAt: kycVerification.createdAt
      }).from(kycVerification);

      allRecords.forEach(record => {
        console.log(`  - ${record.providerVerificationId} (user: ${record.userId}, created: ${record.createdAt})`);
      });

      return res.status(200).json({
        success: true,
        message: 'Webhook processed - no matching KYC record found'
      });
    }

    // Update the KYC record with the new status
    const statusName = sumsubService.mapSumsubStatusToInternal(reviewStatus);
    const statusMap: Record<string, number> = {
      'pending': KYC_STATUS.PENDING,
      'in_review': KYC_STATUS.IN_REVIEW,
      'verified': KYC_STATUS.VERIFIED,
      'rejected': KYC_STATUS.REJECTED,
      'expired': KYC_STATUS.EXPIRED
    };
    const status = statusMap[statusName] || KYC_STATUS.PENDING;

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
        kycStatusId: status,
        verificationData,
        riskScore,
        verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : existingKYC.verifiedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(kycVerification.id, existingKYC.id));

    // Update userMemberships table based on verification result
    let membershipStatusId = 1; // Default to Pending

    if (status === KYC_STATUS.VERIFIED) {
      membershipStatusId = 2; // 2 = Verified in verification_statuses table
    } else if (status === KYC_STATUS.REJECTED) {
      membershipStatusId = 3; // 3 = Failed in verification_statuses table
    }

    await db
      .update(userMemberships)
      .set({
        verificationStatusId: membershipStatusId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userMemberships.userId, existingKYC.userId));

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
      where: eq(kycVerification.kycStatusId, KYC_STATUS.VERIFIED),
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
          status: getKycStatusName(verification.kycStatusId),
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
            status: membership.verificationStatusId,
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
/**
 * POST /kyc/create-applicant
 * Create a new Sumsub applicant for direct API integration
 */
export async function createApplicant(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { externalUserId, email, phone, firstName, lastName, dob, country, ...other } = req.body;

    // externalUserId is optional - Sumsub will generate one if not provided

    console.log('👤 Creating Sumsub applicant for user:', userId);

    // Fetch user details from DB to pre-fill Sumsub
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    const userAddress = await db.query.userAddresses.findFirst({
      where: eq(userAddresses.userId, userId)
    });

    let riskScore = 0;
    let documentType = null;
    let verificationData = null;
    let provider = 'sumsub';

    const applicantData: any = {
      levelName: process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level',
    };

    // Only include optional fields if provided
    if (externalUserId) applicantData.externalUserId = externalUserId;
    if (email) applicantData.email = email;
    if (phone) applicantData.phone = phone;

    // Include personal info in info object as per Sumsub API
    const info: any = {};

    // Use provided personal info first, fallback to DB
    if (firstName) info.firstName = firstName;
    else if (user?.name) {
      const nameParts = user.name.trim().split(' ');
      if (nameParts.length > 0) {
        info.firstName = nameParts[0];
      }
    }

    if (lastName) info.lastName = lastName;
    else if (user?.name) {
      const nameParts = user.name.trim().split(' ');
      if (nameParts.length > 1) {
        info.lastName = nameParts.slice(1).join(' ');
      }
    }

    if (dob) info.dob = dob;
    if (country) info.country = country;

    if (Object.keys(info).length > 0) {
      applicantData.info = info;
    }



    // Map address if available
    if (userAddress) {
      applicantData.addresses = [{
        country: convertToAlpha3(userAddress.countryCode || country || 'US'), // Convert to alpha-3 for Sumsub
        postCode: userAddress.postalCode,
        town: userAddress.city,
        street: userAddress.streetAddress,
        subStreet: userAddress.addressLine2,
        state: userAddress.state
      }];
    }

    const result = await sumsubService.createApplicant(applicantData);

    // Store the applicant in our database
    console.log('🔄 Storing applicant in database:', {
      userId: req.userId,
      sumsubApplicantId: result.id,
      applicantType: result.type,
      createdAtMs: result.createdAtMs
    });

    await db.insert(kycVerification).values({
      userId: req.userId,
      verificationProvider: 'sumsub',
      providerVerificationId: result.id,
      kycStatusId: KYC_STATUS.PENDING,
      verificationData: result,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ Applicant stored in database with ID:', result.id);

    res.json({
      success: true,
      message: 'Applicant created successfully',
      data: result,
      nextSteps: {
        uploadDocuments: 'Upload ID documents (front/back separately)',
        performLiveness: 'Use Sumsub SDK for liveness verification',
        startVerification: 'Start verification process after both steps'
      }
    });
  } catch (error) {
    console.error('Error creating applicant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create applicant'
    });
  }
}

/**
 * POST /kyc/upload-document
 * Upload document for KYC verification
 */
export async function uploadDocument(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Debug: Log what we received
    console.log('📥 Raw request body:', req.body);
    console.log('📥 Raw request files:', req.files);

    // Parse metadata from FormData
    let metadata;
    try {
      const metadataField = req.body.metadata;
      console.log('🔍 Metadata field:', metadataField, typeof metadataField);

      if (typeof metadataField === 'string') {
        metadata = JSON.parse(metadataField);
        console.log('✅ Parsed metadata:', metadata);
      } else {
        metadata = metadataField;
        console.log('⚠️ Metadata not a string:', metadata);
      }
    } catch (error) {
      console.error('❌ Failed to parse metadata:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid metadata format: ' + error.message
      });
    }

    const { idDocType: documentType, country: rawCountry = 'US', idDocSubType } = metadata || {};
    const country = convertToAlpha3(rawCountry);
    const applicantId = req.body.applicantId;

    console.log('📄 Upload Document Request:', {
      userId,
      applicantId,
      documentType,
      country,
      idDocSubType,
      hasFile: !!req.files,
      files: req.files ? Object.keys(req.files) : [],
      metadata
    });

    if (!applicantId || !documentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: applicantId, documentType'
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files || (!files.content && !files.backFile)) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const results = [];

    // Upload front side (content)
    if (files.content && files.content[0]) {
      const frontFile = files.content[0];
      const frontFileData = {
        buffer: frontFile.buffer,
        originalname: frontFile.originalname,
        mimetype: frontFile.mimetype,
        size: frontFile.size,
      };

      const frontMetadata: DocumentMetadata = {
        idDocType: documentType,
        country,
        idDocSubType: idDocSubType || 'FRONT_SIDE'
      };

      console.log('📄 Uploading front side:', frontMetadata);
      const frontResult = await sumsubService.uploadDocument(
        applicantId,
        frontFileData,
        frontMetadata
      );
      results.push({ side: 'front', ...frontResult });
    }

    // Upload back side (backFile)
    if (files.backFile && files.backFile[0]) {
      const backFile = files.backFile[0];
      const backFileData = {
        buffer: backFile.buffer,
        originalname: backFile.originalname,
        mimetype: backFile.mimetype,
        size: backFile.size,
      };

      const backMetadata: DocumentMetadata = {
        idDocType: documentType,
        country,
        idDocSubType: 'BACK_SIDE'
      };

      console.log('📄 Uploading back side:', backMetadata);
      const backResult = await sumsubService.uploadDocument(
        applicantId,
        backFileData,
        backMetadata
      );
      results.push({ side: 'back', ...backResult });
    }

    const result = results.length === 1 ? results[0] : results;

    // Fetch the current KYC record to get actual status from database
    const existingKYC = await db.query.kycVerification.findFirst({
      where: eq(kycVerification.userId, userId)
    });

    // Use actual values from database record
    const status: number = existingKYC?.kycStatusId || KYC_STATUS.PENDING;
    const riskScore = existingKYC?.riskScore || null;

    res.status(200).json({
      success: true,
      data: {
        status: getKycStatusName(status),
        verified: status === KYC_STATUS.VERIFIED,
        verifiedAt: status === KYC_STATUS.VERIFIED ? new Date().toISOString() : existingKYC?.verifiedAt,
        provider: existingKYC?.verificationProvider || 'sumsub',
        riskScore,
        documentType: existingKYC?.documentType || null,
        uploadResult: result
      }
    });

  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document'
    });
  }
}

/**
 * POST /kyc/start-verification
 * Start the verification process for an applicant
 */
export async function startVerification(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { applicantId } = req.body;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: applicantId'
      });
    }

    console.log('🚀 Starting verification for applicant:', applicantId);

    // First check the current verification status
    const statusResult = await sumsubService.getVerificationStatus(applicantId);
    console.log('📊 Current verification status:', statusResult);

    const result = await sumsubService.startVerification(applicantId);

    res.json({
      success: true,
      message: 'Verification started successfully',
      data: result,
      currentStatus: statusResult
    });
  } catch (error) {
    console.error('Error starting verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start verification'
    });
  }
}

/**
 * POST /kyc/get-sdk-token
 * Get Sumsub SDK access token for liveness verification
 */
export async function getSdkToken(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
}

    const { applicantId } = req.body;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: 'Applicant ID is required'
      });
    }

    console.log('🔑 Generating SDK token for applicant:', applicantId);

    const result = await sumsubService.getSdkToken(applicantId);

    res.json({
      success: true,
      message: 'SDK token generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error generating SDK token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SDK token'
    });
  }
}

export async function getKYCStats(req: Request, res: Response) {
  try {
    const [verifiedCount] = await db.select({ count: count() }).from(kycVerification).where(eq(kycVerification.kycStatusId, KYC_STATUS.VERIFIED));
    const [pendingCount] = await db.select({ count: count() }).from(kycVerification).where(eq(kycVerification.kycStatusId, KYC_STATUS.PENDING));
    const [rejectedCount] = await db.select({ count: count() }).from(kycVerification).where(eq(kycVerification.kycStatusId, KYC_STATUS.REJECTED));
    const [sumsubCount] = await db.select({ count: count() }).from(kycVerification).where(eq(kycVerification.verificationProvider, 'sumsub'));
    const [plaidCount] = await db.select({ count: count() }).from(kycVerification).where(eq(kycVerification.verificationProvider, 'plaid'));

    res.status(200).json({
      success: true,
      data: {
        verifiedUsers: verifiedCount?.count || 0,
        pendingUsers: pendingCount?.count || 0,
        rejectedUsers: rejectedCount?.count || 0,
        sumsubUsers: sumsubCount?.count || 0,
        plaidUsers: plaidCount?.count || 0,
      }
    });
  } catch (error: any) {
    console.error('Error getting KYC stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KYC statistics'
    });
  }
}
