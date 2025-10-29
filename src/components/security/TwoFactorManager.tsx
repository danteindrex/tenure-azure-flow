import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, QrCode, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const TwoFactorManager = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      setLoading(true);
      // Check if user has twoFactorEnabled from session
      // This is available directly from the Better Auth session
      setIsEnabled(false); // Will be set from session data
    } catch (error) {
      console.error("Error checking 2FA status:", error);
    } finally {
      setLoading(false);
    }
  };

  const enableTwoFactor = async () => {
    try {
      setSetting(true);
      
      const result = await authClient.twoFactor.enable({
        password: "user_password" // This should come from a form
      });

      if (result.error) {
        toast.error(`Failed to enable 2FA: ${result.error.message}`);
        return;
      }

      setQrCode(result.data?.totpURI || "");
      setSecret(""); // Secret is embedded in the URI
      setBackupCodes(result.data?.backupCodes || []);
      setShowSetup(true);
    } catch (error) {
      console.error("2FA enable error:", error);
      toast.error("Failed to enable two-factor authentication");
    } finally {
      setSetting(false);
    }
  };

  const verifyAndComplete = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    try {
      setVerifying(true);
      
      const result = await authClient.twoFactor.verifyTotp({
        code: verificationCode
      });

      if (result.error) {
        toast.error("Invalid verification code");
        return;
      }

      toast.success("Two-factor authentication enabled successfully!");
      setIsEnabled(true);
      setShowSetup(false);
      setVerificationCode("");
    } catch (error) {
      console.error("2FA verification error:", error);
      toast.error("Failed to verify code");
    } finally {
      setVerifying(false);
    }
  };

  const disableTwoFactor = async () => {
    try {
      setSetting(true);
      
      const result = await authClient.twoFactor.disable({
        password: "user_password" // This should come from a form
      });

      if (result.error) {
        toast.error("Failed to disable 2FA");
        return;
      }

      toast.success("Two-factor authentication disabled");
      setIsEnabled(false);
      setShowSetup(false);
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast.error("Failed to disable 2FA");
    } finally {
      setSetting(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      toast.success(`${type} copied to clipboard`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          {!isEnabled ? (
            <Button
              onClick={enableTwoFactor}
              disabled={setting}
              className="bg-accent hover:bg-accent/90"
            >
              {setting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {setting ? "Setting up..." : "Enable 2FA"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={disableTwoFactor}
              disabled={setting}
            >
              {setting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {setting ? "Disabling..." : "Disable 2FA"}
            </Button>
          )}
        </div>
      </div>

      {showSetup && (
        <div className="space-y-6">
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Step 1: Scan QR Code</h4>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {qrCode && (
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Or enter this secret key manually:
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(secret, "Secret key")}
                  >
                    {copiedCode === secret ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Step 2: Verify Setup</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Enter 6-digit code from your app</Label>
                <Input
                  id="verificationCode"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  disabled={verifying}
                />
              </div>
              <Button
                onClick={verifyAndComplete}
                disabled={verifying || verificationCode.length !== 6}
                className="bg-accent hover:bg-accent/90"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {verifying ? "Verifying..." : "Complete Setup"}
              </Button>
            </div>
          </div>

          {backupCodes.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-800 mb-2">Backup Codes</h4>
                  <p className="text-sm text-amber-700 mb-4">
                    Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <code className="bg-white px-2 py-1 rounded text-sm font-mono border">
                          {code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code, "Backup code")}
                        >
                          {copiedCode === code ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(backupCodes.join('\n'), "All backup codes")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Codes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isEnabled && !showSetup && (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">Two-Factor Authentication is Active</h4>
          <p className="text-muted-foreground">
            Your account is protected with an additional layer of security
          </p>
        </div>
      )}
    </Card>
  );
};

export default TwoFactorManager;