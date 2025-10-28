import { useEffect, useState, useRef } from "react";
import { Crown, Calendar, DollarSign, Users, Clock, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/auth-client";

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
        // Total revenue from completed payments using normalized schema
        // Temporarily disabled - TODO: Replace with Better Auth API calls
        const payments = []
        const paymentsError = null
        if (!paymentsError && payments) {
          const sum = payments.reduce((s, p: any) => s + (p.amount || 0), 0);
          setTotalRevenue(sum);
        }

        // Queue position: try to map current user -> membership_queue
        let currentUserId: string | null = null;
        if (user?.id) {
          // Find user by auth_user_id in normalized users table
          // Temporarily disabled - TODO: Replace with Better Auth API calls
          const userData = null
          const userError = null
          if (!userError && userData?.id) {
            currentUserId = userData.id;
          }
        }

        // Fetch queue ordered by position using normalized schema
        // Temporarily disabled - TODO: Replace with Better Auth API calls
        const queue = []
        const queueError = null
      } catch (e) {
        // console.error('Error in fetchQueueAndUsers:', e);
      }
    };
    /*
        const { data: queue, error: queueError } = await supabase
          .from('membership_queue')
          .select('user_id, queue_position, total_months_subscribed, subscription_active')
          .order('queue_position', { ascending: true });
        if (!queueError && queue) {
          // Determine current user's position or fallback to first
          let pos: number | null = null;
          if (currentUserId) {
            setCurrentUserIdState(currentUserId);
            const mine = queue.find((q: any) => q.user_id === currentUserId);
            if (mine) pos = mine.queue_position;
            if (mine) {
              // fetch current user's display name (email local-part) if available
              let displayName = 'You';
              try {
                const { data: meData } = await supabase
                  .from('users')
                  .select('email')
                  .eq('id', currentUserId)
                  .maybeSingle();
                if (meData?.email) displayName = meData.email.split('@')[0];
              } catch (e) {
                // ignore and fallback to 'You'
              }

              // populate current user entry (may not be in top preview)
              setCurrentUserEntry({
                rank: mine.queue_position,
                name: displayName,
                tenureMonths: mine.total_months_subscribed ?? 0,
                status: mine.subscription_active ? 'Active' : 'Inactive',
                isCurrentUser: true
              });
            } else {
              setCurrentUserEntry(null);
            }
          }
          setQueuePosition(pos ?? (queue[0]?.queue_position ?? null));

          // Build top queue preview with user names
          const userIds = queue.slice(0, 5).map((q: any) => q.user_id);
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds);

          const preview = queue.slice(0, 5).map((q: any) => {
            // display raw user_id to match membership_queue entries
            return {
              rank: q.queue_position,
              userId: q.user_id,
              name: q.user_id, // kept for backward compat with existing JSX (member.name), but set to user_id
              tenureMonths: q.total_months_subscribed ?? 0,
              status: q.subscription_active ? 'Active' : 'Inactive',
              isCurrentUser: currentUserId ? q.user_id === currentUserId : false,
            };
          }).sort((a, b) => a.rank - b.rank);
          setTopQueue(preview);
        }

        // Payment amount and days until payment for current user (BR-2 monthly cycle best-effort)
        if (user?.id && currentUserId) {
          const { data: myPayments } = await supabase
            .from('user_payments')
            .select('amount, payment_date, status')
            .eq('user_id', currentUserId)
            .eq('status', 'succeeded')
            .order('payment_date', { ascending: false })
            .limit(1);
          if (myPayments && myPayments.length > 0) {
            setPaymentAmount(myPayments[0].amount || 0);
            // Assume monthly cycle; compute days until 30 days after last payment
            const last = new Date(myPayments[0].payment_date || new Date());
            const next = new Date(last);
            next.setDate(last.getDate() + 30);
            const diff = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            setDaysUntilPayment(Math.max(diff, 0));
          } else {
            setPaymentAmount(0);
            setDaysUntilPayment(0);
          }
        } else {
          setPaymentAmount(0);
          setDaysUntilPayment(0);
        }

        // BR-3: Payout trigger 12 months after launch AND fund >= 100k
        const launch = BUSINESS_LAUNCH_DATE ? new Date(BUSINESS_LAUNCH_DATE) : null;
        if (launch) {
          const twelveMonths = new Date(launch);
          twelveMonths.setMonth(twelveMonths.getMonth() + 12);
          // If at 12 months fund < 100k, continue until threshold is reached
          const threshold = PRIZE_PER_WINNER; // 100k
          if (Date.now() < twelveMonths.getTime()) {
            const d = Math.ceil((twelveMonths.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            setDaysUntilDraw(Math.max(d, 0));
          } else if (totalRevenue < threshold) {
            // Time-based condition satisfied, but threshold not met; indicate 0 days but show progress in UI
            setDaysUntilDraw(0);
          } else {
            // Trigger can occur immediately
            setDaysUntilDraw(0);
          }
        } else {
          // Fallback to mid-month draw cadence if launch date missing
          setDaysUntilDraw(computeDaysUntilNextDraw());
        }
      } catch {
        // Leave defaults on error
      }
    };

    // Initial fetch
    fetchQueueAndUsers();

    // Subscribe to realtime changes in membership_queue to update the UI live
    let channel: any = null;
    try {
      if ((supabase as any)?.channel) {
        channel = (supabase as any)
          .channel('public:membership_queue')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_queue' }, payload => {
            // Re-fetch the preview and current user entry when changes happen
            fetchQueueAndUsers();
          })
          .subscribe();
      } else if ((supabase as any)?.from) {
        // older client real-time API
        (supabase as any)
          .from('membership_queue')
          .on('*', () => fetchQueueAndUsers())
          .subscribe();
      }
    } catch (e) {
      // If realtime isn't available or subscription failed, fallback to polling
      console.warn('Realtime subscription failed, falling back to polling:', e);
      pollRef.current = window.setInterval(() => fetchQueueAndUsers(), 5000);
    }
    */

    return () => {
      // cleanup realtime subscription or polling
      try {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      } catch (e) {
        // ignore
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user?.id, BUSINESS_LAUNCH_DATE, totalRevenue]);

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
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Dashboard</h1>
        <p className="text-muted-foreground">
          {queuePosition ? `Member ID: ${userData.memberId}` : "Complete your membership to get your Member ID"}
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Days Until Payment</p>
              <p className="text-2xl font-bold">{stats.daysUntilPayment}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Queue Position</p>
              <p className="text-2xl font-bold">
                {stats.queuePosition > 0 ? `#${stats.queuePosition}` : "Not in queue"}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Fund</p>
              <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Next Draw</p>
              <p className="text-2xl font-bold">
                {stats.daysUntilDraw > 0 ? `${stats.daysUntilDraw} days` : 
                 stats.totalRevenue >= PRIZE_PER_WINNER ? "Ready" : "Pending fund"}
              </p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Fund Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Fund Progress
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Fund</span>
            <span className="text-sm font-medium">${stats.totalRevenue.toLocaleString()} / ${FUND_TARGET.toLocaleString()}</span>
          </div>
          <Progress value={Math.min((stats.totalRevenue / FUND_TARGET) * 100, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {Math.round((stats.totalRevenue / FUND_TARGET) * 100)}% complete - 
            {stats.totalRevenue >= FUND_TARGET 
              ? " Fund target reached!" 
              : ` Need $${(FUND_TARGET - stats.totalRevenue).toLocaleString()} more for next payout`}
          </p>
        </div>
      </Card>
      
      {/* Queue Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Your Queue Status
          {currentUserEntry && (
            <span className="ml-auto text-sm font-medium text-muted-foreground">Your position: #{currentUserEntry.rank}</span>
          )}
        </h3>
        <div className="space-y-3">
          {topQueue.length > 0 ? (
            <>
              {/* Show top 3 positions */}
              {topQueue.slice(0, 3).map((member) => (
                <div
                  key={member.rank}
                  className={`flex items-center justify-between p-3 rounded-lg transition-shadow ${
                    member.isCurrentUser ? 'bg-indigo-50 border-2 border-indigo-200 shadow-md' : 'bg-background/50 border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      member.rank <= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.rank}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.tenureMonths} months</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{member.status}</p>
                    {member.isCurrentUser && (
                      <p className="text-xs text-indigo-600 font-semibold">You are here</p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Show ellipsis if current user is not in top 3 */}
              {currentUserEntry && !topQueue.slice(0, 3).some(member => member.isCurrentUser) && (
                <>
                  <div className="text-center py-2">
                    <div className="text-muted-foreground">•••</div>
                  </div>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg transition-shadow bg-indigo-50 border-2 border-indigo-200 shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-blue-100 text-blue-800">
                        {currentUserEntry.rank}
                      </div>
                      <div>
                        <p className="font-medium">{currentUserEntry.name}</p>
                        <p className="text-sm text-muted-foreground">{currentUserEntry.tenureMonths} months</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{currentUserEntry.status}</p>
                      <p className="text-xs text-indigo-600 font-semibold">You are here</p>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No members in queue yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                {!currentUserEntry ? "Complete your membership to join the queue" : ""}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Next Payment</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Due: {userData.nextPaymentDue}</p>
            <p className="text-2xl font-bold">
              {stats.paymentAmount > 0 ? `$${stats.paymentAmount}.00` : "$25.00"}
            </p>
            <Button className="w-full" disabled={stats.daysUntilPayment <= 0 && stats.paymentAmount > 0}>
              {stats.daysUntilPayment <= 0 && stats.paymentAmount > 0 ? "Payment Not Due" : "Make Payment"}
            </Button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Next Draw</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {stats.daysUntilDraw > 0 ? `In: ${stats.daysUntilDraw} days` : 
               stats.totalRevenue >= PRIZE_PER_WINNER ? "Ready to draw" : "Waiting for fund target"}
            </p>
            <p className="text-2xl font-bold">
              {stats.potentialWinners > 0 ? `${stats.potentialWinners} eligible` : "No eligible members"}
            </p>
            <Button variant="outline" className="w-full">View Details</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSimple;
