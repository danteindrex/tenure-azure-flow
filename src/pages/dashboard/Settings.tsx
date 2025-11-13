import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe, 
  Moon, 
  Sun,
  Save,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import SettingsService, { UserSettings, NotificationPreferences, SecuritySettings, PaymentSettings, PrivacySettings, AppearanceSettings } from "@/lib/settings";
import { logError } from "@/lib/audit";
import { useTheme } from "@/contexts/ThemeContext";
import Security from "./Security";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Settings state
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings | null>(null);

  const { data: session, isPending } = useSession();
  const user = session?.user;
  const { theme: currentTheme, setTheme: setCurrentTheme } = useTheme();

  // Memoize the settings service to prevent recreation on every render
  const settingsService = useMemo(() => new SettingsService(), []);

  // Load all user settings
  useEffect(() => {
    let isMounted = true;
    
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Load all settings in parallel
        const [
          userSettingsData,
          notificationData,
          paymentData,
          appearanceData
        ] = await Promise.all([
          settingsService.getUserSettings(user.id),
          settingsService.getNotificationPreferences(user.id),
          settingsService.getPaymentSettings(user.id),
          settingsService.getAppearanceSettings(user.id)
        ]);

        // Only update state if component is still mounted
        if (isMounted) {
          // If no settings exist, initialize defaults
          if (!userSettingsData) {
            await settingsService.initializeUserSettings(user.id);
            // Reload settings after initialization
            const reloadedSettings = await settingsService.getUserSettings(user.id);
            setUserSettings(reloadedSettings);
          } else {
            setUserSettings(userSettingsData);
          }

          setNotificationPreferences(notificationData);
          setPaymentSettings(paymentData);
          setAppearanceSettings(appearanceData);
        }

      } catch (error) {
        console.error('Error loading settings:', error);
        if (isMounted) {
          await logError(`Error loading settings: ${error.message}`, user.id);
          toast.error("Failed to load settings");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only depend on user.id, not the entire user object

  // Sync theme from database with theme context
  useEffect(() => {
    if (userSettings?.theme && userSettings.theme !== currentTheme) {
      setCurrentTheme(userSettings.theme as 'light' | 'dark' | 'system');
    }
  }, [userSettings?.theme, currentTheme, setCurrentTheme]);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Save all settings
      const promises = [];
      
      if (userSettings) {
        promises.push(settingsService.upsertUserSettings(user.id, userSettings));
      }
      if (notificationPreferences) {
        promises.push(settingsService.updateNotificationPreferences(user.id, notificationPreferences));
      }
      if (securitySettings) {
        promises.push(settingsService.updateSecuritySettings(user.id, securitySettings));
      }
      if (paymentSettings) {
        promises.push(settingsService.updatePaymentSettings(user.id, paymentSettings));
      }
      if (privacySettings) {
        promises.push(settingsService.updatePrivacySettings(user.id, privacySettings));
      }
      if (appearanceSettings) {
        promises.push(settingsService.updateAppearanceSettings(user.id, appearanceSettings));
      }

      await Promise.all(promises);
      
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error('Error saving settings:', error);
      await logError(`Error saving settings: ${error.message}`, user.id);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success("Password changed successfully!");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      await logError(`Error changing password: ${error.message}`, user.id);
      toast.error(error.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (category: string, key: string, value: any) => {
    switch (category) {
      case 'user':
        setUserSettings(prev => prev ? { ...prev, [key]: value } : null);
        break;
      case 'notifications':
        setNotificationPreferences(prev => prev ? { ...prev, [key]: value } : null);
        break;
      case 'security':
        setSecuritySettings(prev => prev ? { ...prev, [key]: value } : null);
        break;
      case 'payment':
        setPaymentSettings(prev => prev ? { ...prev, [key]: value } : null);
        break;
      case 'privacy':
        setPrivacySettings(prev => prev ? { ...prev, [key]: value } : null);
        break;
      case 'appearance':
        setAppearanceSettings(prev => prev ? { ...prev, [key]: value } : null);
        break;
    }
  };

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and security</p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              <Button 
                variant={activeTab === 'notifications' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              <Button 
                variant={activeTab === 'security' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('security')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Security
              </Button>
              <Button 
                variant={activeTab === 'appearance' ? 'default' : 'ghost'} 
                className="w-full justify-start"
                onClick={() => setActiveTab('appearance')}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Appearance
              </Button>
              <Button
                variant={activeTab === 'payment' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('payment')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Payment
              </Button>
              <Button
                variant={activeTab === 'billing' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('billing')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </Button>
            </nav>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-accent" />
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={userSettings?.email_notifications || false}
                    onCheckedChange={(checked) => handleSettingChange("user", "email_notifications", checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get alerts via text message</p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={userSettings?.sms_notifications || false}
                    onCheckedChange={(checked) => handleSettingChange("user", "sms_notifications", checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser and mobile push notifications</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={userSettings?.push_notifications || false}
                    onCheckedChange={(checked) => handleSettingChange("user", "push_notifications", checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive promotional content and updates</p>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={userSettings?.marketing_emails || false}
                    onCheckedChange={(checked) => handleSettingChange("user", "marketing_emails", checked)}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Security />
            </div>
          )}

          {/* Privacy Tab */}

          {/* Payment Settings Tab */}
          {activeTab === 'payment' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                Payment Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-renewal">Auto Renewal</Label>
                    <p className="text-sm text-muted-foreground">Automatically renew your membership</p>
                  </div>
                  <Switch
                    id="auto-renewal"
                    checked={userSettings?.auto_renewal || false}
                    onCheckedChange={(checked) => handleSettingChange("user", "auto_renewal", checked)}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Default Payment Method</Label>
                  <Select
                    value={userSettings?.payment_method || "card"}
                    onValueChange={(value) => handleSettingChange("user", "payment_method", value)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Credit Card</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="billing-cycle">Billing Cycle</Label>
                  <Select
                    value={userSettings?.billing_cycle || "monthly"}
                    onValueChange={(value) => handleSettingChange("user", "billing_cycle", value)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                Billing & Payment Methods
              </h3>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label>Manage Payment Method</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update your credit card, billing address, and view your payment history through Stripe's secure portal.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    className="w-full bg-accent hover:bg-accent/90"
                    onClick={async () => {
                      if (!user) return;
                      try {
                        setSaving(true);
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/subscriptions/${user.id}/update-payment`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            returnUrl: window.location.href
                          })
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.message || 'Failed to create billing portal session');
                        }

                        const result = await response.json();
                        if (result.success && result.data?.url) {
                          window.location.href = result.data.url;
                        } else {
                          throw new Error('Invalid response from server');
                        }
                      } catch (error: any) {
                        console.error('Error opening billing portal:', error);
                        await logError(`Error opening billing portal: ${error.message}`, user.id);
                        toast.error(error.message || 'Failed to open billing portal');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening Billing Portal...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Open Billing Portal
                      </>
                    )}
                  </Button>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">What you can do in the Billing Portal:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Update your credit card information</li>
                      <li>Change your billing address</li>
                      <li>View payment history and invoices</li>
                      <li>Download receipts for your records</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Note: Subscription cancellation is not available. Please contact support for cancellation requests.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    🔒 Powered by Stripe - Your payment information is secure and encrypted
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-accent" />
                Appearance
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={currentTheme}
                    onValueChange={(value) => {
                      const themeValue = value as 'light' | 'dark' | 'system';
                      setCurrentTheme(themeValue);
                      handleSettingChange("user", "theme", themeValue);
                    }}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    System will automatically switch between light and dark based on your device settings.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={userSettings?.language || "en"}
                    onValueChange={(value) => handleSettingChange("user", "language", value)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="ko">Korean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
