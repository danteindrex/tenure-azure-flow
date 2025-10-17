import { useState } from "react";
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

const SignUp = () => {
  const navigate = useRouter();
  const supabase = useSupabaseClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);
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

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!formData.streetAddress.trim() || !formData.city.trim() || !formData.state || !formData.zipCode.trim()) {
      toast.error("All address fields are required");
      return;
    }
    setStep(2);
  };

  const handleStepTwo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreeToTerms) {
      toast.error("Please agree to Terms & Conditions");
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        toast.error("Supabase env missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }
      if ((formData.password || "").length < 8) {
        toast.error("Password must be at least 8 characters");
        setLoading(false);
        return;
      }
      const email = formData.email.trim();
      const password = formData.password;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
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
        toast.error(signUpError.message || "Failed to sign up");
        setLoading(false);
        return;
      }

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
          } catch {}
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
    } catch (err: any) {
      toast.error(err?.message || "Unexpected error during signup");
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step >= i
                    ? "bg-accent text-background"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {step > i ? <Check className="w-5 h-5" /> : i}
              </div>
              {i < 3 && (
                <div
                  className={`w-12 h-1 mx-1 transition-all duration-300 ${
                    step > i ? "bg-accent" : "bg-border"
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
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
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
                <Label htmlFor="zipCode">ZIP Code</Label>
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
                />
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

        {/* Step 2: Payment Consent */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Joining Fee</h1>
              <p className="text-muted-foreground">One-time membership fee</p>
            </div>

            <form onSubmit={handleStepTwo} className="space-y-6">
              <Card className="p-6 border-2 border-accent glow-blue">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">Membership Fee</p>
                  <p className="text-5xl font-bold text-accent">$300</p>
                  <p className="text-sm text-muted-foreground">One-time payment</p>
                </div>
              </Card>

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
                    and{" "}
                    <Link href="/privacy" className="text-accent hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
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
                <Button type="submit" className="w-full bg-primary hover:glow-blue-lg" size="lg">
                  Continue
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Almost There!</h1>
              <p className="text-muted-foreground">Complete your registration</p>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-background/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{formData.fullName}</span>
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
                    {formData.streetAddress}<br />
                    {formData.city}, {formData.state} {formData.zipCode}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Membership Fee:</span>
                  <span className="font-bold text-accent">$300.00</span>
                </div>
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
                  onClick={handleFinalSubmit}
                  className="w-full bg-accent text-background hover:glow-blue-lg"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account & Pay Fee"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
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
