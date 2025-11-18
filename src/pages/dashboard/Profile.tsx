import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, MapPin, Calendar, Shield, Edit3, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { logProfileUpdate, logError } from "@/lib/audit";
import { useProfileData, ProfileData } from "@/hooks/useProfileData";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    userId: "",
    joinDate: "",
    status: "Active",
    bio: "",
  });
  const [originalData, setOriginalData] = useState<ProfileData>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    userId: "",
    joinDate: "",
    status: "",
    bio: "",
  });

  const { data: session, isPending } = useSession();
  const user = session?.user;

  // React Query hook - replaces manual fetching
  const {
    data: fetchedProfile,
    isLoading: loading,
    updateProfileAsync,
    isUpdating: saving
  } = useProfileData(user?.id, user?.name, user?.email, user?.createdAt);

  // Sync fetched data to local state
  useEffect(() => {
    if (fetchedProfile) {
      setProfileData(fetchedProfile);
      setOriginalData(fetchedProfile);
    }
  }, [fetchedProfile]);

  const handleSave = async () => {
    if (!user) return;

    try {
      // Log profile update
      const changes = Object.keys(profileData).filter(key =>
        originalData[key as keyof ProfileData] !== profileData[key as keyof ProfileData]
      ).reduce((acc, key) => {
        acc[key] = {
          from: originalData[key as keyof ProfileData],
          to: profileData[key as keyof ProfileData]
        };
        return acc;
      }, {} as Record<string, any>);

      // Use React Query mutation
      await updateProfileAsync(profileData);

      if (Object.keys(changes).length > 0) {
        await logProfileUpdate(user.id, changes);
      }

      setOriginalData(profileData);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logError(`Error saving profile: ${errorMessage}`, user.id);
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const usStates = [
    { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>
        <div className="flex gap-2">
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
      </div>

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
                  {`${profileData.firstName} ${profileData.middleName ? profileData.middleName + ' ' : ''}${profileData.lastName}`.trim() || "No name provided"}
                </h3>
                <p className="text-muted-foreground">
                  {profileData.userId || "Generating user ID..."}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Shield className="w-4 h-4 text-green-500" />
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
          {/* Personal Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-accent" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    disabled={!isEditing}
                    className="bg-background/50"
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={profileData.middleName}
                    onChange={(e) => setProfileData({...profileData, middleName: e.target.value})}
                    disabled={!isEditing}
                    className="bg-background/50"
                    placeholder="Middle name (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    disabled={!isEditing}
                    className="bg-background/50"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2 md:w-1/2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  disabled={true}
                  className="bg-muted/50 text-muted-foreground"
                  placeholder="Email managed by authentication"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here. Use account settings to update email.
                </p>
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-accent" />
              Contact Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Select
                    value={profileData.phoneCountryCode}
                    onValueChange={(value) => setProfileData({...profileData, phoneCountryCode: value})}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-24 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">+1</SelectItem>
                      <SelectItem value="+44">+44</SelectItem>
                      <SelectItem value="+33">+33</SelectItem>
                      <SelectItem value="+49">+49</SelectItem>
                      <SelectItem value="+81">+81</SelectItem>
                      <SelectItem value="+86">+86</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    value={profileData.phoneNumber}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      // Format as US phone: (XXX) XXX-XXXX
                      if (profileData.phoneCountryCode === '+1' && value.length > 0) {
                        if (value.length <= 3) {
                          // Keep as is for 1-3 digits
                        } else if (value.length <= 6) {
                          value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                        } else {
                          value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                        }
                      }
                      setProfileData({...profileData, phoneNumber: value});
                    }}
                    disabled={!isEditing}
                    className="flex-1 bg-background/50"
                    placeholder={profileData.phoneCountryCode === '+1' ? '(555) 123-4567' : 'Enter phone number'}
                    maxLength={profileData.phoneCountryCode === '+1' ? 14 : undefined}
                  />
                </div>
                {profileData.phoneCountryCode === '+1' && profileData.phoneNumber && profileData.phoneNumber.replace(/\D/g, '').length !== 10 && (
                  <p className="text-xs text-red-500">US phone numbers must be 10 digits</p>
                )}
              </div>
            </div>
          </Card>

          {/* Address Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              Address Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  value={profileData.streetAddress}
                  onChange={(e) => setProfileData({...profileData, streetAddress: e.target.value})}
                  disabled={!isEditing}
                  className="bg-background/50"
                  placeholder="Enter street address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                    disabled={!isEditing}
                    className="bg-background/50"
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={profileData.state}
                    onValueChange={(value) => setProfileData({...profileData, state: value})}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {usStates.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={profileData.zipCode}
                    onChange={(e) => setProfileData({...profileData, zipCode: e.target.value})}
                    disabled={!isEditing}
                    className="bg-background/50"
                    placeholder="Enter ZIP code"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Bio */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              About Me
            </h3>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                disabled={!isEditing}
                className="bg-background/50 min-h-[100px]"
                placeholder="Tell us about yourself, your interests, or anything you'd like to share..."
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
