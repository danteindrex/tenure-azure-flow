// Mock notification service for testing when database tables don't exist
import { BUSINESS_RULES } from './business-logic';

export interface MockNotification {
  id: string;
  user_id: string;
  type: 'payment' | 'queue' | 'milestone' | 'reminder' | 'system' | 'bonus' | 'security' | 'profile' | 'support';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  is_archived: boolean;
  action_url?: string;
  action_text?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
  archived_at?: string;
  expires_at?: string;
}

class MockNotificationService {
  private storageKey = 'mock_notifications';

  // Get notifications from localStorage
  getNotifications(userId: string): MockNotification[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const allNotifications = JSON.parse(stored);
      return allNotifications.filter((n: MockNotification) => n.user_id === userId)
        .sort((a: MockNotification, b: MockNotification) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } catch (error) {
      console.error('Error getting mock notifications:', error);
      return [];
    }
  }

  // Create a new notification
  createNotification(notification: Omit<MockNotification, 'id' | 'created_at'>): MockNotification {
    try {
      const newNotification: MockNotification = {
        ...notification,
        id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString()
      };

      const stored = localStorage.getItem(this.storageKey);
      const allNotifications = stored ? JSON.parse(stored) : [];
      allNotifications.push(newNotification);
      
      localStorage.setItem(this.storageKey, JSON.stringify(allNotifications));
      return newNotification;
    } catch (error) {
      console.error('Error creating mock notification:', error);
      throw error;
    }
  }

  // Mark notification as read
  markAsRead(notificationId: string, userId: string): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return false;
      
      const allNotifications = JSON.parse(stored);
      const notificationIndex = allNotifications.findIndex(
        (n: MockNotification) => n.id === notificationId && n.user_id === userId
      );
      
      if (notificationIndex === -1) return false;
      
      allNotifications[notificationIndex].is_read = true;
      allNotifications[notificationIndex].read_at = new Date().toISOString();
      
