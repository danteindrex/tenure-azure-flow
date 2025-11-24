import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Crown, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { emailOtp } from "@/lib/auth-client";

const ResetPasswordConfirm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation states
  const [fieldValidation, setFieldValidation] = useState({
    otp: { isValid: false, touched: false },
    password: { isValid: false, touched: false },
    confirmPassword: { isValid: false, touched: false },
  });

  // Get email from URL parameters
  useEffect(() => {
    const emailParam = router.query.email as string;
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [router.query.email]);

  // Validation helper functions
  const validateOtp = (otp: string): boolean => {
    return otp.length === 6 && /^\d+$/.test(otp);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validateConfirmPassword = (confirmPass: string, pass: string): boolean => {
    return confirmPass.length >= 8 && confirmPass === pass;
  };

  const updateFieldValidation = (field: string, value: string, isValid: boolean) => {
    setFieldValidation(prev => ({
      ...prev,
      [field]: { isValid, touched: true }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email) {
      toast.error("Email is missing. Please start the reset process again.");
      router.push("/reset-password");
      return;
    }

    if (!validateOtp(otp)) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    if (!validatePassword(password)) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      // Reset password with OTP
      const { error } = await emailOtp.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        password: password,
      });

      if (error) {
        console.error("Password reset error:", error);

        // Handle specific error cases
        if (error.message?.toLowerCase().includes("invalid") ||
            error.message?.toLowerCase().includes("expired")) {
          toast.error("Invalid or expired code. Please request a new one.");
        } else if (error.message?.toLowerCase().includes("attempts")) {
          toast.error("Too many attempts. Please request a new code.");
        } else {
          toast.error(error.message || "Failed to reset password");
        }
        return;
      }

      // Success!
      toast.success("Password reset successful! Redirecting to login...");

      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md p-8 relative z-10 backdrop-blur-xl border border-border shadow-2xl bg-card">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Crown className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold text-foreground">Home Solutions</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Create New Password</h1>
          <p className="text-muted-foreground">
            Enter the code sent to <span className="text-accent font-medium">{email}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OTP Code */}
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-foreground">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
                const isValid = validateOtp(value);
                updateFieldValidation('otp', value, isValid);
              }}
              className={`bg-input text-foreground placeholder-muted-foreground transition-colors text-center text-lg tracking-widest font-mono ${
                fieldValidation.otp.touched
                  ? fieldValidation.otp.isValid
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-red-500 focus:border-red-500'
                  : 'border-border focus:border-accent'
              }`}
              maxLength={6}
              required
            />
            <p className="text-xs text-muted-foreground text-center">
              Code expires in 10 minutes
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  const isValid = validatePassword(e.target.value);
                  updateFieldValidation('password', e.target.value, isValid);

                  // Re-validate confirm password if it's already filled
                  if (confirmPassword) {
                    const confirmValid = validateConfirmPassword(confirmPassword, e.target.value);
                    updateFieldValidation('confirmPassword', confirmPassword, confirmValid);
                  }
                }}
                className={`bg-input text-foreground placeholder-muted-foreground transition-colors pr-10 ${
                  fieldValidation.password.touched
                    ? fieldValidation.password.isValid
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-red-500 focus:border-red-500'
                    : 'border-border focus:border-accent'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  const isValid = validateConfirmPassword(e.target.value, password);
                  updateFieldValidation('confirmPassword', e.target.value, isValid);
                }}
                className={`bg-input text-foreground placeholder-muted-foreground transition-colors pr-10 ${
                  fieldValidation.confirmPassword.touched
                    ? fieldValidation.confirmPassword.isValid
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-red-500 focus:border-red-500'
                    : 'border-border focus:border-accent'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-all duration-200"
            size="lg"
            disabled={loading}
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>

        {/* Back to Login */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Didn't receive the code?{" "}
          <Link href="/reset-password" className="text-accent hover:text-accent/80 hover:underline font-medium transition-colors">
            Request new code
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default ResetPasswordConfirm;
