import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  Award,
  Clock,
  Activity
} from "lucide-react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

const Analytics = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [timeRange, setTimeRange] = useState("6months");

  const [overview, setOverview] = useState({
    totalInvested: 0,
    totalEarned: 0,
    netPosition: 0,
    tenureMonths: 0,
    queuePosition: 0,
    potentialPayout: 0,
  });

  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; invested: number; earned: number; net: number }>>([]);
  const [performance, setPerformance] = useState({
    paymentConsistency: 0,
    queueProgress: 0,
    fundGrowth: 0,
    riskLevel: "Low",
  });
  const [projections, setProjections] = useState({
    nextPayout: "",
    estimatedPayout: 0,
    confidence: 0,
  });

  const rangeMonths = useMemo(() => {
    switch (timeRange) {
      case "1month": return 1;
      case "3months": return 3;
      case "6months": return 6;
      case "1year": return 12;
      default: return 24; // all
    }
  }, [timeRange]);

  const monthLabel = (d: Date) => d.toLocaleString("en-US", { month: "short", year: "numeric" });

  const computeNextPayoutLabel = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), 15);
    if (now > target) target.setMonth(target.getMonth() + 1);
    return `${target.toLocaleString("en-US", { month: "long" })} ${target.getFullYear()}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        // Resolve current user_id
        let userId: string | null = null;
        if (user?.id) {
          const { data: userData } = await supabase
            .from('users_complete')
            .select('id, tenure')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          if (userData?.id) userId = userData.id as string;
          setOverview((o) => ({ ...o, tenureMonths: (userData as any)?.tenure ?? 0 }));
        }

        // Fetch payments for current user to compute invested and monthly series
        let investedTotal = 0;
        const now = new Date();
        const months: Array<{ key: string; invested: number; earned: number }> = [];
        for (let i = rangeMonths - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, invested: 0, earned: 0 });
        }

        if (userId) {
          const fromDate = new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1), 1);
          const { data: myPayments } = await supabase
            .from('user_payments')
            .select('amount, payment_date, status')
            .eq('user_id', userId)
            .gte('payment_date', fromDate.toISOString())
            .order('payment_date', { ascending: true });
          if (myPayments) {
            for (const p of myPayments as any[]) {
              investedTotal += p.amount || 0;
              const d = new Date(p.payment_date);
              const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
              const bucket = months.find((m) => m.key === key);
              if (bucket) bucket.invested += p.amount || 0;
            }
          }
        }

        // Fetch queue to compute position and progress
        let queuePosition = 0;
        let queueCount = 0;
        {
          const { data: queue } = await supabase
            .from('membership_queue')
            .select('user_id, queue_position')
            .order('queue_position', { ascending: true });
          if (queue) {
            queueCount = queue.length;
            if (userId) {
              const row = (queue as any[]).find((q) => q.user_id === userId);
              queuePosition = row?.queue_position ?? 0;
            }
          }
        }

        // Compute total earned (if payout table unavailable, keep 0)
        const totalEarned = 0;
        const netPosition = totalEarned - investedTotal;

        // Potential payout: approximate as total revenue of all completed payments / 2
        let totalRevenueAll = 0;
        {
          const { data: allPayments } = await supabase
            .from('payment')
            .select('amount')
            .eq('status', 'Completed');
          if (allPayments) totalRevenueAll = (allPayments as any[]).reduce((s, p) => s + (p.amount || 0), 0);
        }
        const potentialPayout = Math.max(totalRevenueAll / 2, 0);

        // Monthly data finalization
        const monthly = months.map((m, idx) => {
          const date = new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1 - idx), 1);
          const label = monthLabel(date);
          const earned = 0; // no payouts source yet
          return { month: label, invested: m.invested, earned, net: earned - m.invested };
        });

        // Performance metrics
        const monthsWithPayments = monthly.filter((m) => m.invested > 0).length;
        const paymentConsistency = Math.round((monthsWithPayments / Math.max(monthly.length, 1)) * 100);
        const queueProgress = queueCount > 0 && queuePosition > 0 ? Math.round(((queueCount - queuePosition + 1) / queueCount) * 100) : 0;
        const startInvest = monthly[0]?.invested ?? 0;
        const endInvest = monthly[monthly.length - 1]?.invested ?? 0;
        const fundGrowth = startInvest > 0 ? Number((((endInvest - startInvest) / startInvest) * 100).toFixed(1)) : 0;
        const riskLevel = paymentConsistency >= 80 ? "Low" : paymentConsistency >= 50 ? "Medium" : "High";

        // Projections
        const nextPayout = computeNextPayoutLabel();
        const confidence = Math.min(100, Math.max(0, Math.round((paymentConsistency + queueProgress) / 2)));

        setOverview({
          totalInvested: investedTotal,
          totalEarned,
          netPosition,
          tenureMonths: overview.tenureMonths,
          queuePosition,
          potentialPayout,
        });
        setMonthlyData(monthly);
        setPerformance({ paymentConsistency, queueProgress, fundGrowth, riskLevel });
        setProjections({ nextPayout, estimatedPayout: potentialPayout, confidence });
      } catch {
        // Keep defaults on error
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user?.id, rangeMonths]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low": return "text-green-500";
      case "Medium": return "text-yellow-500";
      case "High": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your performance and investment insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Invested</p>
              <p className="text-2xl font-bold">${overview.totalInvested.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold text-green-500">${overview.totalEarned.toFixed(2)}</p>
            </div>
            <Award className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Position</p>
              <p className={`text-2xl font-bold ${overview.netPosition >= 0 ? 'text-green-500' : 'text-red-500'}`}>${overview.netPosition.toFixed(2)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Queue Position</p>
              <p className="text-2xl font-bold">#{overview.queuePosition}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Performance Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment Consistency</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{performance.paymentConsistency}%</span>
                {getTrendIcon(performance.paymentConsistency - 80)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${performance.paymentConsistency}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Queue Progress</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{performance.queueProgress}%</span>
                {getTrendIcon(performance.queueProgress - 50)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${performance.queueProgress}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fund Growth Rate</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{performance.fundGrowth}%</span>
                {getTrendIcon(performance.fundGrowth)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <span className={`font-semibold ${getRiskColor(performance.riskLevel)}`}>
                {performance.riskLevel}
              </span>
            </div>
          </div>
        </Card>

        {/* Projections */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Projections
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-accent/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Next Payout Date</span>
                <Clock className="w-4 h-4 text-accent" />
              </div>
              <p className="text-2xl font-bold">{projections.nextPayout}</p>
            </div>
            
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Estimated Payout</span>
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">${projections.estimatedPayout.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Confidence Level</span>
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{projections.confidence}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Monthly Breakdown
        </h3>
        <div className="space-y-3">
          {monthlyData.map((month, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium">{month.month}</div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="font-semibold text-red-500">-${month.invested}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Earned</p>
                    <p className="font-semibold text-green-500">+${month.earned}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className={`font-semibold ${month.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {month.net >= 0 ? '+' : ''}${month.net}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(month.earned)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          Insights & Recommendations
        </h3>
        <div className="space-y-3">
          <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Excellent Payment Consistency</p>
                <p className="text-sm text-green-700 dark:text-green-300">You've maintained 100% payment consistency. Keep it up!</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Strong Queue Position</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">You're in the top 3 positions. A payout is likely in the next cycle.</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Consider Referrals</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Refer new members to earn bonus rewards and improve your position.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
