import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationService, { Notification, NotificationPreferences } from '@/lib/notifications';

interface NotificationCounts {
  total: number;
  unread: number;
  high_priority: number;
  by_type: Record<string, number>;
}

export const useNotifications = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const notificationService = new NotificationService();

  return useQuery<Notification[]>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return notificationService.getUserNotifications(userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes (notifications update frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUnreadCount = (userId: string | undefined) => {
  const notificationService = new NotificationService();

  return useQuery<number>({
    queryKey: ['notifications-unread-count', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return notificationService.getUnreadCount(userId);
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useNotificationPreferences = (userId: string | undefined) => {
  const notificationService = new NotificationService();

  return useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return notificationService.getUserPreferences(userId);
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const notificationService = new NotificationService();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      return notificationService.markNotificationAsRead(notificationId, userId);
    },
    onSuccess: (_, { userId }) => {
      // Invalidate both notifications list and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const notificationService = new NotificationService();

  return useMutation({
    mutationFn: async (userId: string) => {
      return notificationService.markAllNotificationsAsRead(userId);
    },
    onSuccess: (_, userId) => {
      // Invalidate both notifications list and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const notificationService = new NotificationService();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      return notificationService.deleteNotification(notificationId, userId);
    },
    onSuccess: (_, { userId }) => {
      // Invalidate both notifications list and unread count
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });
    },
  });
};
