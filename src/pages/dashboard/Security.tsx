import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, Fingerprint, History, AlertTriangle } from "lucide-react";
import PasskeyManager from "@/components/security/PasskeyManager";
import TwoFactorManager from "@/components/security/TwoFactorManager";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

const Security = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      
      // TODO: Implement password reset with Better Auth
      // Based on Better Auth transcript: authClient.forgetPassword(email)
      // const result = await authClient.forgetPassword(session?.user?.email || "");
      toast.info("Password reset functionality will be implemented soon");
    } catch (error) {
      toast.error("Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      setLoading(true);
      
      const result = await authClient.revokeOtherSessions();

      if (result.error) {
        toast.error("Failed to revoke sessions");
        return;
      }

      toast.success("All other sessions have been revoked");
    } catch (error) {
      toast.error("Failed to revoke sessions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground">Manage your account security and authentication methods</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="passkeys">Passkeys</TabsTrigger>
          <TabsTrigger value="two-factor">Two-Factor</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold">Password</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Change your password to keep your account secure
              </p>
              <Button
                onClick={handleChangePassword}
                disabled={loading}
                variant="outline"
              >
                Change Password
              </Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Fingerprint className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold">Passkeys</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Use Face ID, Touch ID, or Windows Hello for secure login
              </p>
              <Button variant="outline">
                Manage Passkeys
              </Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Add an extra layer of security with TOTP codes
              </p>
              <Button variant="outline">
                Configure 2FA
              </Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <History className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold">Active Sessions</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Manage devices that are signed into your account
              </p>
              <Button
                onClick={handleRevokeAllSessions}
                disabled={loading}
                variant="outline"
              >
                Revoke All Sessions
              </Button>
            </Card>
          </div>

          {/* Security Recommendations */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold">Security Recommendations</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Enable Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Protect your account with an additional security layer
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Enable
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">Add a Passkey</h4>
                  <p className="text-sm text-muted-foreground">
                    Use biometric authentication for faster, secure login
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Add Passkey
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="passkeys">
          <PasskeyManager />
        </TabsContent>

        <TabsContent value="two-factor">
          <TwoFactorManager />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Active Sessions</h3>
                <p className="text-muted-foreground">
                  Devices and browsers that are currently signed into your account
                </p>
              </div>
              <Button
                onClick={handleRevokeAllSessions}
                disabled={loading}
                variant="destructive"
              >
                Revoke All Sessions
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                    <History className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium">Current Session</h4>
                    <p className="text-sm text-muted-foreground">
                      {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                       navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                       navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'} • 
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-green-600 font-medium">Active</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Revoking all sessions will sign you out of all devices except this one. 
                You'll need to sign in again on those devices.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Security;