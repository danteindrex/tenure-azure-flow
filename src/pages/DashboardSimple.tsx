import { useEffect, useState, useMemo } from "react";
import { Crown, Calendar, DollarSign, Users, Clock, TrendingUp, Award, CreditCard, Loader2, AlertTriangle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { logError } from "@/lib/audit";
import { useQueueData } from "@/hooks/useQueueData";
import { useStatistics } from "@/hooks/useStatistics";
import { useBillingSchedules } from "@/hooks/useBillingSchedules";
import { useNewsFeed } from "@/hooks/useNewsFeed";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardSimple = () => {

  const { data: session } = useSession();
  const user = session?.user;

  // First, fetch all queue data to find current user's position
  const { data: allQueueData, isLoading: isLoadingAllQueue } = useQueueData();
  
  // Find current user's position from all queue data
  const currentUserPosition = useMemo(() => {
    if (!user?.id || !allQueueData?.data?.queue) return null;
    const userInQueue = allQueueData.data.queue.find((q: any) => q.user_id === user.id);
    return userInQueue?.queue_position || null;
  }, [allQueueData, user?.id]);

  // Then fetch nearest 5 users based on current position
  const { data: queueData, isLoading: isLoadingQueue, isFetching: isFetchingQueue, refreshQueue } = useQueueData(currentUserPosition || undefined);
  
  const { data: statsData, isLoading: isLoadingStats } = useStatistics();
  const { data: billingData, isLoading: isLoadingBilling } = useBillingSchedules(user?.id);
  const { data: newsResponse, isLoading: isLoadingNews } = useNewsFeed();

  // UI state
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const BUSINESS_LAUNCH_DATE = process.env.NEXT_PUBLIC_BUSINESS_LAUNCH_DATE || ""; // ISO string fallback
  const PRIZE_PER_WINNER = 100000; // BR-4
  const FUND_TARGET = 500000; // Target fund amount for payouts

  // Compute derived data from React Query results using useMemo
  const {
    queuePosition,
    userDatabaseId,
    currentUserEntry,
    nearestQueue,
    totalQueueCount,
    totalRevenue,
    billingSchedules,
    paymentAmount,
    daysUntilPayment,
    daysUntilDraw
  } = useMemo(() => {
    const queue = queueData?.data?.queue || [];
    const allQueue = allQueueData?.data?.queue || [];
    const currentUserId = user?.id || null;
    const revenue = statsData?.data?.totalRevenue || 0;
    const schedules = billingData?.data?.schedules || [];
    const totalCount = allQueue.length; // Use total from all queue data

    // Find current user in queue
    let position: number | null = null;
    let dbId: number | null = null;
    let userEntry: { rank: number; name: string; tenureMonths: number; status: string; isCurrentUser: boolean } | null = null;

    if (currentUserId && queue.length > 0) {
      const mine = queue.find((q: any) => q.user_id === currentUserId);
      if (mine) {
        position = mine.queue_position;
        dbId = mine.id || null;
        userEntry = {
          rank: mine.queue_position,
          name: 'You',
          tenureMonths: 0,
          status: 'Active',
          isCurrentUser: true
        };
      }
    }

    // Map queue for display (already filtered by backend to nearest 5)
    const nearestQueueDisplay = queue.map((q: any) => ({
      rank: q.queue_position,
      name: q.user_id,
      tenureMonths: 0,
      status: 'Active',
      isCurrentUser: currentUserId ? q.user_id === currentUserId : false,
    }));

    // Get payment info from billing schedules
    const monthlySchedule = schedules.find((s: any) => s.billingCycle === 'MONTHLY');
    const payment = monthlySchedule?.amount || 0;
    const daysPayment = monthlySchedule?.daysUntil || 0;

    // Calculate days until draw
    let daysDraw = 0;
    const launch = BUSINESS_LAUNCH_DATE ? new Date(BUSINESS_LAUNCH_DATE) : null;
    if (launch) {
      const twelveMonths = new Date(launch);
      twelveMonths.setMonth(twelveMonths.getMonth() + 12);
      if (Date.now() < twelveMonths.getTime()) {
        daysDraw = Math.max(Math.ceil((twelveMonths.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0);
      }
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const target = new Date(year, month, 15);
      if (now > target) {
        target.setMonth(month + 1);
      }
      daysDraw = Math.max(Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0);
    }

    return {
      queuePosition: position,
      userDatabaseId: dbId,
      currentUserEntry: userEntry,
      nearestQueue: nearestQueueDisplay,
      totalQueueCount: totalCount,
      totalRevenue: revenue,
      billingSchedules: schedules,
      paymentAmount: payment,
      daysUntilPayment: daysPayment,
      daysUntilDraw: daysDraw
    };
  }, [queueData, allQueueData, statsData, billingData, user?.id, BUSINESS_LAUNCH_DATE, PRIZE_PER_WINNER]);

  // Manual refresh function
  const handleRefresh = async () => {
    toast.info('Refreshing data...');
    await refreshQueue();
  };

  const handleUpdatePaymentMethod = async () => {
    if (!user) {
      toast.error("Please sign in to update your payment method");
      return;
    }

    try {
      setUpdatingPayment(true);
      // Use relative URL to call Next.js API route (works in all environments)
      const response = await fetch(`/api/subscriptions/${user.id}/update-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          returnUrl: window.location.href
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create billing portal session');
      }

      const result = await response.json();
      if (result.success && result.data?.url) {
        // Redirect to Stripe billing portal
        window.location.href = result.data.url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      await logError(`Error opening billing portal: ${error.message}`, user.id);
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) {
      toast.error("Please sign in to cancel your subscription");
      return;
    }

    try {
      setCancelling(true);
      // Use relative URL to call Next.js API route (works in all environments)
      const response = await fetch(`/api/subscriptions/${user.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel subscription');
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Subscription cancelled successfully. You will be removed from the queue.');
        setShowCancelModal(false);
        // Refresh data
        window.location.reload();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      await logError(`Error cancelling subscription: ${error.message}`, user.id);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const userData = {
    memberId: userDatabaseId ? `#${userDatabaseId.toString().padStart(3, '0')}` : (queuePosition ? `#${queuePosition.toString().padStart(3, '0')}` : "Not in queue"),
    tenureStart: "", // Not available here
    nextPaymentDue: daysUntilPayment > 0 ? `${daysUntilPayment} days` : "No payment due",
  };

  const stats = {
    daysUntilPayment,
    totalRevenue,
    potentialWinners: Math.min(2, Math.max(nearestQueue.filter((q) => q.status === 'Active').length, 0)),
    daysUntilDraw,
    paymentAmount,
    queuePosition: queuePosition ?? 0,
    totalQueueCount,
  };
  const fundData = {
    nextDrawDate: `${daysUntilDraw} days`,
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 px-2 sm:px-0">
      {/* Welcome Section - Responsive */}
      <div className="text-center py-3 sm:py-4 md:py-6 lg:py-8 relative">
        <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 px-2">
          Welcome to Your Dashboard
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-4">
          {queuePosition ? `Member ID: ${userData.memberId}` : "Complete your membership to get your Member ID"}
        </p>
        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          className="absolute top-3 right-3 gap-2"
          onClick={handleRefresh}
          disabled={isFetchingQueue}
        >
          <RefreshCw className={`w-4 h-4 ${isFetchingQueue ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Key Stats - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Days Until Payment Card */}
        <Card className="p-2 sm:p-3 md:p-4 shadow-lg border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Days Until Payment</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.daysUntilPayment}</p>
            </div>
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-500 shrink-0" />
          </div>
        </Card>

        {/* Queue Position Card */}
        <Card className="p-2 sm:p-3 md:p-4 shadow-lg border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Queue Position</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                {stats.queuePosition > 0 ? `#${stats.queuePosition} of ${stats.totalQueueCount}` : "Not in queue"}
              </p>
            </div>
            <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-500 shrink-0" />
          </div>
        </Card>

        {/* Total Fund Card */}
        <Card className="p-2 sm:p-3 md:p-4 shadow-lg border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Fund</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-500 shrink-0" />
          </div>
        </Card>

        {/* Next Draw Card */}
        <Card className="p-2 sm:p-3 md:p-4 shadow-lg border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Next Draw</p>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold break-words">
                {stats.daysUntilDraw > 0 ? `${stats.daysUntilDraw} days` :
                 stats.totalRevenue >= PRIZE_PER_WINNER ? "Ready" : "Pending"}
              </p>
            </div>
            <Award className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-500 shrink-0" />
          </div>
        </Card>
      </div>

      {/* Fund Progress - Responsive */}
      <Card className="p-3 sm:p-4 md:p-6 shadow-lg border-0">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
          <span className="truncate">Fund Progress</span>
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 xs:gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Current Fund</span>
            <span className="text-xs sm:text-sm md:text-base font-medium break-all xs:break-normal">
              ${stats.totalRevenue.toLocaleString()} / ${FUND_TARGET.toLocaleString()}
            </span>
          </div>
          <Progress value={Math.min((stats.totalRevenue / FUND_TARGET) * 100, 100)} className="h-1.5 sm:h-2" />
          <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground">
            {Math.round((stats.totalRevenue / FUND_TARGET) * 100)}% complete{' - '}
            {stats.totalRevenue >= FUND_TARGET
              ? "Fund target reached!"
              : `Need $${(FUND_TARGET - stats.totalRevenue).toLocaleString()} more`}
          </p>
        </div>
      </Card>
      
      {/* Queue Status - Responsive */}
      <Card className="p-3 sm:p-4 md:p-6 shadow-lg border-0">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex flex-col xs:flex-row items-start xs:items-center gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="truncate">Your Queue Status</span>
          </div>
          {currentUserEntry && (
            <span className="text-xs sm:text-sm font-medium text-muted-foreground xs:ml-auto">
              Your position: #{currentUserEntry.rank} of {stats.totalQueueCount}
            </span>
          )}
        </h3>
        
        {isLoadingQueue ? (
          // Skeleton loading structure
          <div className="space-y-2 sm:space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-card shadow-md">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-12 shrink-0" />
              </div>
            ))}
          </div>
        ) : nearestQueue.length > 0 ? (
          // Queue display with blur/cut-off effect for items moving out
          <div className="relative">
            {/* Top blur overlay */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-card to-transparent pointer-events-none z-10" />
            
            {/* Queue container with overflow hidden for cut-off effect */}
            <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
              {nearestQueue.map((member, index) => (
                <div
                  key={member.rank}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-all ${
                    member.isCurrentUser
                      ? 'bg-accent/10 dark:bg-accent/20 shadow-lg border-2 border-accent'
                      : 'bg-card shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${
                      member.rank <= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{member.name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-medium">{member.status}</p>
                    {member.isCurrentUser && (
                      <p className="text-[10px] xs:text-xs text-accent font-semibold">You are here</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Bottom blur overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground px-4">No members in queue yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 px-4">
              {!currentUserEntry ? "Complete your membership to join the queue" : ""}
            </p>
          </div>
        )}
      </Card>

      {/* Quick Actions - Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 md:p-6 shadow-lg border-0">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="truncate">Payment & Billing</span>
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {/* Monthly and Annual Billing Schedules */}
            {billingSchedules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {billingSchedules.map((schedule) => (
                  <div key={schedule.billingCycle} className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">
                      {schedule.billingCycle === 'MONTHLY' ? 'Monthly Payment' : 'Annual Payment'}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">
                      ${schedule.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due in {schedule.daysUntil} days
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs sm:text-sm text-muted-foreground">Next Payment Due</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold">
                  {stats.paymentAmount > 0 ? `$${stats.paymentAmount}.00` : "$25.00"}
                </p>
                <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground mt-1">{userData.nextPaymentDue}</p>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="outline"
                className="w-full shadow-lg text-xs sm:text-sm py-2 sm:py-2.5"
                onClick={handleUpdatePaymentMethod}
                disabled={updatingPayment}
              >
                {updatingPayment ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                    <span className="truncate">Opening...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-2 shrink-0" />
                    <span className="truncate">Manage Billing</span>
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                className="w-full shadow-lg text-xs sm:text-sm py-2 sm:py-2.5"
                onClick={() => setShowCancelModal(true)}
                disabled={!queuePosition}
              >
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 shrink-0" />
                <span className="truncate">Cancel Subscription</span>
              </Button>
              <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground text-center px-2">
                Update payment method and manage billing through Stripe's secure portal
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 md:p-6 shadow-lg border-0">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="truncate">Next Draw</span>
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Draw Status</p>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {stats.daysUntilDraw > 0 ? `In: ${stats.daysUntilDraw} days` :
                 stats.totalRevenue >= PRIZE_PER_WINNER ? "Ready to draw" : "Waiting for fund target"}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Eligible Members</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold">
                {stats.potentialWinners > 0 ? `${stats.potentialWinners} eligible` : "No eligible members"}
              </p>
            </div>
            <Button variant="outline" className="w-full shadow-lg text-xs sm:text-sm py-2 sm:py-2.5 mt-2">
              <span className="truncate">View Details</span>
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-3 sm:p-4 md:p-6 shadow-lg border-0">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">Recent News</h3>
        {isLoadingNews ? (
          <div className="py-4 text-center text-muted-foreground">Loading...</div>
        ) : (newsResponse?.posts || []).slice(0,3).length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">No announcements yet</div>
        ) : (
          (newsResponse?.posts || []).slice(0,3).map((post) => (
            <div key={post.id} className="py-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{post.title}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{typeof post.content === 'string' ? post.content : (post.content?.text || '')}</p>
            </div>
          ))
        )}
        <div className="pt-3">
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/dashboard/news')}>View All News</Button>
        </div>
      </Card>

      {/* Cancel Subscription Warning Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-4 sm:p-6 relative">
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              disabled={cancelling}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Cancel Subscription?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to cancel your subscription?
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-2 justify-center">
                    <AlertTriangle className="w-4 h-4" />
                    Warning
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cancelling your subscription will remove you from the queue. You will lose your current queue position and will need to rejoin at the end if you subscribe again.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1"
                >
                  Keep Subscription
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex-1"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardSimple;