      localStorage.setItem(this.storageKey, JSON.stringify(allNotifications));
      return true;
    } catch (error) {
      console.error('Error marking mock notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  markAllAsRead(userId: string): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return false;
      
      const allNotifications = JSON.parse(stored);
      const readAt = new Date().toISOString();
      
      allNotifications.forEach((n: MockNotification) => {
        if (n.user_id === userId && !n.is_read) {
          n.is_read = true;
          n.read_at = readAt;
        }
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(allNotifications));
      return true;
    } catch (error) {
      console.error('Error marking all mock notifications as read:', error);
      return false;
    }
  }

  // Delete notification
  deleteNotification(notificationId: string, userId: string): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return false;
      
      const allNotifications = JSON.parse(stored);
      const filteredNotifications = allNotifications.filter(
        (n: MockNotification) => !(n.id === notificationId && n.user_id === userId)
      );
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredNotifications));
      return true;
    } catch (error) {
      console.error('Error deleting mock notification:', error);
      return false;
    }
  }

  // Get notification counts
  getNotificationCounts(userId: string): {
    total: number;
    unread: number;
    high_priority: number;
    by_type: Record<string, number>;
  } {
    const notifications = this.getNotifications(userId);
    
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      high_priority: notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length,
      by_type: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Clear all test notifications
  clearTestNotifications(userId: string): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return false;
      
      const allNotifications = JSON.parse(stored);
      const filteredNotifications = allNotifications.filter(
        (n: MockNotification) => !(n.user_id === userId && n.metadata?.test === true)
      );
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredNotifications));
      return true;
    } catch (error) {
      console.error('Error clearing test notifications:', error);
      return false;
    }
  }

  // Create test notification scenarios
  createTestNotification(userId: string, scenario: string): MockNotification {
    const scenarios: Record<string, Omit<MockNotification, 'id' | 'created_at' | 'user_id'>> = {
      joining_fee_required: {
        type: 'payment',
        title: 'Joining Fee Required',
        message: `Please complete your joining fee of $${BUSINESS_RULES.JOINING_FEE} to activate your membership and start your tenure tracking. This is required to participate in the payout system.`,
        priority: 'urgent',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/payments',
        action_text: 'Pay Now',
        metadata: {
          amount: BUSINESS_RULES.JOINING_FEE,
          payment_type: 'joining_fee',
          test: true
        }
      },
      monthly_payment_due: {
        type: 'payment',
        title: 'Monthly Payment Due Soon',
        message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is due in 3 days. Ensure payment to maintain continuous tenure.`,
        priority: 'high',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/payments',
        action_text: 'Pay Now',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          days_until_due: 3,
          test: true
        }
      },
      payment_overdue: {
        type: 'payment',
        title: 'Monthly Payment Overdue',
        message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is 5 days overdue. You have ${BUSINESS_RULES.PAYMENT_GRACE_DAYS - 5} days remaining before default.`,
        priority: 'urgent',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/payments',
        action_text: 'Pay Immediately',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          days_overdue: 5,
          grace_days_remaining: BUSINESS_RULES.PAYMENT_GRACE_DAYS - 5,
          test: true
        }
      },
      payment_default_risk: {
        type: 'payment',
        title: 'Payment Default - Membership at Risk',
        message: `Your membership is in default due to missed monthly payments. You have exceeded the ${BUSINESS_RULES.PAYMENT_GRACE_DAYS}-day grace period. Pay immediately to avoid losing your queue position permanently.`,
        priority: 'urgent',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/payments',
        action_text: 'Save Membership',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          default_status: true,
          test: true
        }
      },
      payment_failed: {
        type: 'payment',
        title: 'Payment Failed',
        message: `Your recent payment of $${BUSINESS_RULES.MONTHLY_FEE} failed. Reason: Insufficient funds. Please update your payment method and try again.`,
        priority: 'high',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/payments',
        action_text: 'Update Payment Method',
        metadata: {
          amount: BUSINESS_RULES.MONTHLY_FEE,
          payment_type: 'monthly_fee',
          failure_reason: 'Insufficient funds',
          test: true
        }
      },
      payout_ready: {
        type: 'milestone',
        title: '🎉 Payout Conditions Met!',
        message: `Fund has reached $100,000 with 1 potential winner. Payout process can begin for eligible members.`,
        priority: 'high',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/queue',
        action_text: 'View Queue',
        metadata: {
          fund_amount: 100000,
          potential_winners: 1,
          payout_ready: true,
          test: true
        }
      },
      queue_position_update: {
        type: 'queue',
        title: '🏆 Queue Position Updated',
        message: `You are now 2nd in line for payout based on your continuous tenure. Keep up your payments to maintain your position!`,
        priority: 'medium',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/queue',
        action_text: 'View Queue',
        metadata: {
          queue_position: 2,
          position_change: 'up',
          test: true
        }
      },
      tenure_milestone: {
        type: 'milestone',
        title: '🎯 Tenure Milestone Reached',
        message: `Congratulations! You've completed 12 months of continuous tenure. Your dedication puts you in a strong position for future payouts.`,
        priority: 'medium',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard',
        action_text: 'View Dashboard',
        metadata: {
          tenure_months: 12,
          milestone_type: 'tenure',
          test: true
        }
      },
      fund_progress: {
        type: 'system',
        title: '💰 Fund Building Progress',
        message: `Current fund: $75,000. Need $25,000 more to reach minimum payout threshold. We're getting closer to the first payout!`,
        priority: 'low',
        is_read: false,
        is_archived: false,
        action_url: '/dashboard/news',
        action_text: 'View Progress',
        metadata: {
          current_fund: 75000,
          target_fund: 100000,
          remaining_needed: 25000,
          test: true
        }
      }
    };

    const notificationData = scenarios[scenario];
    if (!notificationData) {
      throw new Error(`Unknown test scenario: ${scenario}`);
    }

    return this.createNotification({
      ...notificationData,
      user_id: userId
    });
  }
}

export default MockNotificationService;