// Phone authentication service with TypeScript support
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  PhoneSignupStep1Data, 
  PhoneSignupStep2Data, 
  PhoneAuthResponse, 
  OtpVerificationResult,
  UserCompletionStatus,
  AuthError 
} from '@/types/auth';

export class PhoneAuthService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Step 1: Create user account with phone and password
   */
  async signUpWithPhone(data: PhoneSignupStep1Data): Promise<PhoneAuthResponse> {
    try {
      // Validate phone number format
      const formattedPhone = this.formatPhoneNumber(data.phone, data.countryCode);
      
      // Create user with phone and password
      const { data: authData, error } = await this.supabase.auth.signUp({
        phone: formattedPhone,
        password: data.password,
        options: {
          data: {
            signup_step: 1,
            phone_country_code: data.countryCode,
            terms_agreed: data.agreeToTerms,
            signup_method: 'phone_first'
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error
          }
        };
      }

      return {
        success: true,
        data: {
          user: authData.user,
          session: authData.session
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
   * Step 2: Send OTP to phone number
   */
  async sendOtp(phone: string, countryCode: string): Promise<PhoneAuthResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone, countryCode);
      
      const { data, error } = await this.supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            verification_type: 'phone_signup'
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error
          }
        };
      }

      return {
        success: true,
        data
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
   * Step 2: Verify OTP code
   */
  async verifyOtp(data: PhoneSignupStep2Data): Promise<OtpVerificationResult> {
    try {
      const { data: authData, error } = await this.supabase.auth.verifyOtp({
        phone: data.phone,
        token: data.otp,
        type: 'sms'
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error
          }
        };
      }

      // Update user metadata to mark phone as verified
      if (authData.user) {
        await this.supabase.auth.updateUser({
          data: {
            phone_verified: true,
            signup_step: 2,
            phone_verified_at: new Date().toISOString()
          }
        });
      }

      return {
        success: true,
        session: authData.session,
        user: authData.user
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'OTP verification failed',
          details: err
        }
      };
    }
  }

  /**
   * Check user completion status
   */
  async getUserCompletionStatus(userId: string): Promise<UserCompletionStatus> {
    try {
      // Get user from auth
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get user profile data
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select(`
          *,
          user_profiles(*),
          user_contacts(*),
          user_addresses(*)
        `)
        .eq('auth_user_id', userId)
        .single();

      const metadata = user.user_metadata || {};
      const hasProfile = userData?.user_profiles?.length > 0;
      const hasEmail = userData?.email && userData.email_verified;
      const hasAddress = userData?.user_addresses?.length > 0;

      return {
        hasPhone: !!user.phone,
        hasPassword: true, // If they're authenticated, they have a password
        phoneVerified: !!metadata.phone_verified || !!user.phone_confirmed_at,
        hasPersonalInfo: hasProfile && hasAddress,
        hasEmail: !!hasEmail,
        emailVerified: !!userData?.email_verified,
        canAccessDashboard: !!metadata.phone_verified,
        canMakePayments: hasProfile && hasEmail && !!metadata.phone_verified
      };
    } catch (err: any) {
      // Return default status if error
      return {
        hasPhone: false,
        hasPassword: false,
        phoneVerified: false,
        hasPersonalInfo: false,
        hasEmail: false,
        emailVerified: false,
        canAccessDashboard: false,
        canMakePayments: false
      };
    }
  }

  /**
   * Sign in existing user with phone and password
   */
  async signInWithPhone(phone: string, password: string, countryCode: string): Promise<PhoneAuthResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone, countryCode);
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: password
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error
          }
        };
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Sign in failed',
          details: err
        }
      };
    }
  }

  /**
   * Format phone number with country code
   */
  private formatPhoneNumber(phone: string, countryCode: string): string {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (!cleanPhone.startsWith(countryCode.replace('+', ''))) {
      return `${countryCode}${cleanPhone}`;
    }
    
    return `+${cleanPhone}`;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string, countryCode: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Basic validation - at least 10 digits
    if (cleanPhone.length < 10) {
      return false;
    }
    
    // Country-specific validation can be added here
    return true;
  }

  /**
   * Get current user session
   */
  async getCurrentSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    return { session, error };
  }

  /**
   * Sign out user
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }
}

// Export singleton instance
export const createPhoneAuthService = (supabaseClient: SupabaseClient) => {
  return new PhoneAuthService(supabaseClient);
};