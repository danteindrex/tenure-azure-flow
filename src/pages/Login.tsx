import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { authClient } from "@/lib/auth-client";
import { logPageVisit, logLogin, logError } from "@/lib/audit";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
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

  // Log page visit
  useEffect(() => {
    logPageVisit('/login');
  }, []);

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
      
      toast.success("Logged in successfully");
      router.replace("/auth/callback");
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

      const { data, error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        await logLogin("google_oauth", false);
        await logError(`Google login failed: ${error.message}`, undefined, {
          provider: 'google',
          error_code: error.message
        });
        toast.error("Google login failed");
        return;
      }

      // Log successful Google login attempt (will be completed after redirect)
      await logLogin("google_oauth", true);
      
    } catch (err: any) {
      await logError(`Google login error: ${err?.message}`, undefined, { 
        provider: 'google' 
      });
      toast.error("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Next.js Dark Theme Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-cyan-500/6 rounded-full blur-[90px] pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 relative z-10 backdrop-blur-xl border border-gray-800 shadow-2xl" style={{ backgroundColor: '#171717' }}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Crown className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">Home Solutions</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-200">Email</Label>
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
              className={`bg-gray-800/50 focus:ring-blue-500/20 text-white placeholder-gray-400 transition-colors ${
                fieldValidation.email.touched 
                  ? fieldValidation.email.isValid 
                    ? 'border-green-500 focus:border-green-500' 
                    : 'border-red-500 focus:border-red-500'
                  : 'border-gray-700 focus:border-blue-500'
              }`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-200">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                const isValid = validatePassword(e.target.value);
                updateFieldValidation('password', e.target.value, isValid);
              }}
              className={`bg-gray-800/50 focus:ring-blue-500/20 text-white placeholder-gray-400 transition-colors ${
                fieldValidation.password.touched 
                  ? fieldValidation.password.isValid 
                    ? 'border-green-500 focus:border-green-500' 
                    : 'border-red-500 focus:border-red-500'
                  : 'border-gray-700 focus:border-blue-500'
              }`}
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/20" />
              <span className="text-gray-400">Remember me</span>
            </label>
            <Link href="/reset-password" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all duration-200" size="lg" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-gray-900 px-2 text-gray-400">Or continue with</span>
          </div>
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white transition-colors" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Signing in..." : "Google"}
          </Button>
          <Button className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white transition-colors" disabled>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple
          </Button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          {"Don't"} have an account?{" "}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default Login;
