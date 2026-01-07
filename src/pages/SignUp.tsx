import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, Check, ChevronRight, ChevronLeft, Loader2, Mail, Phone, Fingerprint, Shield, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { authClient, useSession, signUp, updateUser, signIn, signOut } from "@/lib/auth-client";
import { logPageVisit, logSignup, logError } from "@/lib/audit";
import { useDialCodes, useStateOptions, useCountries } from "@/hooks/useGeoData";
import baseLogger from "@/lib/baseLogger";
import { useTheme } from "@/contexts/ThemeContext";
import { TermsModal } from "@/components/TermsModal";
import { PrivacyModal } from "@/components/PrivacyModal";
import { BeamsBackground } from "@/components/ui/beams-background";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

const SignUp = () => {
  const navigate = useRouter();
  const { data: session, isPending, refetch: refetchSession } = useSession();
  const { theme, setTheme, actualTheme } = useTheme();

  // Always initialize to 1 to prevent hydration mismatch (server vs client)
  // URL step will be synced in useEffect after hydration
  const [step, setStep] = useState(1); // 1: Email+Password, 2: Email Verification, 3: Personal Info + Address, 4: Phone Verification
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false); // Track if user signed up via OAuth

  // Sync step from URL after hydration to prevent SSR mismatch
  useEffect(() => {
    setIsHydrated(true);
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get('step');
    const oauthParam = urlParams.get('oauth');

    if (oauthParam) {
      setIsOAuthUser(true);
    }

    if (stepParam) {
      const stepNumber = parseInt(stepParam, 10);
      if (stepNumber >= 1 && stepNumber <= 4) {
        setStep(stepNumber);
      }
    }
  }, []);
  const [isLoadingStep, setIsLoadingStep] = useState(false);
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
    // Removed Step 5 - Payment now handled in dashboard
  });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dateValidation, setDateValidation] = useState<{ isValid: boolean; message: string } | null>(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [bypassed, setBypassed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const otpSentRef = useRef(false); // Additional protection against re-renders
  const [otpReady, setOtpReady] = useState(true); // Track if OTP is ready for verification
  const [waitingForPayment, setWaitingForPayment] = useState(false); // Track if waiting for Stripe webhook
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Field validation states
  const [fieldValidation, setFieldValidation] = useState({
    email: { isValid: false, touched: false },
    password: { isValid: false, touched: false },
    confirmPassword: { isValid: false, touched: false },
    firstName: { isValid: false, touched: false },
    lastName: { isValid: false, touched: false },
    dateOfBirth: { isValid: false, touched: false },
    phoneNumber: { isValid: false, touched: false },
    streetAddress: { isValid: false, touched: false },
    city: { isValid: false, touched: false },
    zipCode: { isValid: false, touched: false },
  });

  // Log page visit and check for existing session
  useEffect(() => {
    logPageVisit('/signup');

    // Check URL parameters for step, OAuth info, and email
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get('step');
    const oauthParam = urlParams.get('oauth');
    const emailParam = urlParams.get('email');
    const needsVerificationParam = urlParams.get('needsVerification');
    const sessionIdParam = urlParams.get('session_id'); // Stripe success redirect

    // Pre-fill email from URL parameter (from login redirect)
    if (emailParam) {
      setFormData(prev => ({
        ...prev,
        email: decodeURIComponent(emailParam),
      }));
    }

    // If OAuth user, pre-fill data from session (name and email)
    if (oauthParam && session?.user) {
      console.log('📝 Pre-filling form with Google OAuth data:', session.user);

      const fullName = session.user.name || "";
      const nameParts = fullName.trim().split(/\s+/); // Split by any whitespace

      let firstName = "";
      let lastName = "";
      let middleName = "";

      if (nameParts.length === 1) {
        // Single name (just first name)
        firstName = nameParts[0];
      } else if (nameParts.length === 2) {
        // Two names (first and last)
        firstName = nameParts[0];
        lastName = nameParts[1];
      } else if (nameParts.length >= 3) {
        // Three or more names (first, middle(s), last)
        firstName = nameParts[0];
        lastName = nameParts[nameParts.length - 1];
        middleName = nameParts.slice(1, -1).join(" ");
      }

      // Pre-fill form data with Google OAuth information
      setFormData(prev => ({
        ...prev,
        email: session.user.email || prev.email,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        middleName: middleName || prev.middleName,
        // Note: Google OAuth doesn't typically provide birthdate, phone, or address
        // These fields will remain empty and user must fill them
      }));

      // Update field validation for pre-filled fields to show them as valid
      if (firstName) {
        updateFieldValidation('firstName', firstName, validateRequired(firstName));
      }
      if (lastName) {
        updateFieldValidation('lastName', lastName, validateRequired(lastName));
      }
      if (session.user.email) {
        updateFieldValidation('email', session.user.email, validateEmail(session.user.email));
      }

      console.log('✅ Form pre-filled with Google data:', {
        firstName,
        middleName,
        lastName,
        email: session.user.email
      });
    }

    // If returning from Stripe payment (session_id in URL), start polling for webhook completion
    if (sessionIdParam && session?.user && !isPending) {
      console.log('🔄 Detected return from Stripe, waiting for webhook to process payment...');
      setWaitingForPayment(true);
      setIsLoadingStep(true);

      let pollAttempts = 0;
      const maxPollAttempts = 30; // Poll for up to 60 seconds (30 attempts * 2 seconds)

      const pollPaymentStatus = async () => {
        pollAttempts++;
        console.log(`📊 Polling payment status (attempt ${pollAttempts}/${maxPollAttempts})...`);

        try {
          const response = await fetch('/api/onboarding/status', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          const data = await response.json();

          if (data.success && data.status) {
            if (data.status.canAccessDashboard) {
              // Payment processed! Webhook completed successfully
              console.log('Payment confirmed ! Redirecting to dashboard...');

              // Clean up polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }

              setWaitingForPayment(false);
              setIsLoadingStep(false);

              // Remove session_id from URL and redirect to dashboard
              window.history.replaceState(null, '', '/dashboard');
              navigate.push('/dashboard');
              return;
            }
          }

          // Check if we've exceeded max attempts
          if (pollAttempts >= maxPollAttempts) {
            console.warn('⚠️ Payment verification timeout - webhook may be delayed');

            // Clean up polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setWaitingForPayment(false);
            setIsLoadingStep(false);

            toast.error('Payment verification is taking longer than expected. Please refresh the page or contact support if this persists.');
          }
        } catch (error) {
          console.error('❌ Error polling payment status:', error);

          if (pollAttempts >= maxPollAttempts) {
            // Clean up polling on error after max attempts
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setWaitingForPayment(false);
            setIsLoadingStep(false);
            toast.error('Unable to verify payment status. Please refresh the page.');
          }
        }
      };

      // Start polling immediately
      pollPaymentStatus();

      // Then poll every 2 seconds
      pollingIntervalRef.current = setInterval(pollPaymentStatus, 2000);

      // Cleanup on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
    // If user is authenticated, check their database state to determine correct step
    // Skip the check if coming from Stripe (session_id in URL) or if bypassed
    else if (session?.user && !isPending && !bypassed && !sessionIdParam) {
      setIsLoadingStep(true);

      // No delay needed since payment is now handled in dashboard
      const checkDelay = 0;

      setTimeout(() => {
        fetch('/api/onboarding/status', {
          method: 'GET',
          credentials: 'include'
        })
          .then(response => response.json())
          .then(data => {
            if (data.success && data.status) {
              if (data.status.canAccessDashboard) {
                // User completed everything, go to dashboard
                navigate.push('/dashboard');
              } else {
                // Validate step based on database state
                const correctStep = data.status.nextStep;
                console.log(`Database says user should be on step ${correctStep}, URL says step ${step}`);

                // Handle legacy users - redirect to dashboard if they completed steps 1-4
                let targetStep = correctStep;
                if (correctStep === 7 || correctStep >= 5) {
                  // User completed onboarding, redirect to dashboard
                  navigate.push('/dashboard');
                  return;
                } else if (correctStep >= 1 && correctStep <= 4) {
                  targetStep = correctStep;
                }

                // Only update step if database says different step than URL
                if (targetStep !== step) {
                  console.log(`Redirecting from step ${step} to step ${targetStep} based on database state`);
                  // Update URL silently without page reload
                  window.history.replaceState(null, '', `?step=${targetStep}`);
                  setStep(targetStep);
                }

                // Pre-fill email if available
                if (session.user.email) {
                  setFormData(prev => ({
                    ...prev,
                    email: session.user.email || "",
                  }));
                }
              }
            }
            setIsLoadingStep(false);
          })
          .catch(error => {
            console.error('Error checking onboarding status:', error);
            setIsLoadingStep(false);
            // Keep the step from URL if API fails
          });
      }, checkDelay);
    } else if (!session?.user && stepParam) {
      // Not authenticated, use URL parameter (already set in initial state)
      const stepNumber = parseInt(stepParam, 10);

      // Special case: if coming from login redirect for email verification
      if (stepNumber === 2 && emailParam && needsVerificationParam) {
        // Pre-fill email
        setFormData(prev => ({
          ...prev,
          email: decodeURIComponent(emailParam),
        }));

        // Auto-send OTP for the existing user (only once)
        if (!otpSent) {
          setOtpSent(true);
          setTimeout(async () => {
            try {
              const otpResult = await authClient.emailOtp.sendVerificationOtp({
                email: decodeURIComponent(emailParam),
                type: "email-verification"
              });

              if (otpResult.error) {
                toast.error("Failed to send verification code. Please use the resend button.");
                setOtpSent(false); // Reset flag on error so user can try again
              } else {
                toast.success("We've sent a verification code to your email.");
              }
            } catch (error) {
              toast.error("Failed to send verification code. Please use the resend button.");
              setOtpSent(false); // Reset flag on error so user can try again
            }
          }, 1000); // Small delay to ensure UI is ready
        }
      }
    }
  }, [session, isPending, navigate, bypassed]);

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

  // Validation helper functions
  const validateEmail = (email: string): boolean => {
    // Check if email is empty
    if (!email || email.trim().length === 0) {
      return false;
    }

    const trimmedEmail = email.trim();

    // Check if email contains @ symbol
    if (!trimmedEmail.includes('@')) {
      return false;
    }

    // Split email into local and domain parts
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2) {
      return false;
    }

    const [localPart, domainPart] = parts;

    // Check if both parts exist
    if (!localPart || !domainPart) {
      return false;
    }

    // Check for consecutive dots
    if (localPart.includes('..') || domainPart.includes('..')) {
      return false;
    }

    // Domain must contain at least one dot (for TLD)
    if (!domainPart.includes('.')) {
      return false;
    }

    // Basic email validation regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(trimmedEmail);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): boolean => {
    return password === confirmPassword && password.length >= 8;
  };

  const validateRequired = (value: string): boolean => {
    return value.trim().length > 0;
  };

  const updateFieldValidation = (field: string, value: string, isValid: boolean) => {
    setFieldValidation(prev => ({
      ...prev,
      [field]: { isValid, touched: true }
    }));
  };

  // Validation asterisk component
  const ValidationAsterisk = ({ isValid, touched }: { isValid: boolean; touched: boolean }) => {
    let colorClass = 'text-muted-foreground'; // Default for untouched

    if (touched) {
      colorClass = isValid ? 'text-green-500' : 'text-red-500';
    }

    return <span className={colorClass}>*</span>;
  };

  // Dynamic geographic data from APIs (REST Countries + CountryStateCity)
  const { dialCodes, isLoading: dialCodesLoading } = useDialCodes();
  const { data: countries, isLoading: countriesLoading } = useCountries();
  const { options: stateOptions, isLoading: statesLoading } = useStateOptions(formData.country);

  const handleInputChange = (field: string, value: string | boolean): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate fields and update validation state
    if (typeof value === 'string') {
      let isValid = false;

      switch (field) {
        case 'email':
          isValid = validateEmail(value);
          break;
        case 'password':
          isValid = validatePassword(value);
          // Also revalidate confirm password if it exists
          if (formData.confirmPassword) {
            updateFieldValidation('confirmPassword', formData.confirmPassword, validateConfirmPassword(value, formData.confirmPassword));
          }
          break;
        case 'confirmPassword':
          isValid = validateConfirmPassword(formData.password, value);
          break;
        case 'firstName':
        case 'lastName':
        case 'streetAddress':
        case 'city':
        case 'zipCode':
          isValid = validateRequired(value);
          break;
        case 'dateOfBirth':
          isValid = value.length > 0 && validateAge(value).isValid;
          break;
        case 'phoneNumber':
          isValid = validatePhoneNumber(value);
          break;
        default:
          return;
      }

      updateFieldValidation(field, value, isValid);
    }
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
      // For email OTP, check if OTP is ready before auto-submitting
      if (field === 'emailOtpCode' && step === 2 && !otpReady) {
        console.log('⏳ OTP not ready yet, waiting...');
        toast.info("Preparing verification code... Please wait a moment.");
        return;
      }

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

    if (!validateEmail(formData.email)) {
      toast.error("Please enter a valid email address with @ symbol (e.g., user@example.com)");
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
      baseLogger("authentication", "WillCreateAccount");

      // Create user with Better Auth
      const result = await signUp.email({
        email: formData.email.trim(),
        password: formData.password,
        name: "User", // Temporary name, will be updated in step 3
      });

      baseLogger("authentication", "DidCreateAccount")

      if (result.error) {
        console.error("Account creation error:", result.error);

        // If account already exists, try to log them in and direct to correct step
        if (result.error.message && result.error.message.includes("already exists")) {
          toast.info("Account exists. Logging you in...");

          try {
            // Attempt to sign in with provided credentials
            const loginResult = await signIn.email({
              email: formData.email.trim(),
              password: formData.password,
            });

            if (loginResult.error) {
              // Wrong password or other login error
              await logSignup(email, false);
              toast.error("Email already registered. Please use the correct password or use 'Forgot Password'.");
              return;
            }

            // Successfully logged in - now check their completion status
            toast.success("Logged in successfully!");

            // Fetch user profile to determine which step they're on
            const response = await fetch('/api/profiles/get', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email.trim() })
            });

            if (response.ok) {
              const profileData = await response.json();

              // Check email verification status
              if (!loginResult.data?.user?.emailVerified) {
                // Need to verify email
                setUserId(loginResult.data?.user?.id || null);
                setStep(2);
                toast.info("Please verify your email to continue.");
                return;
              }

              // Check if profile is complete
              if (!profileData.profile || !profileData.profile.first_name) {
                // Need to complete profile
                setUserId(loginResult.data?.user?.id || null);
                setStep(3);
                toast.info("Please complete your profile.");
                return;
              }

              // Profile complete - redirect to dashboard
              navigate.push('/dashboard');
              return;
            } else {
              // Profile doesn't exist yet - go to step 3
              setUserId(loginResult.data?.user?.id || null);
              setStep(3);
              toast.info("Please complete your profile.");
              return;
            }

          } catch (loginError) {
            console.error("Auto-login error:", loginError);
            await logSignup(email, false);
            toast.error("Email already registered. Please login instead.");
            return;
          }
        }

        // Other errors
        await logSignup(email, false);
        await logError(`Account creation failed: ${result.error.message || result.error.code || 'Unknown error'}`, undefined, {
          step: 'account_creation',
          email: email,
          error_code: result.error.message || result.error.code || 'unknown',
        });

        toast.error("Failed to create account. Please try again.");
        return;
      }

      // Store user ID and proceed to email verification
      setUserId(result.data?.user?.id || null);
      await logSignup(email, true, result.data?.user?.id);

      // Move to email verification step
      // Better Auth automatically sends the OTP email (sendVerificationOnSignUp: true)
      setStep(2);
      setOtpSent(true); // Mark as sent since Better Auth handles it
      otpSentRef.current = true;
      setOtpReady(false); // OTP not ready yet
      toast.success("Account created! Check your email for a verification code.");

      // Add delay to ensure OTP is saved to database before allowing verification
      setTimeout(() => {
        setOtpReady(true);
        console.log('✅ OTP ready for verification');
      }, 2000); // 2 second delay for Better Auth to save OTP

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
    // Check if OTP is ready first (prevent race condition)
    if (!otpReady) {
      toast.info("Preparing verification code... Please try again in a moment.");
      // Auto-retry after delay if code is entered
      setTimeout(() => {
        if (formData.emailOtpCode && formData.emailOtpCode.length === 6) {
          handleEmailVerification();
        }
      }, 1000);
      return;
    }

    if (!formData.emailOtpCode || formData.emailOtpCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    try {
      setLoading(true);


      // Debug: Log what we're sending
      console.log('🔍 Verifying email OTP:', {
        email: formData.email.trim(),
        otp: formData.emailOtpCode,
        otpLength: formData.emailOtpCode.length
      });

      // Verify email with Better Auth Email OTP plugin
      const result = await authClient.emailOtp.verifyEmail({
        email: formData.email.trim(),
        otp: formData.emailOtpCode
      });

      console.log('🔍 Verification result:', result);
      console.log('🔍 Error details:', JSON.stringify(result.error, null, 2));

      if (result.error) {

        // Handle specific error cases
        if (result.error.code === 'INVALID_OTP') {
          toast.error("Invalid or expired verification code. Please check your email or request a new code.");
        } else if (result.error.code === 'OTP_EXPIRED') {
          toast.error("Verification code has expired. Please request a new code.");
        } else if (result.error.code === 'TOO_MANY_ATTEMPTS') {
          toast.error("Too many failed attempts. Please request a new verification code.");
        } else {
          toast.error(`Verification failed: ${result.error.message || result.error.code || 'Please try again'}`);
        }
        return;
      }

      // CRITICAL: Refetch session after email verification to get authenticated session
      console.log('🔄 Refetching session after email verification...');
      await refetchSession();

      // Wait a moment for session cookies to be set
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force another refetch to ensure we have the session
      await refetchSession();
      console.log('✅ Session refetched twice for reliability');

      // Verify session is actually available - if not, redirect to login
      await new Promise(resolve => setTimeout(resolve, 500));
      const verifySessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });

      // Check if response is OK and has content
      let sessionCheck = null;
      if (verifySessionResponse.ok) {
        const responseText = await verifySessionResponse.text();
        if (responseText) {
          try {
            sessionCheck = JSON.parse(responseText);
          } catch (e) {
            console.error('❌ Failed to parse session response:', e);
          }
        }
      }

      if (!sessionCheck || !sessionCheck.user) {
        console.error('❌ Session still not available after email verification');
        toast.warning("Email verified! Redirecting you to login...", { duration: 5000 });

        // Wait 2 seconds then redirect to login with email pre-filled
        await new Promise(resolve => setTimeout(resolve, 2000));
        window.location.href = `/login?email=${encodeURIComponent(formData.email.trim())}&verified=true&message=${encodeURIComponent('Email verified! Please login to continue.')}`;
        return;
      }

      console.log('✅ Session confirmed available:', sessionCheck.user.id);

      // Update progress in database
      const progressResponse = await fetch('/api/onboarding/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step: 'email-verified'
        })
      });

      if (!progressResponse.ok) {
        console.error('Failed to update progress:', progressResponse.status, progressResponse.statusText);
        const errorData = await progressResponse.json().catch(() => ({}));
        console.error('Progress update error:', errorData);

        // If still getting 401, redirect to login
        if (progressResponse.status === 401) {
          console.error('❌ Still not authenticated - redirecting to login');
          toast.warning("Please login to continue your signup.", { duration: 5000 });
          await new Promise(resolve => setTimeout(resolve, 2000));
          window.location.href = `/login?email=${encodeURIComponent(formData.email.trim())}&verified=true&step=3`;
          return;
        }

        // Don't fail the verification, just log the error
        toast.warning("Email verified, but failed to update progress. Please continue.");
      } else {
        console.log('✅ Progress updated successfully');
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
      setOtpSent(false); // Reset the flag to allow new sends
      otpSentRef.current = false; // Reset ref to allow resend
      setOtpReady(false); // Mark as not ready while sending

      const result = await authClient.emailOtp.sendVerificationOtp({
        email: formData.email.trim(),
        type: "email-verification"
      });

      if (result.error) {
        toast.error("Failed to resend verification code");
        setOtpReady(true); // Reset on error
        return;
      }

      setOtpSent(true); // Mark as sent
      otpSentRef.current = true; // Mark ref as sent
      toast.success("New 6-digit verification code sent! Please check your inbox.");

      // Delay before allowing verification
      setTimeout(() => {
        setOtpReady(true);
      }, 2000);
    } catch (err) {
      toast.error("Failed to resend verification code");
      setOtpReady(true); // Reset on error
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

    if (!formData.streetAddress || !formData.city || !formData.zipCode || !formData.country) {
      toast.error("Please complete all required address fields");
      return;
    }

    // State is only required if states are available for the selected country
    if (stateOptions.length > 0 && !formData.state) {
      toast.error("Please select a state/region");
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

      // DEVELOPMENT MODE: Auto-bypass phone verification
      // In production, uncomment sendPhoneOtp() and remove the bypass logic
      await handlePhoneVerificationBypass();

      // PRODUCTION MODE: Send phone OTP via Twilio (COMMENTED OUT FOR DEVELOPMENT)
      // await sendPhoneOtp();

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process verification";
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

      // Update progress in database
      await fetch('/api/onboarding/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step: 'phone-verified',
          data: { phone: formattedPhone }
        })
      });

      // Redirect to dashboard instead of Step 5
      toast.success("Phone verified successfully! Redirecting to dashboard...");
      navigate.push('/dashboard');

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
        name: fullName
      });

      if (result.error) {
        toast.error("Failed to save profile information");
        return;
      }

      // Also save to normalized tables via API
      await fetch("/api/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          middle_name: formData.middleName,
          date_of_birth: formData.dateOfBirth,
          phone: formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode),
          phone_country_code: formData.phoneCountryCode, // Store phone country code separately
          street_address: formData.streetAddress,
          address_line_2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country_code: formData.country,
        }),
      });

      // Update progress in database
      await fetch('/api/onboarding/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step: 'profile-completed'
        })
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during profile completion";
      await logError(`Profile completion error: ${errorMessage}`, userId || undefined);
      throw new Error(errorMessage);
    }
  };

  // Auto-bypass phone verification for development (replaces manual bypass button)
  const handlePhoneVerificationBypass = async (): Promise<void> => {
    try {
      const formattedPhone = formatPhoneNumber(formData.phoneNumber, formData.phoneCountryCode);

      console.log('🔧 Development Mode: Auto-bypassing phone verification');
      console.log('📋 Current session:', session ? {
        userId: session.user?.id,
        email: session.user?.email,
        emailVerified: session.user?.emailVerified
      } : 'NO SESSION');
      console.log('⏳ Is session pending?', isPending);

      // Step 1: Save complete profile data via API
      const profileResp = await fetch("/api/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          middle_name: formData.middleName,
          date_of_birth: formData.dateOfBirth,
          phone: formattedPhone,
          street_address: formData.streetAddress,
          address_line_2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country_code: formData.country,
        }),
      });

      if (!profileResp.ok) {
        const errorData = await profileResp.json().catch(() => ({}));
        console.error('Profile save error:', errorData);
        throw new Error(errorData.error || 'Failed to save profile');
      }

      console.log('✅ Profile data saved successfully');

      // Step 2: Update Better Auth user with full name
      const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();
      const userUpdateResult = await updateUser({
        name: fullName
      });

      if (userUpdateResult.error) {
        console.warn('Failed to update user name:', userUpdateResult.error);
      } else {
        console.log('✅ Better Auth user name updated');
      }

      // Step 3: Mark profile as completed
      const profileProgressResp = await fetch('/api/onboarding/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step: 'profile-completed'
        })
      });

      if (!profileProgressResp.ok) {
        console.warn('Failed to update profile progress:', await profileProgressResp.text());
      } else {
        console.log('✅ Profile completion progress updated');
      }

      // Step 4: Mark phone as verified (CRITICAL for bypass to work)
      const phoneProgressResp = await fetch('/api/onboarding/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step: 'phone-verified',
          data: { phone: formattedPhone }
        })
      });

      if (!phoneProgressResp.ok) {
        const errorData = await phoneProgressResp.json().catch(() => ({}));
        console.error('Phone verification error:', errorData);
        throw new Error(errorData.error || 'Failed to mark phone as verified');
      }

      console.log('✅ Phone marked as verified');
      console.log('🎉 All profile data saved, progressing to payment step');

      // Update local state
      setBypassed(true);

      // Redirect to dashboard instead of Step 5
      toast.success("Profile complete! Redirecting to dashboard...");
      navigate.push('/dashboard');

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save profile";
      console.error('❌ Profile verification bypass error:', err);
      toast.error(errorMessage);
      throw err; // Re-throw to be caught by handleStep3Submit
    }
  };

  // Step 5 removed - Payment now handled in dashboard

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setTheme(actualTheme === 'light' ? 'dark' : 'light');
  };

  const handleGoogleSignup = async (): Promise<void> => {
    try {
      setLoading(true);

      await logSignup("google_oauth", false);

      // Use Better Auth for Google OAuth
      // Better Auth will set session cookies first, then redirect to callback
      await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/auth/callback`,
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Google signup failed";
      await logError(`Google signup error: ${errorMessage}`, undefined, {
        provider: 'google'
      });
      toast.error("Google signup failed");
      setLoading(false);
    }
  };

  return (
    <BeamsBackground intensity="medium" className="min-h-screen flex items-center justify-center p-4">
      {/* Theme Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 hover:bg-white/20 dark:hover:bg-black/20 p-2 text-foreground"
        title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {actualTheme === 'light' ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
        <span className="hidden sm:inline text-sm">
          {actualTheme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </span>
      </Button>

      <LiquidGlassCard className="w-full max-w-xl" glassSize="lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Crown className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold text-foreground">Home Solutions</span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${step >= i
                  ? "bg-accent text-accent-foreground shadow-lg"
                  : "bg-muted border border-border text-muted-foreground"
                  }`}
              >
                {step > i ? <Check className="w-4 h-4" /> : ""}
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

        {/* Payment Verification Loading State */}
        {waitingForPayment && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Verifying Your Payment</h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment with Stripe...
              </p>
              <p className="text-sm text-muted-foreground">
                This usually takes just a few seconds
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {/* Step 1: Email + Password */}
        {!waitingForPayment && step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2 text-foreground">Create Your Account</h1>
              <p className="text-muted-foreground">Enter your email and create a password</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email Address <ValidationAsterisk isValid={fieldValidation.email.isValid} touched={fieldValidation.email.touched} />
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors ${fieldValidation.email.touched
                    ? fieldValidation.email.isValid
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-red-500 focus:border-red-500'
                    : ''
                    }`}
                  required
                />
                {fieldValidation.email.touched && !fieldValidation.email.isValid && formData.email.length > 0 && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <span>⚠</span>
                    Please enter a valid email address with @ symbol (e.g., user@example.com)
                  </p>
                )}
                {fieldValidation.email.touched && fieldValidation.email.isValid && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span>✓</span>
                    Valid email address
                  </p>
                )}
                {!fieldValidation.email.touched && (
                  <p className="text-xs text-muted-foreground">
                    We'll send you a verification code to confirm your email
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">
                    Password <ValidationAsterisk isValid={fieldValidation.password.isValid} touched={fieldValidation.password.touched} />
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">
                    Confirm Password <ValidationAsterisk isValid={fieldValidation.confirmPassword.isValid} touched={fieldValidation.confirmPassword.touched} />
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
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
                <Label htmlFor="agreeToTerms" className="text-sm text-foreground">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-accent hover:text-accent/80 hover:underline transition-colors"
                  >
                    Terms & Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPrivacyModal(true);
                    }}
                    className="text-accent hover:text-accent/80 hover:underline transition-colors"
                  >
                    Privacy Policy
                  </button>
                </Label>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <Button
                onClick={handleStep1Submit}
                disabled={loading || !formData.email || !validateEmail(formData.email) || !formData.password || !formData.confirmPassword || !formData.agreeToTerms || !fieldValidation.email.isValid || !fieldValidation.password.isValid || !fieldValidation.confirmPassword.isValid}
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg px-8 py-2 transition-all duration-200"
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
        {!waitingForPayment && step === 2 && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-foreground">Verify Your Email</h1>
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
                  <Label htmlFor="emailOtpCode" className="text-foreground">Verification Code *</Label>
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
                    className={`text-center text-2xl tracking-widest bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors ${autoSubmitting ? 'border-green-500 bg-green-900/20' : ''
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
                      <p className="text-green-400">Verifying code...</p>
                    ) : (
                      <p className="text-muted-foreground">Enter the 6-digit code from your email</p>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resendEmailVerification}
                    disabled={loading}
                    className="text-blue-400 hover:text-blue-300 border-gray-700 hover:border-blue-500"
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
                  className="px-8 py-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={loading || autoSubmitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || autoSubmitting || !formData.emailOtpCode || formData.emailOtpCode.length !== 6}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-all duration-200 px-8 py-2"
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
              <h1 className="text-2xl font-bold mb-2 text-foreground">Complete Your Profile</h1>
              <p className="text-muted-foreground">
                {isOAuthUser
                  ? "Review and complete your profile information"
                  : "Tell us about yourself and your address"
                }
              </p>
              {isOAuthUser && session?.user && (
                <div className="mt-3 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/20 text-green-400 rounded-full text-sm border border-green-700">
                    <Check className="w-4 h-4" />
                    Email verified via Google
                  </div>
                  {(formData.firstName || formData.lastName) && (
                    <p className="text-xs text-accent">
                      ✓ Name pre-filled from Google (you can edit if needed)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Personal Information Section */}
              <div className="space-y-4 p-4 bg-white dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-foreground">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">
                      First Name <ValidationAsterisk isValid={fieldValidation.firstName.isValid} touched={fieldValidation.firstName.touched} />
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="middleName" className="text-foreground">Middle Name</Label>
                    <Input
                      id="middleName"
                      placeholder="Michael"
                      value={formData.middleName}
                      onChange={(e) => handleInputChange("middleName", e.target.value)}
                      className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">
                      Last Name <ValidationAsterisk isValid={fieldValidation.lastName.isValid} touched={fieldValidation.lastName.touched} />
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-foreground">
                    Date of Birth <ValidationAsterisk isValid={fieldValidation.dateOfBirth.isValid} touched={fieldValidation.dateOfBirth.touched} />
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    className={`bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors ${dateValidation && !dateValidation.isValid
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
                  <Label htmlFor="phoneNumber" className="text-foreground">
                    Phone Number <ValidationAsterisk isValid={fieldValidation.phoneNumber.isValid} touched={fieldValidation.phoneNumber.touched} />
                  </Label>
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
                      <SelectTrigger className="w-24 bg-input border-border focus:border-accent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dialCodesLoading ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          dialCodes.map((item) => (
                            <SelectItem key={`${item.code}-${item.dialCode}`} value={item.dialCode}>
                              {item.flag} {item.dialCode}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder={formData.phoneCountryCode === '+1' ? '(555) 123-4567' : formData.phoneCountryCode === '+256' ? '745315809' : 'Enter phone number'}
                      value={formData.phoneNumber}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      className="flex-1 bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                      maxLength={20}
                      required
                    />
                  </div>
                  {formData.phoneCountryCode === '+1' && formData.phoneNumber && getCleanPhoneNumber(formData.phoneNumber).length !== 10 && (
                    <p className="text-xs text-red-500">US phone numbers must be 10 digits</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    We'll send you a verification code to confirm your number
                  </p>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="space-y-4 p-4 bg-white dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-foreground">Address Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="streetAddress" className="text-foreground">
                    Street Address <ValidationAsterisk isValid={fieldValidation.streetAddress.isValid} touched={fieldValidation.streetAddress.touched} />
                  </Label>
                  <Input
                    id="streetAddress"
                    placeholder="123 Main St"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                    className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2" className="text-foreground">Address Line 2 (Optional)</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Apt, Suite, Unit, etc."
                    value={formData.addressLine2}
                    onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                    className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-foreground">Country <span className="text-muted-foreground">*</span></Label>
                  <SearchableSelect
                    options={countriesLoading ? [] : (countries?.map((country) => ({
                      value: country.code,
                      label: `${country.flag} ${country.name}`
                    })) || [])}
                    value={formData.country}
                    onValueChange={(value) => {
                      handleInputChange("country", value);
                      // Clear state when country changes since states are country-specific
                      setFormData(prev => ({ ...prev, state: "" }));
                    }}
                    placeholder="Select country"
                    searchPlaceholder="Search countries..."
                    emptyMessage="No countries found."
                    disabled={countriesLoading}
                    className="bg-input border-border focus:border-accent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-foreground">
                    City <ValidationAsterisk isValid={fieldValidation.city.isValid} touched={fieldValidation.city.touched} />
                  </Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-foreground">
                      State/Region {stateOptions.length > 0 && <span className="text-muted-foreground">*</span>}
                    </Label>
                    {stateOptions.length > 0 ? (
                      <Select
                        value={formData.state}
                        onValueChange={(value) => handleInputChange("state", value)}
                      >
                        <SelectTrigger className="bg-input border-border focus:border-accent">
                          <SelectValue placeholder="Select state/region" />
                        </SelectTrigger>
                        <SelectContent>
                          {statesLoading ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            stateOptions.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="state"
                        placeholder="State/Region (optional)"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-foreground">
                      Postal Code <ValidationAsterisk isValid={fieldValidation.zipCode.isValid} touched={fieldValidation.zipCode.touched} />
                    </Label>
                    <Input
                      id="zipCode"
                      placeholder="Postal code"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      className="bg-input border-border focus:border-accent text-foreground placeholder-muted-foreground transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
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
                disabled={loading || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.phoneNumber || !validatePhoneNumber(formData.phoneNumber) || !formData.streetAddress || !formData.city || !formData.country || (stateOptions.length > 0 && !formData.state) || !formData.zipCode || (dateValidation && !dateValidation.isValid)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-all duration-200 px-8 py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    Continue to Payment
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
              <p className="text-gray-400">
                Enter the code sent to<br />
                <span className="font-medium text-white">{formData.phoneCountryCode} {formData.phoneNumber}</span>
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
                  <Label htmlFor="phoneOtpCode" className="text-gray-200">Verification Code *</Label>
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
                    className={`text-center text-2xl tracking-widest bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-gray-400 transition-colors ${autoSubmitting ? 'border-green-500 bg-green-900/20' : ''
                      }`}
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    required
                    autoFocus
                    disabled={autoSubmitting}
                  />
                  <div className="text-xs text-gray-400 space-y-1">
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
                    className="text-blue-400 hover:text-blue-300 border-gray-700 hover:border-blue-500"
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
                  className="px-8 py-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={loading || autoSubmitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || autoSubmitting || !formData.phoneOtpCode || formData.phoneOtpCode.length !== 6}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-all duration-200 px-8 py-2"
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

        {/* Step 5 removed - Payment now handled in dashboard */}

        {/* Divider */}
        {step === 1 && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Signup */}
            <Button
              className="w-full mb-6 bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground transition-colors"
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

        {/* Login Link / Logout Button */}
        {step === 1 ? (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:text-accent/80 hover:underline font-medium transition-colors">
              Back to Login
            </Link>
          </p>
        ) : (
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500 mb-2">
              Logged in as {session?.user?.email || formData.email}
            </p>
            <Button
              variant="ghost"
              onClick={async () => {
                // Confirm logout to prevent accidental clicks
                const confirmLogout = window.confirm(
                  "Are you sure you want to logout? Your progress has been saved and you can continue later."
                );

                if (!confirmLogout) return;

                try {
                  setLoading(true);
                  console.log('🔓 Logging out user...');

                  await signOut();

                  toast.success("Logged out successfully. Your progress is saved!");

                  // Small delay to ensure session is cleared
                  setTimeout(() => {
                    navigate.push('/login');
                  }, 500);
                } catch (error) {
                  console.error('❌ Logout error:', error);
                  toast.error("Failed to logout. Please try again.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-colors px-4 py-2"
            >
              {loading ? "Logging out..." : "Logout"}
            </Button>
          </div>
        )}
      </LiquidGlassCard>

      {/* Terms and Privacy Modals */}
      <TermsModal open={showTermsModal} onOpenChange={setShowTermsModal} />
      <PrivacyModal open={showPrivacyModal} onOpenChange={setShowPrivacyModal} />
    </BeamsBackground>
  );
};

export default SignUp;
