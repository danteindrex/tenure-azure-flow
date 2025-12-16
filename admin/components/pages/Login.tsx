'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Lock, Mail, Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [verificationCode, setVerificationCode] = useState("");
  const [adminId, setAdminId] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.requiresVerification) {
        setAdminId(data.adminId);
        setStep('verify');
        toast.success("Verification code sent to your email!");
      } else if (response.ok) {
        // Direct login (shouldn't happen with 2FA)
        const maxAge = rememberMe ? 86400 * 30 : 86400;
        document.cookie = `admin_token=${data.token}; path=/; max-age=${maxAge}; samesite=lax`;
        toast.success("Login successful!");
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        setError(data.error || 'Login failed');
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId, code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok && data.requires2FASetup) {
        // Redirect to 2FA setup
        toast.success("Please complete 2FA setup");
        router.push(`/verify?adminId=${data.adminId}&email=${encodeURIComponent(data.email)}`);
      } else if (response.ok) {
        // Login successful
        const maxAge = rememberMe ? 86400 * 30 : 86400;
        document.cookie = `admin_token=${data.token}; path=/; max-age=${maxAge}; samesite=lax`;
        toast.success("Login successful!");
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        setError(data.error || 'Verification failed');
        toast.error(data.error || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Login Form */}
        <Card className="shadow-lg min-h-[600px]">
          <CardHeader className="text-center space-y-6 py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              {step === 'login' ? (
                <Shield className="h-8 w-8 text-primary-foreground" />
              ) : (
                <KeyRound className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-blue-600">Home Solutions</h1>
              <p className="text-muted-foreground text-lg">
                {step === 'login' 
                  ? 'Sign in to access the admin panel'
                  : 'Enter verification code'}
              </p>
            </div>

          </CardHeader>
          <CardContent className="px-8 pb-8">
            {step === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-8">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember-me" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label 
                  htmlFor="remember-me" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-8">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">5-Digit Verification Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="pl-10 text-center text-2xl tracking-widest"
                      placeholder="00000"
                      maxLength={5}
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Check your email for the verification code
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || verificationCode.length !== 5}
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('login');
                    setVerificationCode('');
                    setError('');
                  }}
                >
                  Back to Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}