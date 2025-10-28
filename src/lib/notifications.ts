// Notification system service for managing user notifications
import SupabaseClientSingleton from './supabase';

export interface Notification {
  id?: string;
  user_id?: string;
  type: 'payment' | 'queue' | 'milestone' | 'reminder' | 'system' | 'bonus' | 'security' | 'profile' | 'support';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read?: boolean;
  is_archived?: boolean;
  action_url?: string;
  action_text?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  read_at?: string;
  archived_at?: string;
  expires_at?: string;
}

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  in_app_notifications?: boolean;
  payment_notifications?: boolean;
  queue_notifications?: boolean;
  milestone_notifications?: boolean;
  reminder_notifications?: boolean;
  system_notifications?: boolean;
  bonus_notifications?: boolean;
  security_notifications?: boolean;
  profile_notifications?: boolean;
  support_notifications?: boolean;
  digest_frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationTemplate {
  id?: string;
  name: string;
  type: 'payment' | 'queue' | 'milestone' | 'reminder' | 'system' | 'bonus' | 'security' | 'profile' | 'support';
  title_template: string;
  message_template: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

class NotificationService {
  private supabase: ReturnType<typeof SupabaseClientSingleton.getInstance>;

  constructor() {
    // Always use singleton for database operations (not auth)
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  // Notifications
  async getNotifications(userId: string, options?: {
    limit?: number;
    offset?: number;
    type?: string;
    is_read?: boolean;
    is_archived?: boolean;
  }): Promise<Notification[]> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.is_read !== undefined) {
        query = query.eq('is_read', options.is_read);
      }

      if (options?.is_archived !== undefined) {
        query = query.eq('is_archived', options.is_archived);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  async getNotificationCounts(userId: string): Promise<{
    total: number;
    unread: number;
    high_priority: number;
    by_type: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('type, priority, is_read, is_archived')
        .eq('user_id', userId)
        .eq('is_archived', false);

      if (error) {
        console.error('Error fetching notification counts:', error);
        return { total: 0, unread: 0, high_priority: 0, by_type: {} };
      }

      const notifications = data || [];
      const counts = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        high_priority: notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length,
        by_type: notifications.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return counts;
    } catch (error) {
      console.error('Error in getNotificationCounts:', error);
      return { total: 0, unread: 0, high_priority: 0, by_type: {} };
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }

  async archiveNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error archiving notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in archiveNotification:', error);
      return false;
    }
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getNotificationPreferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences
        });

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error);
      return false;
    }
  }

  async initializeNotificationPreferences(userId: string): Promise<boolean> {
    try {
      const defaultPreferences: NotificationPreferences = {
        user_id: userId,
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        in_app_notifications: true,
        payment_notifications: true,
        queue_notifications: true,
        milestone_notifications: true,
        reminder_notifications: true,
        system_notifications: true,
        bonus_notifications: true,
        security_notifications: true,
        profile_notifications: true,
        support_notifications: true,
        digest_frequency: 'daily',
        timezone: 'UTC'
      };

      const { error } = await this.supabase
        .from('notification_preferences')
        .insert(defaultPreferences);

      if (error) {
        console.error('Error initializing notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in initializeNotificationPreferences:', error);
      return false;
    }
  }

  // Create notification (for system use)
  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification | null> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }

  // Get notification templates
  async getNotificationTemplates(type?: string): Promise<NotificationTemplate[]> {
    try {
      let query = this.supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notification templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotificationTemplates:', error);
      return [];
    }
  }
}

export default NotificationService;
