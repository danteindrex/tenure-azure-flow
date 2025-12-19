import crypto from 'crypto';
import FormData from 'form-data';

export interface SumsubConfig {
  appToken: string;
  secretKey: string;
  baseUrl: string;
  levelName: string;
}

export interface ApplicantData {
  externalUserId: string;
  levelName: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  addresses?: Array<{
    country: string;
    postCode?: string;
    town?: string;
    street?: string;
    subStreet?: string;
    state?: string;
  }>;
}

export interface DocumentMetadata {
  idDocType: string;
  country: string;
  idDocSubType?: 'FRONT_SIDE' | 'BACK_SIDE';
}

export class SumsubService {
  private config: SumsubConfig;

  constructor(config: SumsubConfig) {
    this.config = config;
  }

  /**
   * Generate HMAC signature for API authentication
   */
  private generateSignature(timestamp: string, method: string, url: string, body?: string | Buffer): string {
    console.log('🔐 Signature Debug:', {
      timestamp,
      method: method.toUpperCase(),
      url,
      body: body ? (body instanceof Buffer ? `Buffer(${body.length} bytes)` : (typeof body === 'string' ? body.substring(0, 100) + (body.length > 100 ? '...' : '') : 'unknown')) : '(no body)',
      secretKeyLength: this.config.secretKey?.length || 0,
      appTokenLength: this.config.appToken?.length || 0
    });

    if (!this.config.secretKey) {
      throw new Error('Secret key is not configured');
    }

    const signature = crypto.createHmac('sha256', this.config.secretKey);
    signature.update(timestamp + method.toUpperCase() + url);

    if (body instanceof Buffer) {
      signature.update(body);
    } else if (body) {
      signature.update(body);
    }
    // If body is undefined, don't include it in signature (matches Sumsub docs)

    const result = signature.digest('hex');
    console.log('🔑 Generated signature:', result.substring(0, 20) + '...');
    return result;
  }

  /**
   * Make authenticated request to Sumsub API
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT',
    endpoint: string,
    body?: any,
    isFormData: boolean = false
  ): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const url = endpoint.replace(this.config.baseUrl, '');

    // For FormData, include the raw multipart buffer in signature calculation
    let signatureBody: string | Buffer | undefined = undefined;
    if (body && !isFormData) {
      signatureBody = JSON.stringify(body);
    } else if (body && isFormData && body instanceof FormData) {
      // For FormData from npm form-data package, use getBuffer() directly
      signatureBody = body.getBuffer();
    }
    // Note: For requests without body, signatureBody remains undefined (no body in signature)

    const signature = this.generateSignature(timestamp, method, url, signatureBody);

    const headers: Record<string, string> = {
      'X-App-Token': this.config.appToken,
      'X-App-Access-Ts': timestamp,
      'X-App-Access-Sig': signature,
    };

    // For FormData, manually set Content-Type with boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    } else if (body && isFormData && body instanceof FormData) {
      // Manually set Content-Type for FormData to ensure proper boundary
      const formHeaders = body.getHeaders();
      if (formHeaders['content-type']) {
        headers['Content-Type'] = formHeaders['content-type'];
      }
    }

    console.log('🚀 Final request details:', {
      fullUrl: `${this.config.baseUrl}${endpoint}`,
      method,
      headers: {
        'X-App-Token': headers['X-App-Token'] ? 'present' : 'missing',
        'X-App-Access-Ts': headers['X-App-Access-Ts'],
        'X-App-Access-Sig': headers['X-App-Access-Sig']?.substring(0, 20) + '...',
        'Content-Type': headers['Content-Type'] || 'auto-set-by-fetch'
      },
      hasBody: !!body,
      isFormData,
      bodyType: body?.constructor?.name || 'none',
      signatureBodyString: signatureBody instanceof Buffer ? `Buffer(${signatureBody.length} bytes)` : (typeof signatureBody === 'string' ? signatureBody.substring(0, 100) + (signatureBody.length > 100 ? '...' : '') : 'unknown')
    });

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers,
      body: isFormData && body instanceof FormData ? body.getBuffer() : (typeof signatureBody === 'string' ? signatureBody : undefined),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sumsub API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a new applicant
   */
  async createApplicant(data: ApplicantData): Promise<any> {
    const levelName = data.levelName || this.config.levelName;
    const endpoint = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;

    const body: any = {
      externalUserId: data.externalUserId,
      email: data.email,
      phone: data.phone,
    };

    // Add fixedInfo if personal data is provided
    if (data.firstName || data.lastName || (data.addresses && data.addresses.length > 0)) {
      body.fixedInfo = {
        firstName: data.firstName,
        lastName: data.lastName,
        addresses: data.addresses
      };
    }

    return this.makeRequest('POST', endpoint, body);
  }

