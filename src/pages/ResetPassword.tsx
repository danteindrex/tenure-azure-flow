import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Crown, Check } from "lucide-react";
import { toast } from "sonner";
import { forgetPassword } from "@/lib/auth-client";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setLoading(true);

      // Send OTP via email using Better Auth
      const { error } = await forgetPassword.emailOtp({
        email: email.trim(),
      });

      if (error) {
        console.error("Password reset error:", error);
        toast.error(error.message || "Failed to send reset code");
        return;
      }

      // Success - show confirmation and prepare to navigate
      setSent(true);
      toast.success("Password reset code sent to your email!");

      // Auto-redirect to enter new password page after 2 seconds
      setTimeout(() => {
        router.push(`/reset-password/confirm?email=${encodeURIComponent(email.trim())}`);
      }, 2000);

    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-success/5 rounded-full blur-[120px] pointer-events-none" />

      <Card className="glass-card w-full max-w-md p-8 hover-float relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-accent">
            <Crown className="w-8 h-8" />
            <span className="text-2xl font-bold">Tenure</span>
          </div>
        </div>

        {!sent ? (
          <>
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
              <p className="text-muted-foreground">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border-border focus:border-accent transition-colors"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:glow-blue-lg" size="lg" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link href="/login" className="text-accent hover:underline font-medium">
                Back to Login
              </Link>
            </p>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center space-y-6 animate-fade-in">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-10 h-10 text-success" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
                <p className="text-muted-foreground">
                  We've sent a password reset link to
                </p>
                <p className="text-accent font-medium mt-1">{email}</p>
              </div>

              <div className="p-4 rounded-lg bg-background/50 text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-accent hover:underline font-medium"
                >
                  try again
                </button>
              </div>

              <Link href="/login">
                <Button variant="link" className="p-0">Back to Login</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
