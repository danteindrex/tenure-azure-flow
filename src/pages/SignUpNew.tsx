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
import { authClient, useSession } from "@/lib/auth-client";
import { logPageVisit, logSignup, logError } from "@/lib/audit";
import { COUNTRY_DIAL_CODES } from "@/lib/countryDialCodes";

const SignUpNew = () => {
  const navigate = useRouter();
  const { data: session, isPending } = useSession();
  const [step, setStep] = useState(1); // 1: Email+Password, 2: Email Verification, 3: Personal Info, 4: Advanced Security, 5: Payment
  const [formData, setFormData] = useState({
    // Step 1: Email + Password
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    // Step 2: Email Verification
    emailVerificationCode: "",
    // Step 3: Personal Info
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    // Step 4: Advanced Security
    enablePasskey: false,
    enable2FA: false,
  });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dateValidation, setDateValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Log page visit and check for existing session
  useEffect(() => {
    logPageVisit('/signup');
    
    // If user is already authenticated, redirect to auth callback to check status
    if (session?.user && !isPending) {
      navigate.push('/auth/callback');
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
    setFormData((prev) => ({ ...prev, emailVerificationCode: cleanValue }));

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
      setLoading(true);
      const email = formData.email.trim();

      // Create user with Better Auth
      const result = await authClient.signUp.email({
        email: email,
        password: formData.password,
        name: "User", // Temporary name, will be updated in step 3
      });

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
    if (!formData.emailVerificationCode || formData.emailVerificationCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    try {
      setLoading(true);

      // Verify email with Better Auth
      const result = await authClient.verifyEmail({
        email: formData.email.trim(),
        token: formData.emailVerificationCode
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

  // Step 3: Complete personal information
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

    if (!formData.streetAddress || !formData.city || !formData.state || !formData.zipCode) {
      toast.error("Please complete your address information");
      return;
    }

    try {
      setLoading(true);

      // Update user profile with Better Auth
      const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();
      
      const result = await authClient.updateUser({
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

      // Move to advanced security step
      setStep(4);
      toast.success("Profile completed! Let's set up advanced security features.");

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during profile completion";
      await logError(`Profile completion error: ${errorMessage}`, userId || undefined);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Advanced Security Setup
  const handleStep4Submit = async (): Promise<void> => {
    try {
      setLoading(true);

      // Set up passkey if enabled
      if (formData.enablePasskey) {
        try {
          const passkeyResult = await authClient.passkey.register({
            name: `${formData.firstName}'s Device`
          });

          if (passkeyResult.error) {
            toast.error("Failed to set up passkey, but continuing with signup");
          } else {
            toast.success("Passkey registered successfully!");
          }
        } catch (err) {
          console.error("Passkey registration error:", err);
          toast.error("Failed to set up passkey, but continuing with signup");
        }
      }

      // Set up 2FA if enabled
      if (formData.enable2FA) {
        try {
          const twoFactorResult = await authClient.twoFactor.enable();

          if (twoFactorResult.error) {
            toast.error("Failed to set up 2FA, but continuing with signup");
          } else {
            toast.success("Two-factor authentication enabled!");
          }
        } catch (err) {
          console.error("2FA setup error:", err);
          toast.error("Failed to set up 2FA, but continuing with signup");
        }
      }

      // Move to payment step
      setStep(5);
      toast.success("Security features configured! Please proceed to payment.");

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during security setup";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/signup/complete-profile`
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
                  className={`w-8 h-1 mx-1 transition-all duration-300 ${step > i ? "bg-accent" : "bg-border"
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

            <div className="flex justify-end mt-6">
              <Button
                onClick={handleStep1Submit}
                disabled={loading}
                className="bg-accent hover:bg-accent/90"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google Signup */}
            <Button
              variant="outline"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-accent hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}

        {/* Step 2: Email Verification */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
              <p className="text-muted-foreground">
                We sent a 6-digit code to <strong>{formData.email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailVerificationCode">Verification Code</Label>
                <Input
                  id="emailVerificationCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={formData.emailVerificationCode}
                  onChange={(e) => handleVerificationCodeChange(e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors text-center text-2xl tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-muted-foreground">
                  Check your email inbox and spam folder
                </p>
              </div>

              {autoSubmitting && (
                <div className="flex items-center justify-center gap-2 text-accent">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Verifying...</span>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading || autoSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={resendEmailVerification}
                  disabled={loading || autoSubmitting}
                  className="text-accent hover:text-accent/80"
                >
                  Resend Code
                </Button>
                <Button
                  onClick={handleEmailVerification}
                  disabled={loading || autoSubmitting || formData.emailVerificationCode.length !== 6}
                  className="bg-accent hover:bg-accent/90"
                >
                  {loading || autoSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  {loading || autoSubmitting ? "Verifying..." : "Verify Email"}
                </Button>
              </div>
            </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name (Optional)</Label>
                <Input
                  id="middleName"
                  type="text"
                  placeholder="Middle name"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange("middleName", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleDateOfBirthChange(e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
                {dateValidation && !dateValidation.isValid && (
                  <p className="text-xs text-destructive">{dateValidation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.phoneCountryCode}
                    onValueChange={(value) => handleInputChange("phoneCountryCode", value)}
                  >
                    <SelectTrigger className="w-24 bg-background/50 border-border focus:border-accent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_DIAL_CODES.map((country) => (
                        <SelectItem key={country.code} value={country.dialCode}>
                          {country.dialCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                    className="flex-1 bg-background/50 border-border focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  type="text"
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
                  type="text"
                  placeholder="Apt, suite, etc."
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
                    type="text"
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
                    type="text"
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
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                onClick={handleStep3Submit}
                disabled={loading}
                className="bg-accent hover:bg-accent/90"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                {loading ? "Saving..." : "Continue"}
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Advanced Security */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Advanced Security</h1>
              <p className="text-muted-foreground">Enhance your account security (optional)</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg">
                  <Fingerprint className="w-6 h-6 text-accent" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Passkey Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Use Face ID, Touch ID, or Windows Hello for secure login
                    </p>
                  </div>
                  <Checkbox
                    id="enablePasskey"
                    checked={formData.enablePasskey}
                    onCheckedChange={(checked: boolean) => handleInputChange("enablePasskey", checked)}
                  />
                </div>

                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg">
                  <Shield className="w-6 h-6 text-accent" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security with TOTP codes
                    </p>
                  </div>
                  <Checkbox
                    id="enable2FA"
                    checked={formData.enable2FA}
                    onCheckedChange={(checked: boolean) => handleInputChange("enable2FA", checked)}
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> These security features can be set up later in your account settings if you prefer to skip this step.
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(5)}
                  disabled={loading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleStep4Submit}
                  disabled={loading}
                  className="bg-accent hover:bg-accent/90"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Setting up..." : "Continue"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 5: Payment */}
        {step === 5 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Complete Your Membership</h1>
              <p className="text-muted-foreground">Choose your membership plan</p>
            </div>

            <div className="space-y-4">
              <div className="border border-accent rounded-lg p-6 bg-accent/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Premium Membership</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent">$29.99</div>
                    <div className="text-sm text-muted-foreground">per month</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    Full access to all features
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    Priority customer support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    Cancel anytime
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(4)}
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                onClick={handlePayment}
                disabled={loading}
                className="bg-accent hover:bg-accent/90"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                {loading ? "Processing..." : "Complete Signup"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SignUpNew;