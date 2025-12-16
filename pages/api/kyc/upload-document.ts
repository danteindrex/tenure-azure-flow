import type { NextApiRequest, NextApiResponse } from 'next';
import { authClient } from '@/lib/auth-client';
import formidable from 'formidable';

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST /api/kyc/upload-document
 * Upload document for KYC verification
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
    const KYC_SERVICE_URL = process.env.KYC_SERVICE_URL;

    console.log('🔍 Upload Document Request:');
    console.log('  Service URL:', KYC_SERVICE_URL);

    if (!KYC_SERVICE_URL) {
      console.error('❌ KYC_SERVICE_URL environment variable is not set!');
      return res.status(500).json({
        success: false,
        error: 'KYC service URL not configured'
      });
    }

    // Parse multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowEmptyFiles: false,
    });

    const [fields, files] = await form.parse(req);

    // Parse metadata from fields
    let metadata;
    try {
      const metadataField = fields.metadata?.[0];
      if (metadataField) {
        metadata = JSON.parse(metadataField);
        console.log('✅ Parsed metadata in API route:', metadata);
      }
    } catch (error) {
      console.error('❌ Failed to parse metadata in API route:', error);
    }

    const applicantId = fields.applicantId?.[0];
    const { idDocType: documentType, country = 'US', idDocSubType } = metadata || {};

    console.log('📄 Parsed form data:', {
      applicantId,
      documentType,
      country,
      idDocSubType,
      hasFile: !!files.content?.[0],
      metadata
    });

    if (!applicantId || !documentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: applicantId, documentType'
      });
    }

    const file = files.content?.[0]; // Changed from 'file' to 'content'
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Recreate FormData for forwarding with new format
    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadata));

    // Read file content and append to FormData with correct mimetype
    const fs = require('fs');
    const fileContent = fs.readFileSync(file.filepath);
    const mimeType = file.mimetype || 'image/jpeg'; // Preserve original mimetype
    formData.append('content', new Blob([fileContent], { type: mimeType }), file.originalFilename || 'upload.jpg');
    formData.append('applicantId', applicantId);

    // Forward request to KYC microservice with proper cookie forwarding
    // Convert cookies object to cookie header string
    const cookieHeader = Object.entries(req.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const response = await fetch(`${KYC_SERVICE_URL}/kyc/upload-document`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'Authorization': req.headers.authorization || `Bearer ${user.id}`,
      },
      body: formData,
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
    console.error('Error uploading document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload document. Please try again.',
    });
  }
}