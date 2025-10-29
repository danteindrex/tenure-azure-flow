'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Bell, 
  Mail, 
  Smartphone, 
  Globe, 
  Moon, 
  Sun, 
  Monitor,
  Trash2,
  Download,
  Shield,
  CreditCard,
  Users,
  LogOut,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import { useSession, signOut } from "@/lib/auth-client"

export default function AccountTab() {
  const { data: session } = useSession()
  const user = session?.user

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    securityAlerts: true,
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
  })

  const [loading, setLoading] = useState(false)

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const savePreferences = async () => {
    try {
      setLoading(true)
      
      // Save preferences to backend
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      toast.success("Preferences saved successfully!")
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error("Failed to save preferences")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("Signed out successfully")
    } catch (error) {
      toast.error("Failed to sign out")
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/user/export')
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `account-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success("Data exported successfully")
    } catch (error) {
      toast.error("Failed to export data")
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            Account Overview
          </CardTitle>
          <CardDescription>
            Your account status and basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Account Status</Label>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Member Since</Label>
              <p className="text-sm text-muted-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Verified</Label>
              <Badge variant={user?.emailVerified ? "default" : "secondary"}>
                {user?.emailVerified ? "Verified" : "Not Verified"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Two-Factor Auth</Label>
              <Badge variant={user?.twoFactorEnabled ? "default" : "secondary"}>
                {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via SMS
              </p>
            </div>
            <Switch
              checked={preferences.smsNotifications}
              onCheckedChange={(checked) => handlePreferenceChange('smsNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive promotional and marketing emails
              </p>
            </div>
            <Switch
              checked={preferences.marketingEmails}
              onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Security Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Important security notifications (recommended)
              </p>
            </div>
            <Switch
              checked={preferences.securityAlerts}
              onCheckedChange={(checked) => handlePreferenceChange('securityAlerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-accent" />
            Display Preferences
          </CardTitle>
          <CardDescription>
            Customize your app appearance and language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={preferences.theme} onValueChange={(value) => handlePreferenceChange('theme', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={preferences.language} onValueChange={(value) => handlePreferenceChange('language', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={preferences.timezone} onValueChange={(value) => handlePreferenceChange('timezone', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Manage your data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={exportData}
            className="w-full justify-start"
          >
            <Download className="w-4 h-4 mr-2" />
            Export My Data
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Download a copy of all your account data in JSON format.
          </p>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Account Actions
          </CardTitle>
          <CardDescription>
            Manage your account and session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full justify-start"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
            <p className="text-sm text-muted-foreground">
              These actions cannot be undone. Please be careful.
            </p>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => toast.error("Account deletion not implemented yet")}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={loading}
          className="bg-accent hover:bg-accent/90"
        >
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  )
}