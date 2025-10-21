import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  Clock, 
  CreditCard, 
  X,
  DollarSign,
  Calendar
} from "lucide-react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import BusinessLogicService, { BUSINESS_RULES } from "@/lib/business-logic";

interface PaymentNotification {
  type: 'reminder' | 'overdue' | 'failed';
  title: string;
  message: string;
  daysUntilDue?: number;
  amount?: number;
  dueDate?: string;
  canDismiss: boolean;
}

const PaymentNotificationBanner = () => {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

  const supabase = useSupabaseClient();
  const user = useUser();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const notifications: PaymentNotification[] = [];

        // Get member data
        const { data: memberData, error: memberError } = await supabase
          .from('member')
          .select('id, status')
          .eq('auth_user_id', user.id)
          .single();

        if (memberError || !memberData) {
          console.error('Error fetching member data:', memberError);
          return;
        }

        // Initialize business logic service
        const businessLogic = new BusinessLogicService(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get member payment status using business logic
        const paymentStatus = await businessLogic.getMemberPaymentStatus(memberData.id);

        // Check for failed payments in last 24 hours
        const { data: recentFailedPayments, error: failedError } = await supabase
          .from('user_payments')
          .select('amount, failure_reason, created_at')
          .eq('user_id', memberData.id)
          .eq('status', 'Failed')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (!failedError && recentFailedPayments && recentFailedPayments.length > 0) {
          const failedPayment = recentFailedPayments[0];
          notifications.push({
            type: 'failed',
            title: 'Payment Failed',
            message: `Your recent payment of $${failedPayment.amount} failed. ${failedPayment.failure_reason ? `Reason: ${failedPayment.failure_reason}` : ''} Please update your payment method.`,
            amount: failedPayment.amount,
            canDismiss: true
          });
        }

        // Check payment status based on business rules
        if (!paymentStatus.hasJoiningFee) {
          // No joining fee paid - critical
          notifications.push({
            type: 'overdue',
            title: 'Joining Fee Required',
            message: `Please complete your joining fee of $${BUSINESS_RULES.JOINING_FEE} to activate your membership and start your tenure tracking. This is required to participate in the payout system.`,
            amount: BUSINESS_RULES.JOINING_FEE,
            canDismiss: false
          });
        } else if (paymentStatus.isInDefault) {
          // In payment default - critical (BR-8)
          notifications.push({
            type: 'overdue',
            title: 'Payment Default - Membership at Risk',
            message: `Your membership is in default due to missed monthly payments. You have exceeded the ${BUSINESS_RULES.PAYMENT_GRACE_DAYS}-day grace period. Pay immediately to avoid losing your queue position permanently.`,
            amount: BUSINESS_RULES.MONTHLY_FEE,
            canDismiss: false
          });
        } else if (paymentStatus.nextPaymentDue) {
          const daysUntilDue = Math.ceil((paymentStatus.nextPaymentDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue <= 0) {
            // Payment is overdue but within grace period
            notifications.push({
              type: 'overdue',
              title: 'Monthly Payment Overdue',
              message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue. You have ${BUSINESS_RULES.PAYMENT_GRACE_DAYS - paymentStatus.daysSinceLastPayment} days remaining before default.`,
              amount: BUSINESS_RULES.MONTHLY_FEE,
              dueDate: paymentStatus.nextPaymentDue.toLocaleDateString(),
              canDismiss: false
            });
          } else if (daysUntilDue <= 3) {
            // Payment due soon
            notifications.push({
              type: 'reminder',
              title: 'Monthly Payment Due Soon',
              message: `Your monthly payment of $${BUSINESS_RULES.MONTHLY_FEE} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} (${paymentStatus.nextPaymentDue.toLocaleDateString()}). Ensure payment to maintain continuous tenure.`,
              daysUntilDue,
              amount: BUSINESS_RULES.MONTHLY_FEE,
              dueDate: paymentStatus.nextPaymentDue.toLocaleDateString(),
              canDismiss: true
            });
          }
        }

        // Filter out dismissed notifications
        const filteredNotifications = notifications.filter(notification => {
          const notificationId = `${notification.type}-${notification.title}`;
          return !dismissedNotifications.includes(notificationId);
        });

        setNotifications(filteredNotifications);
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [user, supabase, dismissedNotifications]);

  const dismissNotification = (notification: PaymentNotification) => {
    if (!notification.canDismiss) return;
    
    const notificationId = `${notification.type}-${notification.title}`;
    setDismissedNotifications(prev => [...prev, notificationId]);
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'failed':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'overdue':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'reminder':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'failed':
        return 'destructive';
      case 'overdue':
        return 'destructive';
      case 'reminder':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {notifications.map((notification, index) => (
        <Alert key={index} className={getNotificationStyle(notification.type)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{notification.title}</h4>
                  <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                    {notification.type === 'failed' ? 'Failed' : 
                     notification.type === 'overdue' ? 'Overdue' : 'Due Soon'}
                  </Badge>
                </div>
                <AlertDescription className="text-sm mb-3">
                  {notification.message}
                </AlertDescription>
                
                {(notification.amount || notification.dueDate) && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {notification.amount && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>Amount: ${notification.amount}</span>
                      </div>
                    )}
                    {notification.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {notification.dueDate}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-8">
                    <CreditCard className="w-3 h-3 mr-1" />
                    Make Payment
                  </Button>
                  {notification.canDismiss && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => dismissNotification(notification)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {notification.canDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-transparent"
                onClick={() => dismissNotification(notification)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default PaymentNotificationBanner;