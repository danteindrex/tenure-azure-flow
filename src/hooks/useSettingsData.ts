import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SettingsService, {
  UserSettings,
  NotificationPreferences,
  SecuritySettings,
  PaymentSettings,
  PrivacySettings,
  AppearanceSettings
} from '@/lib/settings';

export const useUserSettings = (userId: string | undefined) => {
  const settingsService = new SettingsService();

  return useQuery<UserSettings | null>({
    queryKey: ['user-settings', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      let settings = await settingsService.getUserSettings(userId);

      // If no settings exist, initialize defaults
      if (!settings) {
        await settingsService.initializeUserSettings(userId);
        settings = await settingsService.getUserSettings(userId);
      }

      return settings;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useNotificationSettings = (userId: string | undefined) => {
  const settingsService = new SettingsService();

  return useQuery<NotificationPreferences | null>({
    queryKey: ['notification-settings', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return settingsService.getNotificationPreferences(userId);
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const usePaymentSettings = (userId: string | undefined) => {
  const settingsService = new SettingsService();

  return useQuery<PaymentSettings | null>({
    queryKey: ['payment-settings', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return settingsService.getPaymentSettings(userId);
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useAppearanceSettings = (userId: string | undefined) => {
  const settingsService = new SettingsService();

  return useQuery<AppearanceSettings | null>({
    queryKey: ['appearance-settings', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return settingsService.getAppearanceSettings(userId);
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  const settingsService = new SettingsService();

  return useMutation({
    mutationFn: async ({
      userId,
      userSettings,
      notificationPreferences,
      securitySettings,
      paymentSettings,
      privacySettings,
      appearanceSettings
    }: {
      userId: string;
      userSettings?: UserSettings;
      notificationPreferences?: NotificationPreferences;
      securitySettings?: SecuritySettings;
      paymentSettings?: PaymentSettings;
      privacySettings?: PrivacySettings;
      appearanceSettings?: AppearanceSettings;
    }) => {
      const promises = [];

      if (userSettings) {
        promises.push(settingsService.upsertUserSettings(userId, userSettings));
      }
      if (notificationPreferences) {
        promises.push(settingsService.updateNotificationPreferences(userId, notificationPreferences));
      }
      if (securitySettings) {
        promises.push(settingsService.updateSecuritySettings(userId, securitySettings));
      }
      if (paymentSettings) {
        promises.push(settingsService.updatePaymentSettings(userId, paymentSettings));
      }
      if (privacySettings) {
        promises.push(settingsService.updatePrivacySettings(userId, privacySettings));
      }
      if (appearanceSettings) {
        promises.push(settingsService.updateAppearanceSettings(userId, appearanceSettings));
      }

      await Promise.all(promises);
      return true;
    },
    onSuccess: (_, { userId }) => {
      // Invalidate all settings queries
      queryClient.invalidateQueries({ queryKey: ['user-settings', userId] });
      queryClient.invalidateQueries({ queryKey: ['notification-settings', userId] });
      queryClient.invalidateQueries({ queryKey: ['payment-settings', userId] });
      queryClient.invalidateQueries({ queryKey: ['appearance-settings', userId] });
    },
  });
};