  /**
   * Upload document for applicant
   */
  async uploadDocument(
    applicantId: string,
    file: any,
    metadata: DocumentMetadata
  ): Promise<any> {
    const endpoint = `/resources/applicants/${applicantId}/info/idDoc`;

    const form = new FormData();
    form.append('metadata', JSON.stringify(metadata));

    // Handle different file formats (multer vs browser File)
    if (file.buffer) {
      // Multer file - use buffer directly
      form.append('content', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
    } else {
      // Browser File - convert to buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      form.append('content', buffer, {
        filename: file.name,
        contentType: file.type
      });
    }

    return this.makeRequest('POST', endpoint, form, true);
  }

  /**
   * Start verification process
   */
  async startVerification(applicantId: string): Promise<any> {
    const endpoint = `/resources/applicants/${applicantId}/status/pending`;
    return this.makeRequest('POST', endpoint);
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(applicantId: string): Promise<any> {
    const endpoint = `/resources/applicants/${applicantId}/status`;
    return this.makeRequest('GET', endpoint);
  }

  /**
   * Get complete applicant data
   */
  async getApplicantData(applicantId: string): Promise<any> {
    const endpoint = `/resources/applicants/${applicantId}/one`;
    return this.makeRequest('GET', endpoint);
  }

  /**
   * Get available verification levels
   */
  async getVerificationLevels(): Promise<any> {
    const endpoint = `/resources/applicants/-/levels`;
    return this.makeRequest('GET', endpoint);
  }

  /**
   * Map Sumsub status to internal status
   */
  mapSumsubStatusToInternal(sumsubStatus: any): number {
    console.log('🔧 mapSumsubStatusToInternal called with:', JSON.stringify(sumsubStatus));
    const status = sumsubStatus?.reviewStatus;
    console.log('🔧 Extracted status:', status);

    switch (status) {
      case 'completed':
        const answer = sumsubStatus.reviewResult?.reviewAnswer;
        console.log('🔧 Review answer for completed:', answer);
        return answer === 'GREEN' ? 3 : 4; // verified or rejected
      case 'pending':
      case 'review':
        return 2; // review
      default:
        console.log('🔧 Default case hit, returning 1');
        return 1; // pending
    }
  }

  /**
   * Extract risk score from Sumsub response
   */
  extractRiskScore(applicantData: any): number {
    // Sumsub provides risk scores in various formats
    // This is a simplified extraction - adjust based on actual response structure
    return applicantData?.riskScore?.value || 0;
  }

  /**
   * Extract document information
   */
  extractDocumentInfo(applicantData: any): any {
    // Extract document information from Sumsub response
    return {
      documents: applicantData?.info?.idDocs || [],
      documentTypes: applicantData?.requiredIdDocs || []
    };
  }

  /**
   * Get applicant status (alias for getVerificationStatus)
   */
  async getApplicantStatus(applicantId: string): Promise<any> {
    const endpoint = `/resources/applicants/${applicantId}/status`;
    return this.makeRequest('GET', endpoint);
  }

  /**
   * Get SDK access token for liveness verification
   */
  async getSdkToken(applicantId: string): Promise<any> {
    const endpoint = `/resources/accessTokens?userId=${encodeURIComponent(applicantId)}&levelName=${encodeURIComponent(this.config.levelName)}&ttlInSecs=600`;
    return this.makeRequest('POST', endpoint);
  }

  /**
   * Generate access token for hosted verification
   */
  async generateAccessToken(userId: string, email?: string): Promise<string> {
    const endpoint = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(this.config.levelName)}&ttlInSecs=3600`;

    const response = await this.makeRequest('POST', endpoint);

    return response.token;
  }

  /**
   * Generate hosted verification URL for QR code
   */
  async generateHostedUrl(userId: string, email?: string): Promise<string> {
    const endpoint = `/resources/sdkIntegrations/levels/${encodeURIComponent(this.config.levelName)}/websdkLink?ttlInSecs=3600&externalUserId=${encodeURIComponent(userId)}&lang=en`;

    const body: any = {};
    if (email) {
      body.applicantIdentifiers = { email };
    }

    const response = await this.makeRequest('POST', endpoint, Object.keys(body).length > 0 ? body : undefined);

    return response.url;
  }
}

// Factory function to create service instance
export function createSumsubService(): SumsubService {
  const config: SumsubConfig = {
    appToken: process.env.SUMSUB_APP_TOKEN!,
    secretKey: process.env.SUMSUB_SECRET_KEY!,
    baseUrl: process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com',
    levelName: process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level',
  };

  console.log('🔧 Sumsub Service Config:', {
    appToken: config.appToken ? `${config.appToken.substring(0, 10)}...` : 'missing',
    secretKey: config.secretKey ? `${config.secretKey.substring(0, 10)}...` : 'missing',
    baseUrl: config.baseUrl,
    levelName: config.levelName,
    appTokenLength: config.appToken?.length,
    secretKeyLength: config.secretKey?.length
  });

  if (!config.appToken || !config.secretKey) {
    throw new Error('Sumsub credentials not configured');
  }

  // Test signature generation with a known value
  const testSignature = crypto.createHmac('sha256', config.secretKey)
    .update('test')
    .digest('hex');

  console.log('🧪 Signature test (should be consistent):', testSignature.substring(0, 20) + '...');

  return new SumsubService(config);
}