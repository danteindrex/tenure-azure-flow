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
        <Card className="p-4 shadow-lg border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Days Until Payment</p>
              <p className="text-2xl font-bold">{stats.daysUntilPayment}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 shadow-lg border-0">
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

        <Card className="p-4 shadow-lg border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Fund</p>
              <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-4 shadow-lg border-0">
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
      <Card className="p-6 shadow-lg border-0">
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
        <div className="max-h-96 overflow-y-auto space-y-2">
          {topQueue.length > 0 ? (
            <>
              {/* Show all queue members in scrollable list */}
              {topQueue.map((member) => (
                <div
                  key={member.rank}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    member.isCurrentUser
                      ? 'bg-accent/10 dark:bg-accent/20 shadow-lg border-2 border-accent'
                      : 'bg-card shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      member.rank <= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.rank}
                    </div>
                    <div>
                      <p className="font-medium text-sm break-all">{member.name}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">{member.status}</p>
                    {member.isCurrentUser && (
                      <p className="text-xs text-accent font-semibold">You are here</p>
                    )}
                  </div>
                </div>
              ))}
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
        <Card className="p-6 shadow-lg border-0">
          <h3 className="text-lg font-semibold mb-4">Next Payment</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Due: {userData.nextPaymentDue}</p>
            <p className="text-2xl font-bold">
              {stats.paymentAmount > 0 ? `$${stats.paymentAmount}.00` : "$25.00"}
            </p>
            <Button className="w-full shadow-lg" disabled={stats.daysUntilPayment <= 0 && stats.paymentAmount > 0}>
              {stats.daysUntilPayment <= 0 && stats.paymentAmount > 0 ? "Payment Not Due" : "Make Payment"}
            </Button>
          </div>
        </Card>

        <Card className="p-6 shadow-lg border-0">
          <h3 className="text-lg font-semibold mb-4">Next Draw</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {stats.daysUntilDraw > 0 ? `In: ${stats.daysUntilDraw} days` :
               stats.totalRevenue >= PRIZE_PER_WINNER ? "Ready to draw" : "Waiting for fund target"}
            </p>
            <p className="text-2xl font-bold">
              {stats.potentialWinners > 0 ? `${stats.potentialWinners} eligible` : "No eligible members"}
            </p>
            <Button variant="outline" className="w-full shadow-lg">View Details</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSimple;
