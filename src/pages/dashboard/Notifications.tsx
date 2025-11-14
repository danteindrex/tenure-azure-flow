import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  Trash2,
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  DollarSign,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  useNotifications,
  useUnreadCount,
  useNotificationPreferences,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification
} from "@/hooks/useNotificationsData";

const Notifications = () => {
  const { data: session } = useSession();
  const user = session?.user;

  // React Query hooks - replaces manual fetching
  const { data: notifications = [], isLoading: loadingNotifications } = useNotifications(user?.id);
  const { data: unreadCount = 0, isLoading: loadingUnread } = useUnreadCount(user?.id);
  const { data: preferences } = useNotificationPreferences(user?.id);

  // Mutations
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const loading = loadingNotifications || loadingUnread;

  // Compute notification counts using useMemo
  const notificationCounts = useMemo(() => ({
    total: notifications.length,
    unread: unreadCount,
    high_priority: notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length,
    by_type: notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  }), [notifications, unreadCount]);

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
      await markAsReadMutation.mutateAsync({ notificationId, userId: user.id });
      toast.success("Notification marked as read");
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await markAllAsReadMutation.mutateAsync(user.id);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      await deleteNotificationMutation.mutateAsync({ notificationId, userId: user.id });
      toast.success("Notification deleted");
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error("Failed to delete notification");
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
        </div>
        <div className="flex gap-2">
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