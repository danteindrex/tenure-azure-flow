import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { logProfileUpdate, logError } from '@/lib/audit';

export interface ProfileData {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  userId: string;
  joinDate: string;
  status: string;
  bio: string;
}

interface ProfileResponse {
  success: boolean;
  data: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
    phone: {
      countryCode: string;
      number: string;
    };
    address: {
      streetAddress: string;
      city: string;
      state: string;
      postalCode: string;
    };
  };
}

export const useProfileData = (userId: string | undefined, userName?: string, userEmail?: string, createdAt?: Date) => {
  const queryClient = useQueryClient();

  const query = useQuery<ProfileData>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await fetch('/api/profiles/me', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const result: ProfileResponse = await response.json();

      if (!result.success) {
        throw new Error('Failed to load profile data');
      }

      const { email, profile, phone, address } = result.data;

      const fullName = profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : userName || '';

      const userIdDisplay = `USR-${String(userId).slice(-6)}`;
      const joinDate = createdAt
        ? new Date(createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : '';

      return {
        fullName,
        email: email || userEmail || '',
        phoneCountryCode: phone?.countryCode || '+1',
        phoneNumber: phone?.number || '',
        streetAddress: address?.streetAddress || '',
        city: address?.city || '',
        state: address?.state || '',
        zipCode: address?.postalCode || '',
        userId: userIdDisplay,
        joinDate,
        status: 'Active',
        bio: '',
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileData) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Update user name with Better Auth
      const result = await authClient.updateUser({
        name: profileData.fullName
      });

      if (result.error) {
        throw new Error(result.error.message || result.error.code || 'Failed to update profile');
      }

      // Update additional profile data via upsert endpoint
      const fullPhone = `${profileData.phoneCountryCode}${profileData.phoneNumber}`;
      const profileUpdateResult = await fetch("/api/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profileData.email,
          phone: fullPhone,
          street_address: profileData.streetAddress,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zipCode,
        }),
      });

      if (!profileUpdateResult.ok) {
        const errorData = await profileUpdateResult.json();
        throw new Error(errorData.error || "Failed to update profile details.");
      }

      return profileData;
    },
    onSuccess: (profileData) => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return {
    ...query,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
  };
};
