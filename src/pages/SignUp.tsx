import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Check } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { logPageVisit, logSignup, logError } from "@/lib/audit";

const SignUp = () => {
  const navigate = useRouter();
  const supabase = useSupabaseClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);

  // Log page visit
  useEffect(() => {
    logPageVisit('/signup');
  }, []);
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
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStepOne = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!formData.dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!formData.streetAddress.trim() || !formData.city.trim() || !formData.state || !formData.zipCode.trim()) {
      toast.error("All required address fields must be completed");
      return;
    }

    try {
      setLoading(true);

      // Create Supabase user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            middle_name: formData.middleName || "",
            date_of_birth: formData.dateOfBirth,
            phone: `${formData.phoneCountryCode}${formData.phoneNumber}`,
            street_address: formData.streetAddress,
            address_line_2: formData.addressLine2 || "",
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
            country_code: formData.country,
          },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/signup?verified=true` : undefined,
        },
      });

      if (authError) {
        console.error("Supabase signup error details:", authError);
        await logSignup(formData.email.trim(), false);
        await logError(`Signup failed: ${authError.message}`, undefined, {
          email: formData.email.trim(),
          error_code: authError.message,
          error_details: JSON.stringify(authError)
        });

        // Provide user-friendly error messages
        let userMessage = "Failed to create account. Please try again.";
        
        if (authError.message.includes("rate limit exceeded")) {
          userMessage = "Too many signup attempts with this email. Please wait 5-10 minutes before trying again, or try with a different email address.";
        } else if (authError.message.includes("User already registered")) {
          userMessage = "An account with this email already exists. Please try logging in instead.";
        } else if (authError.message.includes("Password should be")) {
          userMessage = "Password is too weak. Please use at least 6 characters.";
        } else if (authError.message.includes("Invalid email")) {
          userMessage = "Please enter a valid email address.";
        } else if (authError.message.includes("Signup is disabled")) {
          userMessage = "Account creation is temporarily disabled. Please contact support.";
        } else {
          userMessage = `Signup failed: ${authError.message}`;
        }
        
        toast.error(userMessage);
        return;
      }

      // Log successful signup
      await logSignup(formData.email.trim(), true, authData.user?.id);
      
      toast.success("Account created! Please check your email to verify your account.");
      setStep(2);
      
    } catch (err: any) {
      await logError(`Unexpected signup error: ${err?.message}`, undefined, { 
        email: formData.email.trim() 
      });
      toast.error(err?.message || "Unexpected error during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleStepTwo = async () => {
    if (!formData.agreeToTerms) {
      toast.error("Please agree to Terms & Conditions and payment authorization");
      return;
    }

    try {
      setLoading(true);

      // Create Stripe checkout session (user should already be authenticated from step 1)
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
        
        // If authentication failed, user might need to verify email first
        if (msg.includes("Not authenticated") || msg.includes("Auth session missing")) {
          toast.error("Please verify your email first, then try again.");
          setStep(2); // Go back to email verification
          return;
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

    } catch (err: any) {
      await logError(`Payment initialization error: ${err?.message}`, undefined, {
        email: formData.email.trim()
      });
      toast.error(err?.message || "Unexpected error during payment setup");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);
      const email = formData.email.trim();

      if (formData.password !== formData.confirmPassword) {
        await logSignup(email, false);
        await logError("Password mismatch during signup", undefined, { email });
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }
      if ((formData.password || "").length < 8) {
        await logSignup(email, false);
        await logError("Password too short during signup", undefined, { email });
        toast.error("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: `${formData.phoneCountryCode}${formData.phoneNumber}`,
            street_address: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
          },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        },
      });

      if (signUpError) {
        await logSignup(email, false);
        await logError(`Signup failed: ${signUpError.message}`, undefined, {
          email,
          error_code: signUpError.message
        });
        toast.error(signUpError.message || "Failed to sign up");
        setLoading(false);
        return;
      }

      // Log successful signup
      await logSignup(email, true, signUpData.user?.id);

      // If a session exists (email confirmation not required), upsert profile server-side
      if (signUpData.session) {
        const resp = await fetch("/api/profiles/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            full_name: formData.fullName,
            phone: `${formData.phoneCountryCode}${formData.phoneNumber}`,
            street_address: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
          }),
        });

        if (!resp.ok) {
          let msg = "Failed to create profile record";
          try {
            const data = await resp.json();
            if (data?.error) msg = data.error;
          } catch (parseError) {
            console.error('Failed to parse profile error response:', parseError);
          }
          await logError(`Profile creation failed: ${msg}`, signUpData.user?.id, { email });
          toast.error(msg);
          setLoading(false);
          return;
        }
      }

      // If no session (email confirmation required), skip profile insert until login
      if (signUpData.session) {
        toast.success("Account created! Redirecting...");
        setTimeout(() => navigate.replace("/dashboard"), 1000);
      } else {
        toast.success("Account created! Please check your email to confirm.");
        setTimeout(() => navigate.replace("/login"), 1500);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during signup";
      await logError(`Unexpected signup error: ${errorMessage}`, undefined, {
        email: formData.email.trim()
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= i
                  ? "bg-accent text-background"
                  : "bg-card border border-border text-muted-foreground"
                  }`}
              >
                {step > i ? <Check className="w-5 h-5" /> : i}
              </div>
              {i < 4 && (
                <div
                  className={`w-12 h-1 mx-1 transition-all duration-300 ${step > i ? "bg-accent" : "bg-border"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Account Info */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Create Account</h1>
              <p className="text-muted-foreground">Enter your information</p>
            </div>

            <form onSubmit={handleStepOne} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
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
                  <Label htmlFor="lastName">Last Name</Label>
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
                <Label htmlFor="middleName">Middle Name (Optional)</Label>
                <Input
                  id="middleName"
                  placeholder="Michael"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange("middleName", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.phoneCountryCode}
                    onValueChange={(value) => handleInputChange("phoneCountryCode", value)}
                  >
                    <SelectTrigger className="w-24 bg-background/50 border-border focus:border-accent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+44">+44</SelectItem>
                      <SelectItem value="+33">+33</SelectItem>
                      <SelectItem value="+49">+49</SelectItem>
                      <SelectItem value="+81">+81</SelectItem>
                      <SelectItem value="+86">+86</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    className="flex-1 bg-background/50 border-border focus:border-accent transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  placeholder="123 Main St"
                  value={formData.streetAddress}
                  onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
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
                  <Label htmlFor="state">State</Label>
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

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input
                  id="zipCode"
                  placeholder="10001"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:glow-blue-lg" size="lg">
                Continue
              </Button>
            </form>
          </>
        )}

        {/* Step 2: Email Verification */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
              <p className="text-muted-foreground">Check your inbox to continue</p>
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
                  <p>3. Return here to continue with payment</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="w-full bg-primary hover:glow-blue-lg" 
                  size="lg"
                >
                  I've Verified My Email
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Payment Information */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Payment Information</h1>
              <p className="text-muted-foreground">Complete your membership payment</p>
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

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) => handleInputChange("agreeToTerms", e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">
                    I agree to the{" "}
                    <Link href="/terms" className="text-accent hover:underline">
                      Terms & Conditions
                    </Link>
                    , authorize the initial payment of $300 (includes first month) and recurring monthly payments of $25, and understand this will activate my membership.
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="w-full"
                >
                  Back
                </Button>
                <Button
                  onClick={handleStepTwo}
                  className="w-full bg-primary hover:glow-blue-lg"
                  size="lg"
                  disabled={!formData.agreeToTerms}
                >
                  Proceed to Payment
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Payment Integration Point */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Ready for Payment</h1>
              <p className="text-muted-foreground">Connect to subscription service</p>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-background/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{formData.firstName} {formData.middleName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="font-medium">{formData.dateOfBirth}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{formData.phoneCountryCode} {formData.phoneNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium text-right">
                    {formData.streetAddress}
                    {formData.addressLine2 && <><br />{formData.addressLine2}</>}
                    <br />
                    {formData.city}, {formData.state} {formData.zipCode}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Setup Fee:</span>
                  <span className="font-bold text-accent">$325.00</span>
                </div>
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
                  onClick={() => setStep(3)}
                  className="w-full"
                >
                  Back
                </Button>
                <Button
                  onClick={() => navigate.replace("/dashboard")}
                  className="w-full bg-accent text-background hover:glow-blue-lg"
                  size="lg"
                >
                  Continue to Dashboard
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
