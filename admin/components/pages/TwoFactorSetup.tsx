'use client'

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, KeyRound, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function TwoFactorSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<'send' | 'verify' | 'complete'>('send');
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const adminId = searchParams.get('adminId');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!adminId || !email) {
      toast.error("Invalid setup link");
      router.push('/login');
    }
  }, [adminId, email, router]);

  const handleSendCode = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/2fa-setup/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        setStep('verify');
        toast.success("6-digit code sent to your email!");
      } else {
        setError(data.error || 'Failed to send code');
        toast.error(data.error || 'Failed to send code');
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
      const response = await fetch('/api/auth/2fa-setup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId, code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token
        document.cookie = `admin_token=${data.token}; path=/; max-age=86400; samesite=lax`;
        
        // Save backup codes
        setBackupCodes(data.backupCodes);
        setStep('complete');
        toast.success("2FA enabled successfully!");
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

  const handleDownloadBackupCodes = () => {
    const text = `Home Solutions Admin - Backup Codes\n\nEmail: ${email}\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  const handleContinueToDashboard = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-6 py-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              {step === 'complete' ? (
                <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
              ) : (
                <Shield className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
              <p className="text-muted-foreground">
                {step === 'send' && 'Secure your account with 2FA'}
                {step === 'verify' && 'Enter the code sent to your email'}
                {step === 'complete' && 'Setup complete!'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {step === 'send' && (
              <div className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    We&apos;ll send a 6-digit verification code to <strong>{email}</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication adds an extra layer of security to your account.
                    You&apos;ll need to verify your identity with a code sent to your email.
                  </p>
                </div>

                <Button
                  onClick={handleSendCode}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Verification Code"}
                </Button>
              </div>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">6-Digit Verification Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-10 text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Check your email for the 6-digit code
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify & Enable 2FA"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleSendCode}
                  disabled={isLoading}
                >
                  Resend Code
                </Button>
              </form>
            )}

            {step === 'complete' && (
              <div className="space-y-6">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Two-factor authentication has been enabled successfully!
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold">Backup Codes</h3>
                  <p className="text-sm text-muted-foreground">
                    Save these backup codes in a safe place. You can use them to access your account if you lose access to your email.
                  </p>
                  
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="text-center py-1">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleDownloadBackupCodes}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Backup Codes
                  </Button>
                </div>

                <Button
                  onClick={handleContinueToDashboard}
                  className="w-full"
                >
                  Continue to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
