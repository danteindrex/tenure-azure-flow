import { useEffect, useState } from "react";
import { Crown, Calendar, DollarSign, Users, Clock, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

const DashboardSimple = () => {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [daysUntilPayment, setDaysUntilPayment] = useState<number>(0);
  const [daysUntilDraw, setDaysUntilDraw] = useState<number>(0);
  const [topQueue, setTopQueue] = useState<Array<{ rank: number; name: string; tenureMonths: number; status: string; isCurrentUser?: boolean }>>([]);
  const BUSINESS_LAUNCH_DATE = process.env.NEXT_PUBLIC_BUSINESS_LAUNCH_DATE || ""; // ISO string fallback
  const PRIZE_PER_WINNER = 100000; // BR-4

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
    const load = async () => {
      try {
        // Total revenue from completed payments using normalized schema
        const { data: payments, error: paymentsError } = await supabase
          .from('user_payments')
          .select('amount, payment_date, user_id, status')
          .eq('status', 'succeeded');
        if (!paymentsError && payments) {
          const sum = payments.reduce((s, p: any) => s + (p.amount || 0), 0);
          setTotalRevenue(sum);
        }

        // Queue position: try to map current user -> membership_queue
        let currentUserId: string | null = null;
        if (user?.id) {
          // Find user by auth_user_id in normalized users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          if (!userError && userData?.id) {
            currentUserId = userData.id;
          }
        }

        // Fetch queue ordered by position using normalized schema
        const { data: queue, error: queueError } = await supabase
          .from('membership_queue')
          .select('user_id, queue_position, total_months_subscribed, subscription_active')
          .order('queue_position', { ascending: true });
        if (!queueError && queue) {
          // Determine current user's position or fallback to first
          let pos: number | null = null;
          if (currentUserId) {
            const mine = queue.find((q: any) => q.user_id === currentUserId);
            if (mine) pos = mine.queue_position;
          }
          setQueuePosition(pos ?? (queue[0]?.queue_position ?? null));

          // Build top queue preview with user names
          const userIds = queue.slice(0, 5).map((q: any) => q.user_id);
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds);

          const preview = queue.slice(0, 5).map((q: any) => {
            const userInfo = users?.find((u: any) => u.id === q.user_id);
            return {
              rank: q.queue_position,
              name: userInfo?.email ? userInfo.email.split('@')[0] : `User ${q.user_id.slice(0, 8)}`,
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user?.id]);

  const userData = {
    memberId: queuePosition ? `#${queuePosition.toString().padStart(3, '0')}` : "—",
    tenureStart: "", // Not available here
    nextPaymentDue: daysUntilPayment > 0 ? `${daysUntilPayment} days` : "—",
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
        <p className="text-muted-foreground">Member ID: {userData.memberId}</p>
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
              <p className="text-2xl font-bold">#{stats.queuePosition}</p>
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
              <p className="text-2xl font-bold">{stats.daysUntilDraw} days</p>
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
            <span className="text-sm font-medium">${stats.totalRevenue.toLocaleString()} / $500,000</span>
          </div>
          <Progress value={50} className="h-2" />
          <p className="text-xs text-muted-foreground">50% complete - Need $250,000 more for next payout</p>
        </div>
      </Card>

      {/* Queue Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Your Queue Status
        </h3>
        <div className="space-y-3">
          {topQueue.slice(0, 3).map((member) => (
            <div
              key={member.rank}
              className={`flex items-center justify-between p-3 rounded-lg ${
                member.isCurrentUser ? 'bg-accent/10 border border-accent/20' : 'bg-background/50'
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
                  <p className="text-xs text-accent">You are here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Next Payment</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Due: {userData.nextPaymentDue}</p>
            <p className="text-2xl font-bold">${stats.paymentAmount}.00</p>
            <Button className="w-full">Make Payment</Button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Next Draw</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Date: {fundData.nextDrawDate}</p>
            <p className="text-2xl font-bold">{stats.potentialWinners} winners</p>
            <Button variant="outline" className="w-full">View Details</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSimple;
