// Phone authentication service with Better Auth + Twilio
import { authClient } from '../../lib/auth-client';
import { sendVerificationCode, verifyPhoneNumber, formatPhoneNumber } from './twilio';
import { db } from '../../drizzle/db';
import { userContacts } from '../../drizzle/schema/users';
import { verificationCodes } from '../../drizzle/schema/verification';
import { eq, and } from 'drizzle-orm';
import {
  PhoneSignupStep1Data,
  PhoneSignupStep2Data,
  PhoneAuthResponse,
  OtpVerificationResult,
  UserCompletionStatus
} from '@/types/auth';

export class PhoneAuthService {
  /**
   * Step 1: Create user account with phone number and send verification
   */
  async signUpWithPhone(data: PhoneSignupStep1Data): Promise<PhoneAuthResponse> {
    try {
      // Format phone number
      const formattedPhone = formatPhoneNumber(data.phone, data.countryCode);

      // Create user with Better Auth (email/password)
      // Use phone as temporary email until real email is provided
      const { data: authData, error } = await authClient.signUp.email({
        email: `${formattedPhone.replace(/\+/g, '')}@temp.tenure.com`,
        password: data.password,
        name: 'User', // Will be updated in step 3
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

      if (authData?.user) {
        // Store phone number in user_contacts table
        await db.insert(userContacts).values({
          userId: authData.user.id,
          contactType: 'phone',
          contactValue: formattedPhone,
          isPrimary: true,
          isVerified: false
        });

        // Send verification code via Twilio
        const verificationResult = await sendVerificationCode(formattedPhone);
        
        if (!verificationResult.success) {
          return {
            success: false,
            error: {
              message: 'Failed to send verification code',
              code: 'VERIFICATION_SEND_FAILED',
              details: verificationResult.error
            }
          };
        }

        // Store verification code in database for tracking
        await db.insert(verificationCodes).values({
          userId: authData.user.id,
          phone: formattedPhone,
          code: 'TWILIO_MANAGED', // Twilio manages the actual code
          verified: false,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });
      }

      return {
        success: true,
        data: {
          user: authData?.user,
          session: authData?.token ? { 
            token: authData.token,
            user: authData.user 
          } : null
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Signup failed',
          code: 'SIGNUP_ERROR',
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
      const formattedPhone = formatPhoneNumber(phone, countryCode);

      // Send verification code directly using Twilio
      const verificationResult = await sendVerificationCode(formattedPhone);

      if (!verificationResult.success) {
        return {
          success: false,
          error: {
            message: verificationResult.error || 'Failed to send verification code',
            code: 'SEND_OTP_FAILED',
            details: verificationResult
          }
        };
      }

      return {
        success: true,
        data: {
          user: null,
          session: null
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Failed to send OTP',
          code: 'SEND_OTP_ERROR',
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
      // Verify code using Twilio
      const verificationResult = await verifyPhoneNumber(data.phone, data.otp);

      if (!verificationResult.success) {
        return {
          success: false,
          verified: false,
          error: {
            message: verificationResult.error || 'Invalid or expired code',
            code: 'INVALID_OTP',
            details: verificationResult
          }
        };
      }

      // Update verification status in database
      await db.update(verificationCodes)
        .set({ verified: true })
        .where(and(
          eq(verificationCodes.phone, data.phone),
          eq(verificationCodes.verified, false)
        ));

      // Update user_contacts to mark phone as verified
      await db.update(userContacts)
        .set({ isVerified: true })
        .where(and(
          eq(userContacts.contactValue, data.phone),
          eq(userContacts.contactType, 'phone')
        ));

      return {
        success: true
      };
    } catch (err: any) {
      return {
        success: false,
        verified: false,
        error: {
          message: err.message || 'Failed to verify OTP',
          code: 'VERIFY_OTP_ERROR',
          details: err
        }
      };
    }
  }

  /**
   * Get user completion status
   */
  async getUserCompletionStatus(): Promise<UserCompletionStatus> {
    try {
      // Get current session
      const session = await authClient.getSession();

      if (!session?.data?.user) {
        return {
          hasPhone: false,
          hasPassword: false,
          phoneVerified: false,
          hasPersonalInfo: false,
          hasEmail: false,
          emailVerified: false,
          canAccessDashboard: false,
          canMakePayments: false,
          currentStep: 1,
          hasTempEmail: false
        };
      }

      const user = session.data.user;

      // Check if user has phone number
      const phoneContact = await db.select()
        .from(userContacts)
        .where(and(
          eq(userContacts.userId, user.id),
          eq(userContacts.contactType, 'phone')
        ))
        .limit(1);

      const hasPhone = phoneContact.length > 0;
      const phoneVerified = phoneContact.length > 0 && phoneContact[0].isVerified;
      const hasTempEmail = user.email?.includes('@temp.tenure.com') || false;

      return {
        hasPhone,
        hasPassword: true, // User was created with password
        phoneVerified,
        hasPersonalInfo: !!(user.name && user.name !== 'User'),
        hasEmail: !!(user.email && !hasTempEmail),
        emailVerified: user.emailVerified,
        canAccessDashboard: phoneVerified && user.emailVerified,
        canMakePayments: phoneVerified && user.emailVerified,
        currentStep: phoneVerified ? (user.emailVerified ? 4 : 3) : 2,
        hasTempEmail
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
      const formattedPhone = formatPhoneNumber(phone, countryCode);

      // Find user by phone number in contacts table
      const phoneContact = await db.select()
        .from(userContacts)
        .where(and(
          eq(userContacts.contactValue, formattedPhone),
          eq(userContacts.contactType, 'phone')
        ))
        .limit(1);

      if (phoneContact.length === 0) {
        return {
          success: false,
          error: {
            message: 'Phone number not found',
            code: 'PHONE_NOT_FOUND'
          }
        };
      }

      // Get user's email for Better Auth login
      const session = await authClient.getSession();
      const userEmail = `${formattedPhone.replace(/\+/g, '')}@temp.tenure.com`;

      // Try to sign in with Better Auth
      const { data, error } = await authClient.signIn.email({
        email: userEmail,
        password
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message || 'Login failed',
            code: 'LOGIN_FAILED',
            details: error
          }
        };
      }

      return {
        success: true,
        data: {
          user: data?.user,
          session: data?.token ? { 
            token: data.token,
            user: data.user 
          } : null
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Unexpected error during login',
          code: 'LOGIN_ERROR',
          details: err
        }
      };
    }
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