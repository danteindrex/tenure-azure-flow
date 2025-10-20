import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  DollarSign,
  Loader2,
  TestTube,
  Clock,
  CreditCard,
  Calendar,
  Target,
  Zap,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import NotificationService, { Notification, NotificationPreferences } from "@/lib/notifications";
import MockNotificationService, { MockNotification } from "@/lib/mock-notifications";
import { logError } from "@/lib/audit";
import BusinessLogicService, { BUSINESS_RULES } from "@/lib/business-logic";

const Notifications = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCounts, setNotificationCounts] = useState({
    total: 0,
    unread: 0,
    high_priority: 0,
    by_type: {} as Record<string, number>
  });
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testingNotifications, setTestingNotifications] = useState(false);
  const [useMockService, setUseMockService] = useState(false);

  const supabase = useSupabaseClient();
  const user = useUser();
  
  // Memoize the notification service to prevent recreation on every render
  const notificationService = useMemo(() => new NotificationService(supabase), [supabase]);
  const mockNotificationService = useMemo(() => new MockNotificationService(), []);

  // Load notifications data
  useEffect(() => {
    let isMounted = true;
    
    const loadNotifications = async () => {
      if (!user) return;
      
      try {
        if (isMounted) {
          setLoading(true);
        }
        
        try {
          // Try to load from database first
          const [notificationsData, countsData, preferencesData] = await Promise.all([
            notificationService.getNotifications(user.id),
            notificationService.getNotificationCounts(user.id),
            notificationService.getNotificationPreferences(user.id)
          ]);

          // Only update state if component is still mounted
          if (isMounted) {
            setNotifications(notificationsData);
            setNotificationCounts(countsData);
            setPreferences(preferencesData);
            setUseMockService(false);
            setLoading(false);
          }
        } catch (dbError) {
          console.warn('Database notifications not available, using mock service:', dbError);
          
          // Fall back to mock service
          if (isMounted) {
            const mockNotifications = mockNotificationService.getNotifications(user.id);
            const mockCounts = mockNotificationService.getNotificationCounts(user.id);
            
            setNotifications(mockNotifications as any);
            setNotificationCounts(mockCounts);
            setPreferences(null);
            setUseMockService(true);
            setLoading(false);
          }
        }

      } catch (error) {
        console.error('Error loading notifications:', error);
        if (isMounted) {
          await logError(`Error loading notifications: ${error.message}`, user.id);
          toast.error("Failed to load notifications");
          setLoading(false);
        }
      }
    };

    loadNotifications();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user?.id, notificationService]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case "queue":
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case "milestone":
        return <AlertCircle className="w-5 h-5 text-purple-500" />;
      case "reminder":
        return <Bell className="w-5 h-5 text-yellow-500" />;
      case "system":
        return <Settings className="w-5 h-5 text-gray-500" />;
      case "bonus":
        return <DollarSign className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium</Badge>;
      case "low":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Low</Badge>;
      default:
        return null;
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      let success;
      
      if (useMockService) {
        success = mockNotificationService.markAsRead(notificationId, user.id);
      } else {
        success = await notificationService.markAsRead(notificationId, user.id);
      }
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
        
        // Update counts
        setNotificationCounts(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
        
        toast.success("Notification marked as read");
      } else {
        throw new Error("Failed to mark notification as read");
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      if (!useMockService) {
        await logError(`Error marking notification as read: ${error.message}`, user.id);
      }
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      let success;
      
      if (useMockService) {
        success = mockNotificationService.markAllAsRead(user.id);
      } else {
        success = await notificationService.markAllAsRead(user.id);
      }
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            is_read: true, 
            read_at: new Date().toISOString() 
          }))
        );
        
        // Update counts
        setNotificationCounts(prev => ({
          ...prev,
          unread: 0
        }));
        
        toast.success("All notifications marked as read");
      } else {
        throw new Error("Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      if (!useMockService) {
        await logError(`Error marking all notifications as read: ${error.message}`, user.id);
      }
      toast.error("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      let success;
      
      if (useMockService) {
        success = mockNotificationService.deleteNotification(notificationId, user.id);
      } else {
        success = await notificationService.deleteNotification(notificationId, user.id);
      }
      
      if (success) {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
        
        // Update counts
        setNotificationCounts(prev => ({
          ...prev,
          total: prev.total - 1,
          unread: deletedNotification?.is_read ? prev.unread : Math.max(0, prev.unread - 1),
          high_priority: deletedNotification?.priority === 'high' || deletedNotification?.priority === 'urgent' 
            ? Math.max(0, prev.high_priority - 1) 
            : prev.high_priority
        }));
        
        toast.success("Notification deleted");
      } else {
        throw new Error("Failed to delete notification");
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      if (!useMockService) {
        await logError(`Error deleting notification: ${error.message}`, user.id);
      }
      toast.error("Failed to delete notification");
    }
  };

  // Test notification functions
  const createTestNotification = async (type: string, scenario: string) => {
    if (!user) return;

    setTestingNotifications(true);
    
    try {
      let notification: Omit<Notification, 'id' | 'created_at'>;

      switch (scenario) {
        case 'joining_fee_required':
          notification = {
            user_id: user.id,
            type: 'payment',
            title: 'Joining Fee Required',
            message: `Please complete your joining fee of $${BUSINESS_RULES.JOINING_FEE} to activate your membership and start your tenure tracking. This is required to participate in the payout system.`,
            priority: 'urgent',
            is_read: false,
            action_url: '/dashboard/payments',
            action_text: 'Pay Now',
            metadata: {
              amount: BUSINESS_RULES.JOINING_FEE,
              payment_type: 'joining_fee',
              test: true
            }
          };
          break;

        case 'monthly_payment_due':
          notification = {
            user_id: user.id,
            type: 'payment',
            title: 'Monthly Payment Due Soon',
            message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is due in 3 days. Ensure payment to maintain continuous tenure.`,
            priority: 'high',
            is_read: false,
            action_url: '/dashboard/payments',
            action_text: 'Pay Now',
            metadata: {
              amount: BUSINESS_RULES.MONTHLY_FEE,
              payment_type: 'monthly_fee',
              days_until_due: 3,
              test: true
            }
          };
          break;

        case 'payment_overdue':
          notification = {
            user_id: user.id,
            type: 'payment',
            title: 'Monthly Payment Overdue',
            message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is 5 days overdue. You have ${BUSINESS_RULES.PAYMENT_GRACE_DAYS - 5} days remaining before default.`,
            priority: 'urgent',
            is_read: false,
            action_url: '/dashboard/payments',
            action_text: 'Pay Immediately',
            metadata: {
              amount: BUSINESS_RULES.MONTHLY_FEE,
              payment_type: 'monthly_fee',
              days_overdue: 5,
              grace_days_remaining: BUSINESS_RULES.PAYMENT_GRACE_DAYS - 5,
              test: true
            }
          };
          break;

        case 'payment_default_risk':
          notification = {
            user_id: user.id,
            type: 'payment',
            title: 'Payment Default - Membership at Risk',
            message: `Your membership is in default due to missed monthly payments. You have exceeded the ${BUSINESS_RULES.PAYMENT_GRACE_DAYS}-day grace period. Pay immediately to avoid losing your queue position permanently.`,
            priority: 'urgent',
            is_read: false,
            action_url: '/dashboard/payments',
            action_text: 'Save Membership',
            metadata: {
              amount: BUSINESS_RULES.MONTHLY_FEE,
              payment_type: 'monthly_fee',
              default_status: true,
              test: true
            }
          };
          break;

        case 'payment_failed':
          notification = {
            user_id: user.id,
            type: 'payment',
            title: 'Payment Failed',
            message: `Your recent payment of $${BUSINESS_RULES.MONTHLY_FEE} failed. Reason: Insufficient funds. Please update your payment method and try again.`,
            priority: 'high',
            is_read: false,
            action_url: '/dashboard/payments',
            action_text: 'Update Payment Method',
            metadata: {
              amount: BUSINESS_RULES.MONTHLY_FEE,
              payment_type: 'monthly_fee',
              failure_reason: 'Insufficient funds',
              test: true
            }
          };
          break;

        case 'payout_ready':
          notification = {
            user_id: user.id,
            type: 'milestone',
            title: '🎉 Payout Conditions Met!',
            message: `Fund has reached $100,000 with 1 potential winner. Payout process can begin for eligible members.`,
            priority: 'high',
            is_read: false,
            action_url: '/dashboard/queue',
            action_text: 'View Queue',
            metadata: {
              fund_amount: 100000,
              potential_winners: 1,
              payout_ready: true,
              test: true
            }
          };
          break;

        case 'queue_position_update':
          notification = {
            user_id: user.id,
            type: 'queue',
            title: '🏆 Queue Position Updated',
            message: `You are now 2nd in line for payout based on your continuous tenure. Keep up your payments to maintain your position!`,
            priority: 'medium',
            is_read: false,
            action_url: '/dashboard/queue',
            action_text: 'View Queue',
            metadata: {
              queue_position: 2,
              position_change: 'up',
              test: true
            }
          };
          break;

        case 'tenure_milestone':
          notification = {
            user_id: user.id,
            type: 'milestone',
            title: '🎯 Tenure Milestone Reached',
            message: `Congratulations! You've completed 12 months of continuous tenure. Your dedication puts you in a strong position for future payouts.`,
            priority: 'medium',
            is_read: false,
            action_url: '/dashboard',
            action_text: 'View Dashboard',
            metadata: {
              tenure_months: 12,
              milestone_type: 'tenure',
              test: true
            }
          };
          break;

        case 'fund_progress':
          notification = {
            user_id: user.id,
            type: 'system',
            title: '💰 Fund Building Progress',
            message: `Current fund: $75,000. Need $25,000 more to reach minimum payout threshold. We're getting closer to the first payout!`,
            priority: 'low',
            is_read: false,
            action_url: '/dashboard/news',
            action_text: 'View Progress',
            metadata: {
              current_fund: 75000,
              target_fund: 100000,
              remaining_needed: 25000,
              test: true
            }
          };
          break;

        default:
          throw new Error('Unknown test scenario');
      }

      let createdNotification;
      
      if (useMockService) {
        // Use mock service
        createdNotification = mockNotificationService.createTestNotification(user.id, scenario);
      } else {
        // Try database service
        try {
          createdNotification = await notificationService.createNotification(notification);
        } catch (dbError) {
          console.warn('Database creation failed, falling back to mock service:', dbError);
          createdNotification = mockNotificationService.createTestNotification(user.id, scenario);
          setUseMockService(true);
        }
      }
      
      if (createdNotification) {
        // Add to local state for immediate display
        setNotifications(prev => [createdNotification as any, ...prev]);
        setNotificationCounts(prev => ({
          ...prev,
          total: prev.total + 1,
          unread: prev.unread + 1,
          high_priority: (createdNotification.priority === 'high' || createdNotification.priority === 'urgent') 
            ? prev.high_priority + 1 
            : prev.high_priority
        }));
        
        toast.success(`Test notification created: ${createdNotification.title}`);
      } else {
        throw new Error('Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast.error(`Failed to create test notification: ${error.message}`);
    } finally {
      setTestingNotifications(false);
    }
  };

  const createAllTestNotifications = async () => {
    const scenarios = [
      'joining_fee_required',
      'monthly_payment_due', 
      'payment_overdue',
      'payment_default_risk',
      'payment_failed',
      'payout_ready',
      'queue_position_update',
      'tenure_milestone',
      'fund_progress'
    ];

    setTestingNotifications(true);
    
    for (const scenario of scenarios) {
      await createTestNotification('test', scenario);
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast.success(`Created ${scenarios.length} test notifications!`);
    setTestingNotifications(false);
  };

  const clearTestNotifications = async () => {
    if (!user) return;

    try {
      let success;
      const testNotifications = notifications.filter(n => n.metadata?.test === true);
      
      if (useMockService) {
        success = mockNotificationService.clearTestNotifications(user.id);
        if (success) {
          setNotifications(prev => prev.filter(n => !n.metadata?.test));
          const counts = mockNotificationService.getNotificationCounts(user.id);
          setNotificationCounts(counts);
        }
      } else {
        // Delete all test notifications one by one
        for (const notification of testNotifications) {
          if (notification.id) {
            await deleteNotification(notification.id);
          }
        }
        success = true;
      }
      
      if (success) {
        toast.success(`Cleared ${testNotifications.length} test notifications`);
      }
    } catch (error) {
      console.error('Error clearing test notifications:', error);
      toast.error('Failed to clear test notifications');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading notifications...</p>
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
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with your account activity</p>
          {useMockService && (
            <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📝 <strong>Demo Mode:</strong> Using local storage for notifications (database table not available)
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
          >
            <TestTube className="w-4 h-4 mr-2" />
            Test Notifications
          </Button>
          {notificationCounts.unread > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unread</p>
              <p className="text-2xl font-bold">{notificationCounts.unread}</p>
            </div>
            <Bell className="w-8 h-8 text-accent" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{notificationCounts.total}</p>
            </div>
            <Info className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">High Priority</p>
              <p className="text-2xl font-bold">{notificationCounts.high_priority}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Test Panel */}
      {showTestPanel && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-4">
            <TestTube className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Test Payment Notifications</h2>
          </div>
          
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-6">
            Test all the business rule-based notifications implemented in the dashboard. These notifications demonstrate the payment system, default enforcement, and payout eligibility features.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Payment Notifications */}
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Notifications
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('payment', 'joining_fee_required')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                Joining Fee Required
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('payment', 'monthly_payment_due')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                Monthly Payment Due
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('payment', 'payment_overdue')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                Payment Overdue
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('payment', 'payment_default_risk')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                Default Risk
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('payment', 'payment_failed')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <X className="w-4 h-4 mr-2 text-red-500" />
                Payment Failed
              </Button>
            </div>

            {/* System Notifications */}
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                System Updates
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('milestone', 'payout_ready')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Payout Ready
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('queue', 'queue_position_update')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <Target className="w-4 h-4 mr-2 text-blue-500" />
                Queue Position Update
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('milestone', 'tenure_milestone')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                Tenure Milestone
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => createTestNotification('system', 'fund_progress')}
                disabled={testingNotifications}
                className="w-full justify-start"
              >
                <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                Fund Progress
              </Button>
            </div>

            {/* Bulk Actions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Bulk Actions
              </h3>
              <Button 
                variant="default" 
                size="sm" 
                onClick={createAllTestNotifications}
                disabled={testingNotifications}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {testingNotifications ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                Create All Tests
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearTestNotifications}
                disabled={testingNotifications}
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Test Notifications
              </Button>
            </div>
          </div>

          <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Business Rules Tested:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
              <div>• BR-1: Joining Fee ($300)</div>
              <div>• BR-2: Monthly Fee ($25)</div>
              <div>• BR-3: Payout Trigger ($100K + 12mo)</div>
              <div>• BR-8: Default Penalty (30-day grace)</div>
              <div>• BR-9: Tenure from Payment Date</div>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-2">You'll see important updates here</p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`p-4 transition-all duration-200 ${
                !notification.is_read 
                  ? "bg-accent/5 border-accent/20 shadow-sm" 
                  : "bg-background/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-background/50">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-accent" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at || '').toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {getPriorityBadge(notification.priority)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id!)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id!)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
