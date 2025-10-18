import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Check } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { logPageVisit, logError } from "@/lib/audit";

const CompleteProfile = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  // US States data
  const usStates = [
    { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
  ];

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    email: "",
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

  // Log page visit and pre-fill from Google data
  useEffect(() => {
    logPageVisit('/signup/complete-profile');
    
    if (user) {
      // Parse Google user data
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts[nameParts.length - 1] || "";
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

      setFormData(prev => ({
        ...prev,
        firstName,
        lastName,
        middleName,
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!formData.dateOfBirth) {
      toast.error("Date of birth is required");
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
    
    setStep(2);
  };

  const handlePaymentStep = async () => {
    if (!formData.agreeToTerms) {
      toast.error("Please agree to Terms & Conditions and payment authorization");
      return;
    }
    
    try {
      setLoading(true);
      
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      // Create/update profile record
      const resp = await fetch("/api/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          first_name: formData.firstName,
          last_name: formData.lastName,
          middle_name: formData.middleName,
          date_of_birth: formData.dateOfBirth,
          phone: `${formData.phoneCountryCode}${formData.phoneNumber}`,
          street_address: formData.streetAddress,
          address_line_2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country_code: formData.country,
        }),
      });

      if (!resp.ok) {
        let msg = "Failed to create profile record";
        try {
          const data = await resp.json();
          if (data?.error) msg = data.error;
        } catch {}
        await logError(`Profile creation failed: ${msg}`, user.id, { email: formData.email.trim() });
        toast.error(msg);
        return;
      }

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
        } catch {}
        toast.error(msg);
        return;
      }

      const checkoutData = await checkoutResp.json();
      
      if (checkoutData.success && checkoutData.checkoutUrl) {
        toast.success("Profile completed! Redirecting to payment...");
        // Redirect to Stripe checkout
        window.location.href = checkoutData.checkoutUrl;
      } else {
        toast.error("Failed to initialize payment. Please try again.");
      }
      
    } catch (err: any) {
      await logError(`Profile completion error: ${err?.message}`, user?.id, { 
        email: formData.email.trim() 
      });
      toast.error(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-6">Please sign in to complete your profile.</p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Card className="glass-card w-full max-w-lg p-8 hover-float relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 text-accent">
            <Crown className="w-8 h-8" />
            <span className="text-2xl font-bold text-foreground">Tenure</span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((i) => (
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
              {i < 2 && (
                <div
                  className={`w-12 h-1 mx-1 transition-all duration-300 ${
                    step > i ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Complete Profile */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-2 text-foreground">Complete Your Profile</h1>
              <p className="text-muted-foreground">We need a few more details to set up your account</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
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
                  value={formData.email}
                  className="bg-background/50 border-border text-muted-foreground"
                  disabled
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

              <Button type="submit" className="w-full bg-primary hover:glow-blue-lg" size="lg">
                Continue to Payment
              </Button>
            </form>
          </>
        )}

        {/* Step 2: Payment Information */}
        {step === 2 && (
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
                    I agree to the Terms & Conditions, authorize the initial payment of $300 (includes first month) and recurring monthly payments of $25, and understand this will activate my membership.
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
                <Button 
                  onClick={handlePaymentStep} 
                  className="w-full bg-primary hover:glow-blue-lg" 
                  size="lg"
                  disabled={!formData.agreeToTerms || loading}
                >
                  {loading ? "Processing..." : "Proceed to Payment"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default CompleteProfile;