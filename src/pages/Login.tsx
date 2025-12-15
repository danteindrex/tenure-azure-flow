import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { BeamsBackground } from "@/components/ui/beams-background";
import { Crown, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import { logPageVisit, logLogin, logError } from "@/lib/audit";
import { useTheme } from "@/contexts/ThemeContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme, setTheme, actualTheme } = useTheme();
  
  // Field validation states
  const [fieldValidation, setFieldValidation] = useState({
    email: { isValid: false, touched: false },
    password: { isValid: false, touched: false },
  });

  // Validation helper functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const updateFieldValidation = (field: string, value: string, isValid: boolean) => {
    setFieldValidation(prev => ({
      ...prev,
      [field]: { isValid, touched: true }
    }));
  };

  // Validation asterisk component (for future required fields)
  const ValidationAsterisk = ({ isValid, touched }: { isValid: boolean; touched: boolean }) => {
    let colorClass = 'text-gray-500'; // Default gray for untouched
    
    if (touched) {
      colorClass = isValid ? 'text-green-500' : 'text-red-500';
    }
    
    return <span className={colorClass}>*</span>;
  };

  // Log page visit and handle URL parameters
  useEffect(() => {
    logPageVisit('/login');

    // Check for URL parameters (from signup redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const messageParam = urlParams.get('message');
    const verifiedParam = urlParams.get('verified');

    // Pre-fill email if provided
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    // Show message if provided
    if (messageParam) {
      toast.success(decodeURIComponent(messageParam), { duration: 5000 });
    } else if (verifiedParam === 'true') {
      toast.success('Email verified! Please login to continue.', { duration: 5000 });
    }
  }, []);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setTheme(actualTheme === 'light' ? 'dark' : 'light');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Log login attempt
      await logLogin(email.trim(), false); // Will update to true if successful

      const { data, error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (error) {

        
        // Log failed login attempt
        await logLogin(email.trim(), false);
        await logError(`Login failed: ${error.message}`, undefined, {
          email: email.trim(),
          error_code: error.message
        });

        // Handle email verification - send OTP for existing user
        const errorMsg = (error.message || '').toLowerCase();
        if (errorMsg.includes("email not verified") || 
            errorMsg.includes("not verified") || 
            errorMsg.includes("verify") ||
            errorMsg.includes("verification")) {
          
          // Redirect to signup for email verification - let signup page handle OTP
          toast.info("Email not verified. Redirecting to complete verification...");
          const redirectUrl = `/signup?step=2&email=${encodeURIComponent(email.trim())}&needsVerification=true`;
          
          // Use window.location for immediate redirect
          window.location.href = redirectUrl;
          return;
        }
        
        throw error;
      }

      // Log successful login
      await logLogin(email.trim(), true, data?.user?.id);

      // Check if user was redirected from signup flow
      const urlParams = new URLSearchParams(window.location.search);
      const stepParam = urlParams.get('step');

      if (stepParam === '3') {
        // User was in the middle of signup - redirect back to signup at step 3
        toast.success("Logged in! Continuing your signup...");
        router.replace("/signup?step=3");
      } else {
        toast.success("Logged in successfully");
        router.replace("/auth/callback");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // Log Google login attempt
      await logLogin("google_oauth", false);

      // Use callbackURL - Better Auth will set session cookies first, then redirect
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/auth/callback`,
      });

    } catch (err: any) {
      await logError(`Google login error: ${err?.message}`, undefined, {
        provider: 'google'
      });
      toast.error("Google login failed");
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
        className="absolute top-4 right-4 z-20 flex items-center gap-2 hover:bg-accent/10 p-2"
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

      <LiquidGlassCard className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl" glassSize="lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Crown className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold text-foreground">Home Solutions</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                const isValid = validateEmail(e.target.value);
                updateFieldValidation('email', e.target.value, isValid);
              }}
              className={`bg-input text-foreground placeholder-muted-foreground transition-colors ${
                fieldValidation.email.touched 
                  ? fieldValidation.email.isValid 
                    ? 'border-green-500 focus:border-green-500' 
                    : 'border-red-500 focus:border-red-500'
                  : 'border-border focus:border-accent'
              }`}
              required
            />
            {fieldValidation.email.touched && !fieldValidation.email.isValid && email.length > 0 && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span>⚠</span>
                Please enter a valid email address
              </p>
            )}
            {fieldValidation.email.touched && fieldValidation.email.isValid && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span>✓</span>
                Valid email address
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                const isValid = validatePassword(e.target.value);
                updateFieldValidation('password', e.target.value, isValid);
              }}
              className={`bg-input text-foreground placeholder-muted-foreground transition-colors ${
                fieldValidation.password.touched 
                  ? fieldValidation.password.isValid 
                    ? 'border-green-500 focus:border-green-500' 
                    : 'border-red-500 focus:border-red-500'
                  : 'border-border focus:border-accent'
              }`}
              required
            />
            {fieldValidation.password.touched && !fieldValidation.password.isValid && password.length > 0 && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span>⚠</span>
                Password must be at least 8 characters
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-border bg-input text-accent focus:ring-accent/20" />
              <span className="text-muted-foreground">Remember me</span>
            </label>
            <Link href="/reset-password" className="text-accent hover:text-accent/80 hover:underline transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-all duration-200" size="lg" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {/* Social Login */}
        <div className="w-full">
          <Button 
            className="w-full bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground transition-colors" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {"Don't"} have an account?{" "}
          <Link href="/signup" className="text-accent hover:text-accent/80 hover:underline font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </LiquidGlassCard>
    </BeamsBackground>
  );
};

export default Login;
