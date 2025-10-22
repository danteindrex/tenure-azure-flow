import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { logPageVisit, logSignup, logError } from "@/lib/audit";
import { COUNTRY_DIAL_CODES } from "@/lib/countryDialCodes";

const SignUp = () => {
  const navigate = useRouter();
  const supabase = useSupabaseClient();
  const [step, setStep] = useState(1); // 1: Phone+Password, 2: OTP, 3: Personal Info, 4: Payment
  const [formData, setFormData] = useState({
    // Step 1: Phone + Password
    phoneCountryCode: "+1",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    // Step 2: OTP
    otpCode: "",
    // Step 3: Personal Info + Email
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    email: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
  });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dateValidation, setDateValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  
  // Universal bypass codes for phone verification
  const UNIVERSAL_BYPASS_CODES = ['123456', '000000', '111111', '999999'];
  const isDemoMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Log page visit and check for existing signup progress
  useEffect(() => {
    logPageVisit('/signup');
    checkSignupProgress();
  }, []);

  // Check if user is already signed in and has signup progress
  const checkSignupProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userData = session.user.user_metadata;
        
        // If user has signup progress, resume from appropriate step
        if (userData?.signup_step) {
          setUserId(session.user.id);
          
          // Populate form data from user metadata
          if (userData.phone) {
            const phoneMatch = userData.phone.match(/^(\+\d+)(.+)$/);
            if (phoneMatch) {
              setFormData(prev => ({
                ...prev,
                phoneCountryCode: phoneMatch[1],
                phoneNumber: formatPhoneForDisplay(phoneMatch[2])
              }));
            }
          }
          
          if (userData.first_name) {
            setFormData(prev => ({
              ...prev,
              firstName: userData.first_name,
              lastName: userData.last_name || '',
              middleName: userData.middle_name || '',
              dateOfBirth: userData.date_of_birth || '',
              email: userData.is_temp_email ? '' : session.user.email || '',
              streetAddress: userData.address?.street || '',
              addressLine2: userData.address?.line2 || '',
              city: userData.address?.city || '',
              state: userData.address?.state || '',
              zipCode: userData.address?.zip || '',
              country: userData.country_code || 'US'
            }));
          }
          
          // Resume from appropriate step
          const currentStep = userData.signup_step;
          if (currentStep === 1 && !userData.phone_verified) {
            setStep(2); // Go to phone verification
            toast.info("Continue your signup by verifying your phone number");
          } else if (currentStep === 2 && userData.phone_verified && !userData.profile_completed) {
            setStep(3); // Go to profile completion
            toast.info("Continue your signup by completing your profile");
          } else if (currentStep === 3 && userData.profile_completed && !session.user.email_confirmed_at) {
            setStep(4); // Go to email verification
            toast.info("Continue your signup by verifying your email");
          } else if (userData.profile_completed && session.user.email_confirmed_at) {
            setStep(5); // Go to payment
            toast.info("Complete your membership with payment");
          }
        }
      }
    } catch (error) {
      console.error('Error checking signup progress:', error);
    }
  };

  // Format phone number for display (US format: (555) 123-4567)
  const formatPhoneForDisplay = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 0) return '';
    if (cleanPhone.length <= 3) return cleanPhone;
    if (cleanPhone.length <= 6) return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3)}`;
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6, 10)}`;
  };

  // Format phone number with country code for API calls
  const formatPhoneNumber = (phone: string, countryCode: string): string => {
    const cleanPhone = getCleanPhoneNumber(phone);
    
    // For US numbers, ensure proper format
    if (countryCode === '+1') {
      if (cleanPhone.length === 10) {
        return `+1${cleanPhone}`;
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
        return `+${cleanPhone}`;
      } else if (cleanPhone.length > 0) {
        return `+1${cleanPhone}`;
      }
    }
    
    // For other countries
    const countryDigits = countryCode.replace('+', '');
    if (!cleanPhone.startsWith(countryDigits)) {
      return `${countryCode}${cleanPhone}`;
    }
    return `+${cleanPhone}`;
  };

  // Get clean phone number (digits only)
  const getCleanPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  // Validate US phone number
  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = getCleanPhoneNumber(phone);
    
    // US phone numbers should be exactly 10 digits (without country code)
    if (formData.phoneCountryCode === '+1') {
      return cleanPhone.length === 10;
    }
    
    // For other countries, minimum 10 digits
    return cleanPhone.length >= 10;
  };
  // US States data
  const usStates = [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
  ];
  const handleInputChange = (field: string, value: string | boolean): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Special handler for phone number input with formatting
  const handlePhoneInputChange = (value: string): void => {
    const cleanValue = value.replace(/\D/g, '');
    
    // Limit to 10 digits for US numbers
    if (formData.phoneCountryCode === '+1') {
      const limitedValue = cleanValue.slice(0, 10);
      const formattedValue = formatPhoneForDisplay(limitedValue);
      setFormData((prev) => ({ ...prev, phoneNumber: formattedValue }));
    } else {
      // For other countries, allow more digits
      const limitedValue = cleanValue.slice(0, 15);
      setFormData((prev) => ({ ...prev, phoneNumber: limitedValue }));
    }
  };

  // Special handler for OTP input with auto-submit
  const handleOtpInputChange = (value: string): void => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, otpCode: cleanValue }));
    
    // Auto-submit when 6 digits are entered
    if (cleanValue.length === 6 && step === 2 && !loading && !autoSubmitting) {
      setAutoSubmitting(true);
      setTimeout(() => {
        handleOtpVerification();
        setAutoSubmitting(false);
      }, 800); // Small delay to show the complete code before submitting
    }
  };

  // Age validation helper function
  const validateAge = (dateOfBirth: string): { isValid: boolean; message: string } => {
    if (!dateOfBirth) {
      return { isValid: false, message: "Date of birth is required" };
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    // Check if the date is in the future
    if (birthDate > today) {
      return { isValid: false, message: "Date of birth cannot be in the future" };
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    
    // Calculate exact age considering month and day
    const exactAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
    
    if (exactAge < 18) {
      return { 
        isValid: false, 
        message: `You are ${exactAge} years old. You must be at least 18 years old to create an account.` 
      };
    }

    return { isValid: true, message: "" };
  };

  // Handle date of birth change with validation
  const handleDateOfBirthChange = (value: string): void => {
    handleInputChange("dateOfBirth", value);
    
    // Validate and set validation state
    if (value) {
      const validation = validateAge(value);
      setDateValidation(validation);
    } else {
      setDateValidation(null);
    }
  };

  // Step 1: Create user with temporary email, phone, and password
  const handleStepTwo = async (): Promise<void> => {
    if (!formData.agreeToTerms) {
      toast.error("Please agree to Terms & Conditions");
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      const errorMessage = formData.phoneCountryCode === '+1' 
        ? "Please enter a valid 10-digit US phone number" 
        : "Please enter a valid phone number";
      toast.error(errorMessage);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode);
      
      // Create temporary email for account creation (will be updated in step 3)
      const tempEmail = `temp${Date.now()}${Math.random().toString(36).substr(2, 5)}@gmail.com`;

      // Create user with temporary email and phone information
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: formData.password,
        options: {
          data: {
            signup_step: 1,
            phone: formattedPhone,
            phone_country_code: formData.phoneCountryCode,
            terms_agreed: formData.agreeToTerms,
            signup_method: 'phone_first',
            phone_verified: false,
            profile_completed: false,
            is_temp_email: true
          }
        }
      });

      if (authError) {
        console.error("Account creation error:", authError);
        await logSignup(tempEmail, false);
        await logError(`Account creation failed: ${authError.message}`, undefined, {
          step: 'account_creation',
          phone: formattedPhone,
          error_code: authError.message,
        });
        
        let userMessage = "Failed to create account. Please try again.";
        if (authError.message.includes("Password should be at least")) {
          userMessage = "Password must be at least 6 characters long.";
        }
        
        toast.error(userMessage);
        return;
      }

      // Store user ID and proceed to phone verification
      setUserId(authData.user?.id || null);
      await logSignup(tempEmail, true, authData.user?.id);
      
      // Automatically send OTP for phone verification
      await sendOtpCode();
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during signup";
      await logError(`Unexpected signup error: ${errorMessage}`, undefined, { 
        step: 'account_creation',
        phone: formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode)
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };





  // Send OTP code (with bypass support)
  const sendOtpCode = async (): Promise<void> => {
    try {
      setOtpSent(true);
      setStep(2);
      
      if (isDemoMode) {
        // In demo mode, show bypass codes prominently
        toast.success(`Demo mode: Use bypass code ${UNIVERSAL_BYPASS_CODES[0]} to verify!`);
        return;
      }

      // Try to send real OTP (will fail if phone auth is disabled)
      const formattedPhone = formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            verification_type: 'phone_signup'
          }
        }
      });

      if (error) {
        // Phone auth is disabled, inform user about bypass codes
        toast.info(`Phone verification unavailable. Use bypass code: ${UNIVERSAL_BYPASS_CODES[0]}`);
        return;
      }

      toast.success("OTP sent to your phone! Please check your messages.");
      
    } catch (err: unknown) {
      // Fallback to bypass mode
      toast.info(`SMS unavailable. Use bypass code: ${UNIVERSAL_BYPASS_CODES[0]}`);
    }
  };

  // Verify OTP code (with universal bypass support)
  const handleOtpVerification = async (): Promise<void> => {
    if (!formData.otpCode || formData.otpCode.length !== 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }

    try {
      setLoading(true);

      // Check for universal bypass codes first (works in all environments)
      if (UNIVERSAL_BYPASS_CODES.includes(formData.otpCode)) {
        // Universal bypass - simulate successful verification
        setStep(3);
        toast.success("Phone verified successfully! Please complete your profile.");
        
        // Update user metadata to mark phone as verified (if user exists)
        if (userId) {
          try {
            await supabase.auth.updateUser({
              data: {
                phone_verified: true,
                phone_verified_via: 'bypass_code',
                signup_step: 2,
                phone_verified_at: new Date().toISOString()
              }
            });
          } catch (updateError) {
            console.warn('Failed to update user metadata:', updateError);
          }
        }
        return;
      }

      // Real OTP verification (if phone auth gets enabled)
      const formattedPhone = formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode);

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: formData.otpCode,
        type: 'sms'
      });

      if (error) {
        // Provide helpful error message with bypass hint
        const errorMsg = isDemoMode 
          ? `OTP verification failed. Try using a bypass code: ${UNIVERSAL_BYPASS_CODES[0]}`
          : `OTP verification failed: ${error.message}`;
        toast.error(errorMsg);
        return;
      }

      // Update user metadata to mark phone as verified
      if (data.user) {
        await supabase.auth.updateUser({
          data: {
            phone_verified: true,
            phone_verified_via: 'real_otp',
            signup_step: 2,
            phone_verified_at: new Date().toISOString()
          }
        });
      }

      setUserId(data.user?.id || null);
      setStep(3);
      toast.success("Phone verified successfully! Please complete your profile.");
      
    } catch (err: unknown) {
      const errorMsg = isDemoMode 
        ? `Verification failed. Try bypass code: ${UNIVERSAL_BYPASS_CODES[0]}`
        : "OTP verification failed";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete personal information and update user with real email
  const handleFinalSubmit = async (): Promise<void> => {
    const email = formData.email.trim();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      toast.error("Please enter your first and last name");
      return;
    }

    if (!formData.streetAddress || !formData.city || !formData.state || !formData.zipCode) {
      toast.error("Please complete your address information");
      return;
    }
    
    try {
      setLoading(true);

      // Update the existing user with real email and profile information
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email: email,
        data: {
          signup_step: 3,
          profile_completed: true,
          full_name: `${formData.firstName} ${formData.middleName} ${formData.lastName}`.trim(),
          first_name: formData.firstName,
          last_name: formData.lastName,
          middle_name: formData.middleName,
          date_of_birth: formData.dateOfBirth,
          phone: formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode),
          phone_verified: true, // Mark as verified from previous step
          address: {
            street: formData.streetAddress,
            line2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            zip: formData.zipCode,
          },
          country_code: formData.country,
          signup_method: 'phone_first_with_email',
          is_temp_email: false
        }
      });

      if (updateError) {
        await logError(`Profile update failed: ${updateError.message}`, userId || undefined, { email });
        
        // Handle specific error cases
        if (updateError.message.includes("User already registered")) {
          toast.error("An account with this email already exists. Please use a different email.");
        } else {
          toast.error(`Failed to update profile: ${updateError.message}`);
        }
        return;
      }

      // Move to email verification step
      setStep(4);
      toast.success("Profile completed! Please check your email to verify your account.");
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during profile completion";
      await logError(`Profile completion error: ${errorMessage}`, userId || undefined, {
        step: 'profile_completion',
        email: formData.email.trim()
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Payment (after email verification)
  const handlePayment = async (): Promise<void> => {
    try {
      setLoading(true);

      // Create Stripe checkout session
      const checkoutResp = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!checkoutResp.ok) {
        let msg = "Failed to create payment session";
        try {
          const data = await checkoutResp.json();
          if (data?.error) msg = data.error;
        } catch (parseError) {
          console.error('Failed to parse checkout error response:', parseError);
        }
        
        toast.error(msg);
        return;
      }

      const checkoutData = await checkoutResp.json();

      if (checkoutData.success && checkoutData.checkoutUrl) {
        toast.success("Redirecting to payment...");
        // Redirect to Stripe checkout
        window.location.href = checkoutData.checkoutUrl;
      } else {
        toast.error("Failed to initialize payment. Please try again.");
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during payment setup";
      await logError(`Payment initialization error: ${errorMessage}`, userId || undefined, {
        email: formData.email.trim()
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (): Promise<void> => {
    try {
      setLoading(true);

      // Log Google signup attempt
      await logSignup("google_oauth", false);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/signup/complete-profile`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) {
        await logSignup("google_oauth", false);
        await logError(`Google signup failed: ${error.message}`, undefined, {
          provider: 'google',
          error_code: error.message
        });
        toast.error("Google signup failed");
        return;
      }

      // Log successful Google signup attempt (will be completed after redirect)
      await logSignup("google_oauth", true);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Google signup failed";
      await logError(`Google signup error: ${errorMessage}`, undefined, {
        provider: 'google'
      });
      toast.error("Google signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="glass-card w-full max-w-lg p-8 hover-float relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 text-accent">
            <Crown className="w-8 h-8" />
            <span className="text-2xl font-bold">Tenure</span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= i
                  ? "bg-accent text-background"
                  : "bg-card border border-border text-muted-foreground"
                  }`}
              >
                {step > i ? <Check className="w-5 h-5" /> : i}
              </div>
              {i < 5 && (
                <div
                  className={`w-12 h-1 mx-1 transition-all duration-300 ${step > i ? "bg-accent" : "bg-border"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Phone + Password */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
              <p className="text-muted-foreground">Enter your phone number and create a password</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.phoneCountryCode}
                    onValueChange={(value) => {
                      handleInputChange("phoneCountryCode", value);
                      // Reset phone number format when country changes
                      if (formData.phoneNumber) {
                        const cleanPhone = getCleanPhoneNumber(formData.phoneNumber);
                        if (value === '+1') {
                          setFormData(prev => ({ ...prev, phoneNumber: formatPhoneForDisplay(cleanPhone) }));
                        } else {
                          setFormData(prev => ({ ...prev, phoneNumber: cleanPhone }));
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-24 bg-background/50 border-border focus:border-accent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_DIAL_CODES.map((dialCode) => (
                        <SelectItem key={dialCode} value={dialCode}>
                          {dialCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder={formData.phoneCountryCode === '+1' ? '(555) 123-4567' : 'Enter phone number'}
                    value={formData.phoneNumber}
                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                    className="flex-1 bg-background/50 border-border focus:border-accent transition-colors"
                    maxLength={formData.phoneCountryCode === '+1' ? 14 : 20}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.phoneCountryCode === '+1' 
                    ? "Enter your 10-digit US phone number. We'll send you a verification code." 
                    : "We'll send you a verification code to confirm your number"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked: boolean) => handleInputChange("agreeToTerms", checked)}
                />
                <Label htmlFor="agreeToTerms" className="text-sm">
                  I agree to the{" "}
                  <a href="#" className="text-accent hover:underline">
                    Terms & Conditions
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-accent hover:underline">
                    Privacy Policy
                  </a>
                </Label>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={handleStepTwo}
                disabled={loading || !formData.phoneNumber || !formData.password || !formData.confirmPassword || !formData.agreeToTerms}
                className="bg-primary hover:glow-blue-lg px-8 py-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Email Verification */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
              <p className="text-muted-foreground">
                We sent a verification link to {formData.email}
              </p>
            </div>

            <div className="space-y-6">
              <div className="text-center p-6 bg-background/50 rounded-lg border">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Email Sent!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We've sent a verification link to:<br />
                  <span className="font-medium text-foreground">{formData.email}</span>
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Check your email inbox (and spam folder)</p>
                  <p>2. Click the verification link</p>
                  <p>3. Return here to continue to payment</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="w-full"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Profile
                </Button>
                <Button 
                  onClick={() => setStep(5)} 
                  className="w-full bg-primary hover:glow-blue-lg" 
                  size="lg"
                >
                  I've Verified My Email
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Phone Verification */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Verify Your Phone</h1>
              <p className="text-muted-foreground">
                Enter the verification code for {formData.phoneCountryCode} {formData.phoneNumber}
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (formData.otpCode.length === 6) {
                handleOtpVerification();
              }
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otpCode">Verification Code *</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    value={formData.otpCode}
                    onChange={(e) => handleOtpInputChange(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const otpCode = pastedText.replace(/\D/g, '').slice(0, 6);
                      handleOtpInputChange(otpCode);
                    }}
                    className={`text-center text-2xl tracking-widest bg-background/50 border-border focus:border-accent transition-colors ${
                      autoSubmitting ? 'border-green-500 bg-green-50' : ''
                    }`}
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    required
                    autoFocus
                    disabled={autoSubmitting}
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    {autoSubmitting ? (
                      <p>Verifying code...</p>
                    ) : (
                      <>
                        <p>Enter the 6-digit code sent to your phone</p>
                        <p className="text-accent font-medium">
                          💡 Bypass codes: {UNIVERSAL_BYPASS_CODES.join(', ')}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendOtpCode}
                    disabled={loading}
                    className="text-accent"
                  >
                    Resend Code
                  </Button>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="px-8 py-2"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || autoSubmitting || !formData.otpCode || formData.otpCode.length !== 6}
                  className="bg-primary hover:glow-blue-lg px-8 py-2"
                  size="lg"
                >
                  {loading || autoSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Phone
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Personal Information */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
              <p className="text-muted-foreground">Tell us about yourself</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    placeholder="Michael"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange("middleName", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleDateOfBirthChange(e.target.value)}
                  className={`bg-background/50 border-border focus:border-accent transition-colors ${
                    dateValidation && !dateValidation.isValid 
                      ? 'border-red-500 focus:border-red-500' 
                      : dateValidation && dateValidation.isValid 
                        ? 'border-green-500 focus:border-green-500' 
                        : ''
                  }`}
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                />
                {dateValidation && !dateValidation.isValid ? (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {dateValidation.message}
                  </p>
                ) : dateValidation && dateValidation.isValid ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Age verified - you are eligible to create an account
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You must be at least 18 years old to create an account
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  placeholder="123 Main St"
                  value={formData.streetAddress}
                  onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                <Input
                  id="addressLine2"
                  placeholder="Apt, Suite, Unit, etc."
                  value={formData.addressLine2}
                  onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleInputChange("state", value)}
                  >
                    <SelectTrigger className="bg-background/50 border-border focus:border-accent">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {usStates.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    placeholder="10001"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange("zipCode", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="px-8 py-2"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={loading || !formData.firstName || !formData.lastName || !formData.email || !formData.streetAddress || !formData.city || !formData.state || !formData.zipCode || (dateValidation && !dateValidation.isValid)}
                className="bg-primary hover:glow-blue-lg px-8 py-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    Complete Profile
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 5: Payment */}
        {step === 5 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Complete Your Membership</h1>
              <p className="text-muted-foreground">Choose your payment plan to join the queue</p>
            </div>

            <div className="space-y-6">
              <Card className="p-6 border-2 border-accent glow-blue">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-muted-foreground">Initial Payment</p>
                    <p className="text-4xl font-bold text-accent">$300</p>
                    <p className="text-sm text-muted-foreground">Includes first month</p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-muted-foreground">Then Monthly</p>
                    <p className="text-2xl font-semibold text-foreground">$25</p>
                    <p className="text-sm text-muted-foreground">Starting month 2</p>
                  </div>
                </div>
              </Card>

              <div className="space-y-4 p-4 bg-background/50 rounded-lg border">
                <h3 className="font-semibold text-foreground">What happens next:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    You'll be redirected to our secure payment processor
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    Enter your payment information safely
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    Your membership will be activated immediately
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    You'll be added to the membership queue
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Next Steps:</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your account has been created! To complete your membership, you'll need to:
                </p>
                <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                  <li>Start the subscription service</li>
                  <li>Connect the payment integration</li>
                  <li>Complete the Stripe checkout flow</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(4)}
                  className="w-full"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-accent text-background hover:glow-blue-lg"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Proceed to Payment"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {/* Google Signup */}
        <Button
          variant="glass"
          className="w-full mb-6"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "Signing up..." : "Continue with Google"}
        </Button>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Back to Login
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default SignUp;
