// Phone authentication service with Better Auth + Twilio
import { authClient } from './auth-client';
import {
  PhoneSignupStep1Data,
  PhoneSignupStep2Data,
  PhoneAuthResponse,
  OtpVerificationResult,
  UserCompletionStatus,
  AuthError
} from '@/types/auth';

export class PhoneAuthService {
  /**
   * Step 1: Create user account with phone and password (Better Auth)
   */
  async signUpWithPhone(data: PhoneSignupStep1Data): Promise<PhoneAuthResponse> {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(data.phone, data.countryCode);

      // Create user with Better Auth (email/password)
      // We'll use phone as email temporarily, or require email
      const { data: authData, error } = await authClient.signUp.email({
        email: data.email || `${formattedPhone.replace(/\+/g, '')}@temp.tenure.com`, // Temp email if not provided
        password: data.password,
        name: data.name || 'User',
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message || 'Signup failed',
            code: error.message,
            details: error
          }
        };
      }

      // Store phone in Better Auth user (will be verified in next step)
      if (authData?.user) {
        await authClient.updateUser({
          phone: formattedPhone,
          phoneVerified: false
        });
      }

      return {
        success: true,
        data: {
          user: authData?.user,
          session: authData?.session
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Unexpected error during phone signup',
          details: err
        }
      };
    }
  }

  /**
   * Step 2: Send OTP to phone number via Twilio
   */
  async sendOtp(phone: string, countryCode: string): Promise<PhoneAuthResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone, countryCode);

      // Call our API endpoint to send verification code
      const response = await fetch('/api/verify/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: formattedPhone,
          countryCode
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: {
            message: result.error || 'Failed to send verification code',
            code: result.code || 'SEND_OTP_FAILED',
            details: result
          }
        };
      }

      return {
        success: true,
        data: {
          message: 'Verification code sent successfully',
          expiresAt: result.expiresAt
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to send OTP',
          details: err
        }
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(data: PhoneSignupStep2Data): Promise<OtpVerificationResult> {
    try {
      // Call our API endpoint to verify code
      const response = await fetch('/api/verify/check-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: data.phone,
          code: data.otp
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          verified: false,
          error: {
            message: result.error || 'Invalid or expired code',
            code: result.code || 'INVALID_OTP',
            details: result
          }
        };
      }

      return {
        success: true,
        verified: true,
        message: 'Phone number verified successfully'
      };
    } catch (err: any) {
      return {
        success: false,
        verified: false,
        error: {
          message: err.message || 'Failed to verify OTP',
          details: err
        }
      };
    }
  }

  /**
   * Get user completion status
   */
  async getUserCompletionStatus(userId: string): Promise<UserCompletionStatus> {
    try {
      // Get current session
      const session = await authClient.getSession();

      if (!session?.data?.user) {
        throw new Error('User not authenticated');
      }

      const user = session.data.user;

      return {
        userId: user.id,
        completedSteps: {
          phoneVerified: user.phoneVerified || false,
          emailVerified: user.emailVerified || false,
          profileCompleted: !!(user.name && user.email),
          paymentCompleted: user.onboardingCompleted || false
        },
        currentStep: user.onboardingStep || 1,
        isComplete: user.onboardingCompleted || false
      };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to get user status');
    }
  }

  /**
   * Login with phone and password
   */
  async signInWithPhone(phone: string, password: string, countryCode: string): Promise<PhoneAuthResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone, countryCode);

      // Better Auth doesn't support phone login natively
      // We need to use email login instead
      // Convert phone to temp email format or require actual email
      const { data, error } = await authClient.signIn.email({
        email: `${formattedPhone.replace(/\+/g, '')}@temp.tenure.com`,
        password
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message || 'Login failed',
            code: error.message,
            details: error
          }
        };
      }

      return {
        success: true,
        data: {
          user: data?.user,
          session: data?.session
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Unexpected error during login',
          details: err
        }
      };
    }
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phone: string, countryCode: string): string {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // If already has country code, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Add country code (default +1 for US)
    const code = countryCode || '+1';
    return `${code}${digitsOnly}`;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    // Basic validation - at least 10 digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  }

  /**
   * Get current user session
   */
  async getCurrentSession() {
    const session = await authClient.getSession();
    return {
      session: session.data,
      error: session.error
    };
  }

  /**
   * Sign out user
   */
  async signOut() {
    await authClient.signOut();
    return { error: null };
  }
}

// Export singleton instance
export const phoneAuthService = new PhoneAuthService();

// Export factory function for compatibility
export const createPhoneAuthService = () => phoneAuthService;

export default phoneAuthService;
