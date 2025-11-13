import { useEffect, useState, useRef } from "react";
import { Crown, Calendar, DollarSign, Users, Clock, TrendingUp, Award, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { logError } from "@/lib/audit";

const DashboardSimple = () => {

  const { data: session } = useSession();
  const user = session?.user;

  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [daysUntilPayment, setDaysUntilPayment] = useState<number>(0);
  const [daysUntilDraw, setDaysUntilDraw] = useState<number>(0);
  const [topQueue, setTopQueue] = useState<Array<{ rank: number; name: string; tenureMonths: number; status: string; isCurrentUser?: boolean }>>([]);
  const [currentUserIdState, setCurrentUserIdState] = useState<string | null>(null);
  const [currentUserEntry, setCurrentUserEntry] = useState<{ rank: number; name: string; tenureMonths: number; status: string; isCurrentUser: boolean } | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const pollRef = useRef<number | null>(null);
  const BUSINESS_LAUNCH_DATE = process.env.NEXT_PUBLIC_BUSINESS_LAUNCH_DATE || ""; // ISO string fallback
  const PRIZE_PER_WINNER = 100000; // BR-4
  const FUND_TARGET = 500000; // Target fund amount for payouts

  // Compute next draw as days until the 15th of next month
  const computeDaysUntilNextDraw = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const target = new Date(year, month, 15);
    if (now > target) {
      target.setMonth(month + 1);
    }
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  useEffect(() => {
    const fetchQueueAndUsers = async () => {
      try {
        // Fetch queue data and statistics from API
        const [queueResponse, statsResponse] = await Promise.all([
          fetch('/api/queue', { credentials: 'include' }),
          fetch('/api/queue/statistics', { credentials: 'include' })
        ]);

        if (!queueResponse.ok || !statsResponse.ok) {
          console.error('Failed to fetch queue data');
          return;
        }

        const queueData = await queueResponse.json();
        const statsData = await statsResponse.json();

        if (!queueData.success || !statsData.success) {
          console.error('API returned error');
          return;
        }

        // Set total revenue from statistics
        setTotalRevenue(statsData.data.totalRevenue || 0);

        // Find current user in queue
        const currentUserId: string | null = user?.id || null;
        const queue = queueData.data.queue || [];

        if (currentUserId && queue.length > 0) {
          setCurrentUserIdState(currentUserId);
          const mine = queue.find((q: any) => q.user_id === currentUserId);

          if (mine) {
            setQueuePosition(mine.queue_position);

            // Set current user entry (privacy mode: minimal data)
            setCurrentUserEntry({
              rank: mine.queue_position,
              name: 'You',
              tenureMonths: 0, // Not available in privacy mode
              status: 'Active', // Don't show inactive status
              isCurrentUser: true
            });

            // Payment info not available in privacy mode
            setPaymentAmount(0);
            setDaysUntilPayment(0);
          } else {
            setCurrentUserEntry(null);
            setQueuePosition(null);
          }
        }

        // Show all queue members (privacy mode: only user_id and queue_position)
        const preview = queue.map((q: any) => ({
          rank: q.queue_position,
          name: q.user_id, // Show user_id for privacy
          tenureMonths: 0, // Not available in privacy mode
          status: 'Active', // Don't show inactive status
          isCurrentUser: currentUserId ? q.user_id === currentUserId : false,
        }));
        setTopQueue(preview);

        // Calculate days until draw
        const launch = BUSINESS_LAUNCH_DATE ? new Date(BUSINESS_LAUNCH_DATE) : null;
        if (launch) {
          const twelveMonths = new Date(launch);
          twelveMonths.setMonth(twelveMonths.getMonth() + 12);
          const threshold = PRIZE_PER_WINNER;

          if (Date.now() < twelveMonths.getTime()) {
            const d = Math.ceil((twelveMonths.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            setDaysUntilDraw(Math.max(d, 0));
          } else if (statsData.data.totalRevenue < threshold) {
            setDaysUntilDraw(0);
          } else {
            setDaysUntilDraw(0);
          }
        } else {
          setDaysUntilDraw(computeDaysUntilNextDraw());
        }

      } catch (e) {
        console.error('Error in fetchQueueAndUsers:', e);
      }
    };

    // Initial fetch
    if (user?.id) {
      fetchQueueAndUsers();
    }

    // Poll for updates every 30 seconds
    pollRef.current = window.setInterval(() => {
      if (user?.id) {
        fetchQueueAndUsers();
      }
    }, 30000);

    return () => {
      // cleanup polling
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user?.id, BUSINESS_LAUNCH_DATE, totalRevenue]);

  const handleUpdatePaymentMethod = async () => {
    if (!user) {
      toast.error("Please sign in to update your payment method");
      return;
    }

    try {
      setUpdatingPayment(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/subscriptions/${user.id}/update-payment`, {
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

  const userData = {
    memberId: queuePosition ? `#${queuePosition.toString().padStart(3, '0')}` : "Not in queue",
    tenureStart: "", // Not available here
    nextPaymentDue: daysUntilPayment > 0 ? `${daysUntilPayment} days` : "No payment due",
  };

  const stats = {
    daysUntilPayment,
    totalRevenue,
    potentialWinners: Math.min(2, Math.max(topQueue.filter((q) => q.status === 'Active').length, 0)),
    daysUntilDraw,
    paymentAmount,
    queuePosition: queuePosition ?? 0,
  };
  const fundData = {
    nextDrawDate: `${daysUntilDraw} days`,
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 px-2 sm:px-0">
      {/* Welcome Section - Responsive */}
      <div className="text-center py-3 sm:py-4 md:py-6 lg:py-8">
        <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 px-2">
          Welcome to Your Dashboard
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-4">
          {queuePosition ? `Member ID: ${userData.memberId}` : "Complete your membership to get your Member ID"}
        </p>
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
                {stats.queuePosition > 0 ? `#${stats.queuePosition}` : "Not in queue"}
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
              Your position: #{currentUserEntry.rank}
            </span>
          )}
        </h3>
        <div className="space-y-2 sm:space-y-3">
          {topQueue.length > 0 ? (
            <>
              {/* Show all queue members in scrollable list */}
              {topQueue.map((member) => (
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
                      {/* <p className="text-xs sm:text-sm text-muted-foreground">{member.tenureMonths} months</p> */}
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

              {/* Show ellipsis if current user is not in top 3 */}
              {currentUserEntry && !topQueue.slice(0, 3).some(member => member.isCurrentUser) && (
                <>
                  <div className="text-center py-1 sm:py-2">
                    <div className="text-muted-foreground text-sm">•••</div>
                  </div>
                  <div
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg transition-all bg-accent/10 dark:bg-accent/20 shadow-lg"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm sm:text-base bg-blue-100 text-blue-800 shrink-0">
                        {currentUserEntry.rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{currentUserEntry.name}</p>
                        {/* <p className="text-xs sm:text-sm text-muted-foreground">{currentUserEntry.tenureMonths} months</p> */}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-medium">{currentUserEntry.status}</p>
                      <p className="text-[10px] xs:text-xs text-accent font-semibold">You are here</p>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground px-4">No members in queue yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 px-4">
                {!currentUserEntry ? "Complete your membership to join the queue" : ""}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions - Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 md:p-6 shadow-lg border-0">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="truncate">Payment & Billing</span>
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Next Payment Due</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold">
                {stats.paymentAmount > 0 ? `$${stats.paymentAmount}.00` : "$25.00"}
              </p>
              <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground mt-1">{userData.nextPaymentDue}</p>
            </div>
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
                    <span className="truncate">Update Payment Method</span>
                  </>
                )}
              </Button>
              <p className="text-[10px] xs:text-xs sm:text-sm text-muted-foreground text-center px-2">
                Manage your billing through Stripe's secure portal
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
    </div>
  );
};

export default DashboardSimple;
