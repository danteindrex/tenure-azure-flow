'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Phone, Edit3, Save, X, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { useSession, updateUser } from "@/lib/auth-client"

interface UserContact {
  contact_value: string;
  is_verified: boolean;
}

export default function ProfileTab() {
  const { data: session } = useSession()
  const user = session?.user

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phoneContact, setPhoneContact] = useState<UserContact | null>(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: user?.name || "",
    image: user?.image || "",
    phone: "",
  })

  // Fetch user phone contact
  useEffect(() => {
    const fetchUserContacts = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch('/api/user/contacts');
        if (response.ok) {
          const contacts = await response.json();
          const phoneContact = contacts.find((c: any) => c.contact_type === 'phone');
          if (phoneContact) {
            setPhoneContact(phoneContact);
            setFormData(prev => ({ ...prev, phone: phoneContact.contact_value }));
          }
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserContacts();
  }, [user?.id]);

  const handleSave = async () => {
    try {
      setSaving(true)

      // Update user profile
      await updateUser({
        name: formData.name,
        image: formData.image,
      })

      // Update phone contact if changed
      if (formData.phone !== phoneContact?.contact_value) {
        const response = await fetch('/api/user/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_type: 'phone',
            contact_value: formData.phone,
            is_primary: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update phone number');
        }

        // Update local state
        setPhoneContact({ 
          contact_value: formData.phone, 
          is_verified: false // New phone numbers need verification
        });
      }

      toast.success("Profile updated successfully!")
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast.error(error?.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      image: user?.image || "",
      phone: phoneContact?.contact_value || "",
    })
    setIsEditing(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profile Overview Card */}
      <Card className="lg:col-span-1">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.image} alt={formData.name} />
                <AvatarFallback className="bg-accent/20 text-accent text-2xl">
                  {formData.name ? getInitials(formData.name) : <User className="w-12 h-12" />}
                </AvatarFallback>
              </Avatar>

              {isEditing && (
                <Button variant="outline" size="sm" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
              )}
            </div>

            {/* User Info */}
            <div>
              <h3 className="text-xl font-bold">
                {formData.name || "No name set"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>

            {/* Verification Status */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                {user?.emailVerified ? (
                  <span className="text-green-600 font-medium">Verified</span>
                ) : (
                  <span className="text-yellow-600 font-medium">Not Verified</span>
                )}
              </div>
              {phoneContact && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  {phoneContact.is_verified ? (
                    <span className="text-green-600 font-medium">Verified</span>
                  ) : (
                    <span className="text-yellow-600 font-medium">Not Verified</span>
                  )}
                </div>
              )}
            </div>

            {/* Member Since */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details Card */}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    value={user?.email || ""}
                    disabled
                    className="pl-10 bg-muted/50 text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here. Contact support to update your email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10 bg-background/50"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
