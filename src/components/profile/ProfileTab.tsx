'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Edit3, Save, X } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export function ProfileTab({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [originalData, setOriginalData] = useState(profileData);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/profiles/me');
        if (response.ok) {
          const extendedProfile = await response.json();
          const fullProfile = {
            ...profileData,
            phone: extendedProfile.phone || "",
            streetAddress: extendedProfile.street_address || "",
            city: extendedProfile.city || "",
            state: extendedProfile.state || "",
            zipCode: extendedProfile.zip_code || "",
          };
          setProfileData(fullProfile);
          setOriginalData(fullProfile);
        }
      } catch (error) {
        console.error("Could not fetch extended profile", error);
        // It's okay if this fails, we just won't have phone/address
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update name and email via better-auth
      if (originalData.name !== profileData.name) {
        const nameResult = await authClient.updateUser({ name: profileData.name });
        if (nameResult.error) throw new Error(nameResult.error.message);
      }
      if (originalData.email !== profileData.email) {
        const emailResult = await authClient.changeEmail({ newEmail: profileData.email });
        if (emailResult.error) throw new Error(emailResult.error.message);
        toast.info("Email change initiated. Please check your inbox to verify the new address.");
      }

      // Update other profile info via custom endpoint
      const profileUpdateResult = await fetch("/api/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profileData.phone,
          street_address: profileData.streetAddress,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zipCode,
        }),
      });

      if (!profileUpdateResult.ok) {
        throw new Error("Failed to update profile details.");
      }

      toast.success("Profile updated successfully!");
      setOriginalData(profileData);
      setIsEditing(false);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin" />;
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details.</CardDescription>
            </div>
            <div className="flex gap-2">
                {isEditing ? (
                    <>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save
                        </Button>
                        <Button variant="outline" onClick={handleCancel} disabled={saving}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} disabled={!isEditing} />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input id="streetAddress" value={profileData.streetAddress} onChange={(e) => setProfileData({...profileData, streetAddress: e.target.value})} disabled={!isEditing} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={profileData.city} onChange={(e) => setProfileData({...profileData, city: e.target.value})} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={profileData.state} onChange={(e) => setProfileData({...profileData, state: e.target.value})} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input id="zipCode" value={profileData.zipCode} onChange={(e) => setProfileData({...profileData, zipCode: e.target.value})} disabled={!isEditing} />
                </div>
            </div>
        </CardContent>
    </Card>
  );
}