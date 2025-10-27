import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  User, Mail, Phone, Shield, Smartphone, Key,
  Monitor, LogOut, Loader2, Edit3, Save, X,
  CheckCircle2, XCircle, AlertCircle, Trash2,
  QrCode, Copy, Download
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const ProfileNew = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    userId: "",
    joinDate: "",
    status: "Active",
  });

  const [originalData, setOriginalData] = useState({
    fullName: "",
    email: "",
    phone: "",
    userId: "",
    joinDate: "",
    status: "",
  });

  // Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Passkeys
  const [passkeys, setPasskeys] = useState<any[]>([]);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        // Fetch profile from Better Auth API
        const response = await fetch('/api/profile', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profile = await response.json();

        const joinDate = profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : '';

        const userData = {
          fullName: profile.fullName || '',
          email: profile.email || '',
          phone: profile.phone || '',
          userId: profile.userId || '',
          joinDate,
          status: profile.status || 'Active',
        };

        setProfileData(userData);
        setOriginalData(userData);

        // Load 2FA status
        const session = await authClient.getSession();
        if (session?.session?.user) {
          // Check if 2FA is enabled from session
          setTwoFactorEnabled(false); // Will be updated with Better Auth integration
        }

        // Load sessions
        await loadSessions();

        // Load passkeys
        await loadPasskeys();

      } catch (error: any) {
        console.error('Error loading profile:', error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/auth/list-sessions', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        setCurrentSessionId(data.currentSessionId);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Fallback to empty array
      setSessions([]);
    }
  };

  const loadPasskeys = async () => {
    try {
      const response = await authClient.passkey.listPasskeys();
      if (response.data) {
        setPasskeys(response.data || []);
      }
    } catch (error) {
      console.error('Error loading passkeys:', error);
      setPasskeys([]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Split fullName into firstName and lastName
      const nameParts = profileData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const updateData = {
        firstName,
        lastName,
        phone: profileData.phone,
      };

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setOriginalData(profileData);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const handleEnable2FA = async () => {
    try {
      const response = await authClient.twoFactor.enable({ password: '' });

      if (response.data) {
        setShowQRCode(true);
        setQrCodeUrl(response.data.qrCode || '');
        setBackupCodes(response.data.backupCodes || []);
        toast.success("2FA enabled successfully!");
      }
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      toast.error(error.message || "Failed to enable 2FA");
    }
  };

  const handleDisable2FA = async () => {
    try {
      const response = await authClient.twoFactor.disable({ password: '' });
      setTwoFactorEnabled(false);
      toast.success("2FA disabled successfully");
    } catch (error) {
      toast.error("Failed to disable 2FA");
    }
  };

  const handleRegisterPasskey = async () => {
    try {
      await authClient.passkey.addPasskey({
        name: `Device ${new Date().toLocaleDateString()}`
      });
      toast.success("Passkey registered successfully!");
      await loadPasskeys();
    } catch (error: any) {
      console.error('Error registering passkey:', error);
      toast.error(error.message || "Failed to register passkey");
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    try {
      await authClient.passkey.deletePasskey({ id: passkeyId });
      toast.success("Passkey deleted successfully");
      await loadPasskeys();
    } catch (error: any) {
      console.error('Error deleting passkey:', error);
      toast.error(error.message || "Failed to delete passkey");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/auth/revoke-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      toast.success("Session revoked successfully");
      await loadSessions();
    } catch (error: any) {
      console.error('Error revoking session:', error);
      toast.error(error.message || "Failed to revoke session");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your account, security, and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Overview */}
            <div className="lg:col-span-1">
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
                    <User className="w-12 h-12 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {profileData.fullName || "No name provided"}
                    </h3>
                    <p className="text-muted-foreground">
                      {profileData.userId || "Generating user ID..."}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">{profileData.status}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">Member since</p>
                    <p className="font-medium">
                      {profileData.joinDate || "Unknown"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSave}
                      className="bg-accent hover:bg-accent/90"
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Personal Information */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                      disabled={!isEditing}
                      className="bg-background/50"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="pl-10 bg-muted/50 text-muted-foreground"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed here. Contact support to update.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        disabled={!isEditing}
                        className="pl-10 bg-background/50"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6">
          {/* Two-Factor Authentication */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-accent" />
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            {!twoFactorEnabled && !showQRCode && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication (2FA) adds an additional layer of protection beyond your password.
                </p>
                <Button onClick={handleEnable2FA} className="bg-accent hover:bg-accent/90">
                  Enable 2FA
                </Button>
              </div>
            )}

            {showQRCode && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    Step 1: Scan QR Code
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="flex justify-center p-4 bg-white rounded">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Step 2: Save Backup Codes
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Store these backup codes in a safe place. You can use them to access your account if you lose your device.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {backupCodes.map((code, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-background rounded border">
                        <code className="text-sm font-mono">{code}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Backup Codes
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setTwoFactorEnabled(true);
                      setShowQRCode(false);
                      toast.success("2FA enabled successfully!");
                    }}
                    className="bg-accent hover:bg-accent/90"
                  >
                    Complete Setup
                  </Button>
                  <Button variant="outline" onClick={() => setShowQRCode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {twoFactorEnabled && !showQRCode && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Two-factor authentication is active</span>
                </div>
                <Button variant="destructive" onClick={handleDisable2FA}>
                  Disable 2FA
                </Button>
              </div>
            )}
          </Card>

          {/* Passkeys */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Key className="w-5 h-5 text-accent" />
                  Passkeys
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in with Face ID, Touch ID, or security keys
                </p>
              </div>
              <Button onClick={handleRegisterPasskey} size="sm" className="bg-accent hover:bg-accent/90">
                Add Passkey
              </Button>
            </div>

            {passkeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No passkeys registered</p>
                <p className="text-xs mt-1">Add a passkey for faster, more secure sign-in</p>
              </div>
            ) : (
              <div className="space-y-2">
                {passkeys.map((passkey) => (
                  <div key={passkey.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-accent" />
                      <div>
                        <p className="font-medium">{passkey.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(passkey.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePasskey(passkey.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* SESSIONS TAB */}
        <TabsContent value="sessions" className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="w-5 h-5 text-accent" />
                Active Sessions
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your active sessions across all devices
              </p>
            </div>

            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-accent mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.browser}</p>
                        {session.current && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{session.location}</p>
                      <p className="text-xs text-muted-foreground">
                        IP: {session.ipAddress} • Last active: {new Date(session.lastActive).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileNew;
