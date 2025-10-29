import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, Check, ChevronRight, ChevronLeft, Loader2, Mail, Phone, Fingerprint, Shield } from "lucide-react";
import { toast } from "sonner";
import { authClient, useSession, signUp, updateUser, signIn } from "@/lib/auth-client";
import { logPageVisit, logSignup, logError } from "@/lib/audit";
import { COUNTRY_DIAL_CODES } from "@/lib/countryDialCodes";
import baseLogger from "@/lib/baseLogger";

const SignUp = () => {
  const navigate = useRouter();
  const { data: session, isPending } = useSession();
  const [step, setStep] = useState(1); // 1: Email+Password, 2: Email Verification, 3: Personal Info + Address, 4: Phone Verification, 5: Payment
  const [formData, setFormData] = useState({
    // Step 1: Email + Password
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    // Step 2: Email Verification
    emailOtpCode: "",
    // Step 3: Personal Info + Phone
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    phoneCountryCode: "+256", // Default to Uganda
    phoneNumber: "",
    phoneOtpCode: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "UG", // Default to Uganda
  });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dateValidation, setDateValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Log page visit and check for existing session
  useEffect(() => {
    logPageVisit('/signup');
    
    // Check URL parameters for step and OAuth info
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get('step');
    const oauthParam = urlParams.get('oauth');
    
    if (stepParam) {
      const stepNumber = parseInt(stepParam, 10);
      // Handle legacy step 5 users by redirecting to step 3 (merged step)
      if (stepNumber === 5) {
        setStep(3);
      } else if (stepNumber >= 1 && stepNumber <= 5) {
        setStep(stepNumber);
      }
    }

    // If OAuth user, pre-fill data from session
    if (oauthParam && session?.user) {
      const fullName = session.user.name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts[nameParts.length - 1] || "";
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

      setFormData(prev => ({
        ...prev,
        email: session.user.email || "",
        firstName,
        lastName,
        middleName,
      }));
    }
    
    // If user is already authenticated and no step specified, check their status
    if (session?.user && !isPending && !stepParam) {
      // Check onboarding status via API
      fetch('/api/onboarding/status', {
        method: 'GET',
        credentials: 'include'
      })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.status) {
            if (data.status.canAccessDashboard) {
              navigate.push('/dashboard');
            } else {
              // Redirect to appropriate step
              if (data.status.nextRoute !== '/signup') {
                navigate.push(data.status.nextRoute);
              }
            }
          }
        })
        .catch(error => {
          console.error('Error checking onboarding status:', error);
        });
    }
  }, [session, isPending, navigate]);

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

  // Special handler for verification code input with auto-submit
  const handleVerificationCodeChange = (value: string): void => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, emailOtpCode: cleanValue }));

    // Auto-submit when 6 digits are entered
    if (cleanValue.length === 6 && !loading && !autoSubmitting) {
      setAutoSubmitting(true);
      setTimeout(() => {
        if (step === 2) {
          handleEmailVerification();
        }
        setAutoSubmitting(false);
      }, 800); // Small delay to show the complete code before submitting
    }
  };

  // Generic OTP input handler for both email and phone verification
  const handleOtpInputChange = (field: string, value: string): void => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, [field]: cleanValue }));

    // Auto-submit when 6 digits are entered
    if (cleanValue.length === 6 && !loading && !autoSubmitting) {
      setAutoSubmitting(true);
      setTimeout(() => {
        if (field === 'emailOtpCode' && step === 2) {
          handleEmailVerification();
        } else if (field === 'phoneOtpCode' && step === 4) {
          handlePhoneOtpVerification();
        }
        setAutoSubmitting(false);
      }, 800);
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

  // Step 1: Create user with email and password using Better Auth
  const handleStep1Submit = async (): Promise<void> => {
    if (!formData.agreeToTerms) {
      toast.error("Please agree to Terms & Conditions");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Please enter your email address");
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

      console.log("The current formdata extracted from the form",formData)
      setLoading(true);
      const email = formData.email.trim();
      const username = `${formData.firstName} ${formData.lastName}`
      baseLogger("authentication","WillCreateAccount");


      const currentProviededEmail = formData.email;
      const currentProvidedPassword = formData.password

      // Create user with Better Auth
      const result = await signUp.email({
        email: currentProviededEmail,
        password: currentProvidedPassword,
        name: "User", // Temporary name, will be updated in step 3
      });

      console.log("The current credentials",result.data)
      baseLogger("authentication","DidCreateAccount")

      if (result.error) {
        console.error("Account creation error:", result.error);
        await logSignup(email, false);
        await logError(`Account creation failed: ${result.error.message}`, undefined, {
          step: 'account_creation',
          email: email,
          error_code: result.error.message,
        });

        let userMessage = "Failed to create account. Please try again.";
        if (result.error.message.includes("already exists")) {
          userMessage = "An account with this email already exists. Please login instead.";
        }

        toast.error(userMessage);
        return;
      }

      // Store user ID and proceed to email verification
      setUserId(result.data?.user?.id || null);
      await logSignup(email, true, result.data?.user?.id);

      // Move to email verification step
      setStep(2);
      toast.success("Account created! Please check your email for verification.");

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during signup";
      await logError(`Unexpected signup error: ${errorMessage}`, undefined, {
        step: 'account_creation',
        email: formData.email.trim()
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle email verification
  const handleEmailVerification = async (): Promise<void> => {
    if (!formData.emailOtpCode || formData.emailOtpCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    try {
      setLoading(true);

      // Verify email with Better Auth
      const result = await authClient.verifyEmail({
        email: formData.email.trim(),
        token: formData.emailOtpCode
      });

      if (result.error) {
        console.error('Email verification error:', result.error);
        toast.error(`Verification failed: ${result.error.message}`);
        return;
      }

      setStep(3);
      toast.success("Email verified successfully! Please complete your profile.");

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Email verification failed";
      console.error('Email verification error:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Resend email verification
  const resendEmailVerification = async (): Promise<void> => {
    try {
      setLoading(true);

      const result = await authClient.sendVerificationEmail({
        email: formData.email.trim()
      });

      if (result.error) {
        toast.error("Failed to resend verification email");
        return;
      }

      toast.success("Verification email sent! Please check your inbox.");
    } catch (err) {
      toast.error("Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Collect personal info, address, and phone number
  const handleStep3Submit = async (): Promise<void> => {
    if (!formData.firstName || !formData.lastName) {
      toast.error("Please enter your first and last name");
      return;
    }

    if (!formData.dateOfBirth) {
      toast.error("Please enter your date of birth");
      return;
    }

    if (dateValidation && !dateValidation.isValid) {
      toast.error(dateValidation.message);
      return;
    }

    if (!formData.streetAddress || !formData.city || !formData.zipCode) {
      toast.error("Please complete your address information");
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      const errorMessage = formData.phoneCountryCode === '+256'
        ? "Please enter a valid Ugandan phone number"
        : "Please enter a valid phone number";
      toast.error(errorMessage);
      return;
    }

    try {
      setLoading(true);
      
      // Send phone OTP via Twilio
      await sendPhoneOtp();

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send verification code";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Send Phone OTP code
  const sendPhoneOtp = async (): Promise<void> => {
    try {
      const formattedPhone = formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode);

      // Send verification code via Twilio
      const response = await fetch('/api/verify/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: formattedPhone,
          countryCode: formData.phoneCountryCode
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Phone OTP error:', result.error);
        toast.error(`Failed to send verification code: ${result.error}`);
        setStep(3); // Go back to step 3
        return;
      }

      // Move to phone verification step
      setStep(4);

      toast.success("Verification code sent to your phone! Please check your messages.");

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send verification code";
      toast.error(errorMessage);
      setStep(3); // Go back to step 3
    }
  };

  // Verify Phone OTP code
  const handlePhoneOtpVerification = async (): Promise<void> => {
    if (!formData.phoneOtpCode || formData.phoneOtpCode.length !== 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }

    try {
      setLoading(true);

      // Verify OTP via Twilio
      const formattedPhone = formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode);

      const response = await fetch('/api/verify/check-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: formattedPhone,
          code: formData.phoneOtpCode
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Phone OTP verification error:', result.error);
        toast.error(`OTP verification failed: ${result.error}`);
        return;
      }

      // Phone is now verified, save profile and move to payment
      await saveCompleteProfile();
      setStep(5);
      toast.success("Phone verified successfully! Please proceed to payment.");

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "OTP verification failed";
      console.error('Phone verification error:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Save complete profile after phone verification
  const saveCompleteProfile = async (): Promise<void> => {
    try {
      // Update user profile with Better Auth
      const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();
      
      const result = await updateUser({
        name: fullName,
        // Store additional profile data in user metadata
        metadata: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          dateOfBirth: formData.dateOfBirth,
          phone: formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode),
          streetAddress: formData.streetAddress,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          profileCompleted: true
        }
      });

      if (result.error) {
        toast.error("Failed to save profile information");
        return;
      }

      // Also save to normalized tables via API
      await fetch("/api/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          middle_name: formData.middleName,
          date_of_birth: formData.dateOfBirth,
          phone: formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode),
          street_address: formData.streetAddress,
          address_line_2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country_code: formData.country,
        }),
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during profile completion";
      await logError(`Profile completion error: ${errorMessage}`, userId || undefined);
      throw new Error(errorMessage);
    }
  };

  // Step 5: Payment
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
        window.location.href = checkoutData.checkoutUrl;
      } else {
        toast.error("Failed to initialize payment. Please try again.");
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during payment setup";
      await logError(`Payment initialization error: ${errorMessage}`, userId || undefined);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (): Promise<void> => {
    try {
      setLoading(true);

      await logSignup("google_oauth", false);

      // Use Better Auth for Google OAuth
      const result = await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/signup?step=3&oauth=google`
      });

      if (result.error) {
        await logSignup("google_oauth", false);
        await logError(`Google signup failed: ${result.error.message}`, undefined, {
          provider: 'google',
          error_code: result.error.message
        });
        toast.error("Google signup failed");
        return;
      }

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
        <div className="flex items-center justify-center gap-1 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= i
                  ? "bg-accent text-background"
                  : "bg-card border border-border text-muted-foreground"
                  }`}
              >
                {step > i ? <Check className="w-4 h-4" /> : i}
              </div>
              {i < 5 && (
                <div
                  className={`w-6 h-1 mx-1 transition-all duration-300 ${step > i ? "bg-accent" : "bg-border"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Email + Password */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
              <p className="text-muted-foreground">Enter your email and create a password</p>
            </div>

            <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  We'll send you a verification code to confirm your email
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

            <div className="flex justify-center mt-6">
              <Button
                onClick={handleStep1Submit}
                disabled={loading || !formData.email || !formData.password || !formData.confirmPassword || !formData.agreeToTerms}
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

        {/* Step 2: Email OTP Verification */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
              <p className="text-muted-foreground">
                Enter the verification code sent to<br />
                <span className="font-medium text-foreground">{formData.email}</span>
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (formData.emailOtpCode.length === 6) {
                handleEmailVerification();
              }
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailOtpCode">Verification Code *</Label>
                  <Input
                    id="emailOtpCode"
                    type="text"
                    value={formData.emailOtpCode}
                    onChange={(e) => handleOtpInputChange('emailOtpCode', e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const otpCode = pastedText.replace(/\D/g, '').slice(0, 6);
                      handleOtpInputChange('emailOtpCode', otpCode);
                    }}
                    className={`text-center text-2xl tracking-widest bg-background/50 border-border focus:border-accent transition-colors ${
                      autoSubmitting ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''
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
                      <p className="text-green-600 dark:text-green-400">Verifying code...</p>
                    ) : (
                      <p>Enter the 6-digit code from your email</p>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resendEmailVerification}
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
                  disabled={loading || autoSubmitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || autoSubmitting || !formData.emailOtpCode || formData.emailOtpCode.length !== 6}
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
                      Verify Email
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Personal Information & Address */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
              <p className="text-muted-foreground">
                {new URLSearchParams(window.location.search).get('oauth') 
                  ? "Complete your profile to continue" 
                  : "Tell us about yourself and your address"
                }
              </p>
              {new URLSearchParams(window.location.search).get('oauth') && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <Check className="w-4 h-4" />
                  Email verified via {new URLSearchParams(window.location.search).get('oauth')}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Personal Information Section */}
              <div className="space-y-4 p-4 bg-background/30 rounded-lg border">
                <h3 className="font-semibold text-foreground">Personal Information</h3>
                
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
                  {dateValidation && (
                    <p className={`text-xs ${dateValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {dateValidation.message || 'Age verified: You are eligible to join'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.phoneCountryCode}
                      onValueChange={(value) => {
                        handleInputChange("phoneCountryCode", value);
                        if (formData.phoneNumber) {
                          const cleanPhone = getCleanPhoneNumber(formData.phoneNumber);
                          if (value === '+256') {
                            setFormData(prev => ({ ...prev, phoneNumber: cleanPhone }));
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
                      placeholder={formData.phoneCountryCode === '+256' ? '745315809' : 'Enter phone number'}
                      value={formData.phoneNumber}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      className="flex-1 bg-background/50 border-border focus:border-accent transition-colors"
                      maxLength={20}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you a verification code to confirm your number
                  </p>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="space-y-4 p-4 bg-background/30 rounded-lg border">
                <h3 className="font-semibold text-foreground">Address Information</h3>
                
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
            </div>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="px-8 py-2"
                disabled={loading}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleStep3Submit}
                disabled={loading || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.phoneNumber || !validatePhoneNumber(formData.phoneNumber) || !formData.streetAddress || !formData.city || !formData.zipCode || (dateValidation && !dateValidation.isValid)}
                className="bg-primary hover:glow-blue-lg px-8 py-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Phone OTP Verification */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verify Your Phone</h1>
              <p className="text-muted-foreground">
                Enter the code sent to<br />
                <span className="font-medium text-foreground">{formData.phoneCountryCode} {formData.phoneNumber}</span>
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (formData.phoneOtpCode.length === 6) {
                handlePhoneOtpVerification();
              }
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneOtpCode">Verification Code *</Label>
                  <Input
                    id="phoneOtpCode"
                    type="text"
                    value={formData.phoneOtpCode}
                    onChange={(e) => handleOtpInputChange('phoneOtpCode', e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const otpCode = pastedText.replace(/\D/g, '').slice(0, 6);
                      handleOtpInputChange('phoneOtpCode', otpCode);
                    }}
                    className={`text-center text-2xl tracking-widest bg-background/50 border-border focus:border-accent transition-colors ${
                      autoSubmitting ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''
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
                      <p className="text-green-600 dark:text-green-400">Verifying code...</p>
                    ) : (
                      <p>Enter the 6-digit code from your phone</p>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendPhoneOtp}
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
                  onClick={() => setStep(3)}
                  className="px-8 py-2"
                  disabled={loading || autoSubmitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || autoSubmitting || !formData.phoneOtpCode || formData.phoneOtpCode.length !== 6}
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

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(4)}
                  className="w-full"
                  disabled={loading}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
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
        {step === 1 && (
          <>
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
          </>
        )}

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
