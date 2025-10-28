// Twilio SMS service for phone verification
import twilio from 'twilio';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

class TwilioService {
  private client: ReturnType<typeof twilio> | null = null;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !this.fromNumber) {
      console.warn('Twilio credentials not configured. SMS functionality will be disabled.');
      return;
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables.'
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to
      });

      return {
        success: true,
        messageId: result.sid
      };
    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
    const message = `Your Tenure verification code is: ${code}. This code will expire in 10 minutes.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Format phone number to E.164 format (+1234567890)
   */
  formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // If already has country code, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Add country code
    return `${countryCode}${digitsOnly}`;
  }

  /**
   * Generate a random 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }
}

// Export singleton instance
export const twilioService = new TwilioService();
export default twilioService;
