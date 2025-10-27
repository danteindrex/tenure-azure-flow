import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, Loader2, Mail, Lock, Fingerprint, Shield } from "lucide-react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { logPageVisit, logLogin, logError } from "@/lib/audit";

const LoginNew = () => {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
    twoFactorCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showPasskeyOption, setShowPasskeyOption] = useState(false);

  // Log page visit and redirect if already authenticated
  useEffect(() => {
    logPageVisit('/login');
    
    // If user is already authenticated, redirect to dashboard
    if (session?.user && !isPending) {
      router.push('/dashboard');
    }
  }, [session, isPending, router]);

  // Check if passkeys are available
  useEffect(() => {
    const checkPasskeySupport = async () => {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        setShowPasskeyOption(true);
      }
    };
    checkPasskeySupport();
  }, []);

  const handleInputChange = (field: string, value: string | boolean): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle email/password login
  const handleEmailLogin = async (): Promise<void> => {
    if (!formData.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    if (!formData.password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    try {
      setLoading(true);
      const email = formData.email.trim();

      // Sign in with Better Auth
      const result = await authClient.signIn.email({
        email: email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      if (result.error) {
        console.error("Login error:", result.error);
        await logLogin(email, false);
        await logError(`Login failed: ${result.error.message}`, undefined, {
          email: email,
          error_code: result.error.message,
        });

        // Check if 2FA is required
        if (result.error.message.includes("two-factor") || result.error.message.includes("2fa")) {
          setShowTwoFactor(true);
          toast.info("Please enter your two-factor authentication code");
          return;
        }

        let userMessage = "Invalid email or password";
        if (result.error.message.includes("not verified")) {
          userMessage = "Please verify your email address before signing in";
        } else if (result.error.message.includes("too many")) {
          userMessage = "Too many login attempts. Please try again later";
        }

        toast.error(userMessage);
        return;
      }

      // Successful login
      await logLogin(email, true, result.data?.user?.id);
      toast.success("Welcome back!");
      
      // Redirect to dashboard or intended page
      const redirectTo = router.query.redirect as string || '/dashboard';
      router.push(redirectTo);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error during login";
      await logError(`Unexpected login error: ${errorMessage}`, undefined, {
        email: formData.email.trim()
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA verification
  const handleTwoFactorVerification = async (): Promise<void> => {
    if (!formData.twoFactorCode || formData.twoFactorCode.length !== 6) {
      toast.error("Please enter your 6-digit authentication code");
      return;
    }

    try {
      setLoading(true);

      const result = await authClient.twoFactor.verify({
        code: formData.twoFactorCode
      });

      if (result.error) {
        toast.error("Invalid authentication code");
        return;
      }

      await logLogin(formData.email, true, result.data?.user?.id);
      toast.success("Welcome back!");
      
      const redirectTo = router.query.redirect as string || '/dashboard';
      router.push(redirectTo);

    } catch (err) {
      toast.error("Two-factor authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle passkey login
  const handlePasskeyLogin = async (): Promise<void> => {
    try {
      setLoading(true);

      const result = await authClient.passkey.authenticate();

      if (result.error) {
        console.error("Passkey login error:", result.error);
        toast.error("Passkey authentication failed");
        return;
      }

      await logLogin("passkey", true, result.data?.user?.id);
      toast.success("Welcome back!");
      
      const redirectTo = router.query.redirect as string || '/dashboard';
      router.push(redirectTo);

    } catch (err) {
      console.error("Passkey error:", err);
      toast.error("Passkey authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async (): Promise<void> => {
    try {
      setLoading(true);

      await logLogin("google_oauth", false);

      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/dashboard`
      });

      if (result.error) {
        await logLogin("google_oauth", false);
        await logError(`Google login failed: ${result.error.message}`, undefined, {
          provider: 'google',
          error_code: result.error.message
        });
        toast.error("Google login failed");
        return;
      }

      await logLogin("google_oauth", true);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Google login failed";
      await logError(`Google login error: ${errorMessage}`, undefined, {
        provider: 'google'
      });
      toast.error("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (): Promise<void> => {
    if (!formData.email.trim()) {
      toast.error("Please enter your email address first");
      return;
    }

    try {
      setLoading(true);

      const result = await authClient.forgetPassword({
        email: formData.email.trim(),
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (result.error) {
        toast.error("Failed to send reset email");
        return;
      }

      toast.success("Password reset email sent! Check your inbox.");

    } catch (err) {
      toast.error("Failed to send reset email");
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

      <Card className="glass-card w-full max-w-md p-8 hover-float relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 text-accent">
            <Crown className="w-8 h-8" />
            <span className="text-2xl font-bold">Tenure</span>
          </div>
        </div>

        {!showTwoFactor ? (
          <>
            {/* Login Form */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to your account</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailLogin()}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked: boolean) => handleInputChange("rememberMe", checked)}
                    disabled={loading}
                  />
                  <Label htmlFor="rememberMe" className="text-sm">
                    Remember me
                  </Label>
                </div>

                <Button
                  variant="ghost"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-accent hover:text-accent/80 p-0 h-auto"
                >
                  Forgot password?
                </Button>
              </div>
            </div>

            <Button
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full mt-6 bg-accent hover:bg-accent/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Alternative Login Methods */}
            <div className="space-y-3">
              {/* Google Login */}
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
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

              {/* Passkey Login */}
              {showPasskeyOption && (
                <Button
                  variant="outline"
                  onClick={handlePasskeyLogin}
                  disabled={loading}
                  className="w-full"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Sign in with Passkey
                </Button>
              )}
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-accent hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Two-Factor Authentication */}
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-accent mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Two-Factor Authentication</h1>
              <p className="text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Authentication Code</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="000000"
                  value={formData.twoFactorCode}
                  onChange={(e) => handleInputChange("twoFactorCode", e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-background/50 border-border focus:border-accent transition-colors text-center text-2xl tracking-widest"
                  maxLength={6}
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleTwoFactorVerification()}
                />
              </div>
            </div>

            <Button
              onClick={handleTwoFactorVerification}
              disabled={loading || formData.twoFactorCode.length !== 6}
              className="w-full mt-6 bg-accent hover:bg-accent/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {loading ? "Verifying..." : "Verify Code"}
            </Button>

            <div className="text-center mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowTwoFactor(false)}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back to login
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default LoginNew;