'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const SetPasswordButton = ({ email }: { email: string }) => {
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async () => {
    try {
      setLoading(true);
      const result = await authClient.requestPasswordReset({ email });

      if (result.error) {
        toast.error(`Failed to send password reset email: ${result.error.message}`);
        return;
      }

      toast.success("Password reset email sent. Please check your inbox to set your password.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast.error("Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-accent" />
            Set Password
        </CardTitle>
        <CardDescription>
            You have not set a password for your account. You can set one now.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSetPassword} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Set Password
        </Button>
      </CardContent>
    </Card>
  );
};