'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"
import TwoFactorManager from "@/components/security/TwoFactorManager"
import PasskeyManager from "@/components/security/PasskeyManager"
import { ChangePasswordForm } from "@/components/security/ChangePasswordForm";
import { SetPasswordButton } from "@/components/security/SetPasswordButton";

export function SecurityTab({ user }) {
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPasswordAccount = async () => {
      try {
        const response = await fetch('/api/auth/has-password');
        if (response.ok) {
          const data = await response.json();
          setHasPassword(data.hasPasswordAccount);
        }
      } catch (error) {
        console.error("Error checking password account:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPasswordAccount();
  }, []);

  return (
    <div className="space-y-6">
      {loading ? (
        <p>Loading...</p>
      ) : hasPassword ? (
        <ChangePasswordForm />
      ) : (
        <SetPasswordButton email={user.email} />
      )}
      <TwoFactorManager />
      <PasskeyManager />
    </div>
  )
}