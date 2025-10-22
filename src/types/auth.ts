// TypeScript types for phone-first authentication flow

export interface PhoneSignupStep1Data {
  phone: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  agreeToTerms: boolean;
}

export interface PhoneSignupStep2Data {
  otp: string;
  phone: string;
}

export interface PhoneSignupStep3Data {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  email: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SignupProgress {
  step: 1 | 2 | 3 | 4;
  phoneVerified: boolean;
  emailVerified: boolean;
  profileCompleted: boolean;
  userId?: string;
  phone?: string;
  email?: string;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: any;
}

export interface OtpVerificationResult {
  success: boolean;
  session?: any;
  user?: any;
  error?: AuthError;
}

export interface PhoneAuthResponse {
  success: boolean;
  data?: {
    user: any;
    session: any;
  };
  error?: AuthError;
}

// Supabase Auth types for phone authentication
export interface SupabasePhoneSignInOptions {
  phone: string;
  password?: string;
  options?: {
    captchaToken?: string;
    data?: Record<string, any>;
  };
}

export interface SupabaseOtpVerificationOptions {
  phone: string;
  token: string;
  type: 'sms' | 'phone_change';
  options?: {
    captchaToken?: string;
  };
}

// User completion status tracking
export interface UserCompletionStatus {
  hasPhone: boolean;
  hasPassword: boolean;
  phoneVerified: boolean;
  hasPersonalInfo: boolean;
  hasEmail: boolean;
  emailVerified: boolean;
  canAccessDashboard: boolean;
  canMakePayments: boolean;
}