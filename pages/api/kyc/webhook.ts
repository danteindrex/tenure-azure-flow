import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Webhook endpoint for Sumsub verification events
 * This endpoint receives notifications when KYC verification status changes
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
    // Verify webhook signature (Sumsub sends a signature for security)
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const webhookSecret = process.env.SUMSUB_WEBHOOK_SECRET || 'eRw3leUt6KNb2Jr6OKDFfH6VqKr';

    if (!signature) {
      return res.status(401).json({
        success: false,
        error: 'Missing webhook signature'
      });
    }

    // Verify webhook signature using HMAC-SHA256
    const crypto = require('crypto');
    const payload = timestamp + JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature. Expected:', expectedSignature, 'Received:', signature);
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    const webhookData = req.body;

    console.log('Sumsub Webhook received:', {
      type: webhookData.type,
      applicantId: webhookData.applicantId,
      reviewStatus: webhookData.reviewStatus,
      createdAt: webhookData.createdAtMs
    });

    // Handle different webhook types
    switch (webhookData.type) {
      case 'applicantReviewed':
        // Applicant review completed
        await handleApplicantReviewed(webhookData);
        break;

      case 'applicantCreated':
        // Applicant created
        console.log('Applicant created:', webhookData.applicantId);
        break;

      case 'applicantPending':
        // Applicant moved to pending
        console.log('Applicant pending:', webhookData.applicantId);
        break;

      default:
        console.log('Unhandled webhook type:', webhookData.type);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
}

async function handleApplicantReviewed(webhookData: any) {
  try {
    const { applicantId, reviewStatus, reviewResult } = webhookData;

    console.log('Processing applicant review:', {
      applicantId,
      reviewStatus,
      reviewResult
    });

    // Forward the webhook data to the KYC service for processing
    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL;

    if (!KYC_SERVICE_URL) {
      console.error('❌ KYC_SERVICE_URL environment variable is not set!');
      return;
    }

    const response = await fetch(`${KYC_SERVICE_URL}/kyc/webhook/applicant-reviewed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No cookies for webhook, as it's from external service
      },
      body: JSON.stringify({
        applicantId,
        reviewStatus,
        reviewResult,
        webhookData
      }),
    });

    if (!response.ok) {
      console.error('Failed to forward webhook to KYC service:', response.statusText);
      const errorText = await response.text();
      console.error('KYC service error response:', errorText);
    } else {
      console.log('Successfully forwarded webhook to KYC service');
    }

    if (!response.ok) {
      console.error('Failed to forward webhook to KYC service:', response.statusText);
    } else {
      console.log('Successfully forwarded webhook to KYC service');
    }

  } catch (error) {
    console.error('Error handling applicant reviewed webhook:', error);
  }
}