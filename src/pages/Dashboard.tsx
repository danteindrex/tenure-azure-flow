import { useState, useEffect } from "react";
import { Crown, Calendar, DollarSign, Users, Clock, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import { QueueRow } from "@/components/QueueRow";
import { useSession } from "@/lib/auth-client";
import PaymentNotificationBanner from "@/components/PaymentNotificationBanner";
import BusinessLogicService, { BUSINESS_RULES } from "@/lib/business-logic";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    memberId: "",
    tenureStart: "",
    nextPaymentDue: "",
    lastPaymentDate: "",
    paymentStatus: "",
    queuePosition: 0,
    totalPaid: 0,
    subscriptionActive: false,
  });
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    potentialWinners: 0,
    daysUntilDraw: 45,
    daysUntilPayment: 0,
    paymentAmount: 25,
    fundReady: false,
    timeReady: false,
    payoutReady: false,
    fundStatus: 'Loading...',
    timeStatus: 'Loading...',
  });


  const { data: session } = useSession();
  const user = session?.user;

  // Animated counters - will be updated with real data
  const daysUntilPayment = useCounterAnimation(dashboardStats.daysUntilPayment, 1200, 100);
  const totalRevenue = useCounterAnimation(dashboardStats.totalRevenue, 1500, 200);
  const potentialWinners = useCounterAnimation(dashboardStats.potentialWinners, 800, 300);
  const daysUntilDraw = useCounterAnimation(dashboardStats.daysUntilDraw, 1000, 250);
  const paymentAmount = useCounterAnimation(dashboardStats.paymentAmount, 800, 150);
  const queueCounter = useCounterAnimation(userData.queuePosition, 500, 0);

  // Load user data and dashboard statistics
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        // Show default data even without user
        setDashboardStats({
          totalRevenue: 0,
          potentialWinners: 0,
          daysUntilDraw: 45,
          daysUntilPayment: 0,
          paymentAmount: 300, // Joining fee for new users
          fundReady: false,
          timeReady: true, // Since we're past 12 months from 2024-01-01
          payoutReady: false,
          fundStatus: 'Need $100,000 to reach minimum payout threshold',
          timeStatus: 'Time Requirement Met (12+ months since launch)',
        });
        
        setActivityFeed([
          {
            title: "💰 Fund Building Progress",
            message: "Current fund: $0. Need $100,000 more to reach minimum payout threshold.",
            timestamp: "Live",
            type: "info"
          },
          {
            title: "⏰ Time Requirement Met",
            message: "12+ months have passed since business launch (Jan 1, 2024). Time requirement satisfied.",
            timestamp: "Active",
            type: "success"
          },
          {
            title: "🚀 Join the Fund",
            message: "Complete your $300 joining fee to start contributing to the payout fund and secure your queue position.",
            timestamp: "Available",
            type: "warning"
          }
        ]);
        
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get user data from normalized tables
        const { data: dbUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
        }

        // Get queue position from membership_queue
        const { data: queueData, error: queueError } = await supabase
          .from('membership_queue')
          .select('queue_position, is_active, months_in_queue, last_payment_date, total_amount_paid')
          .eq('user_id', dbUser?.id)
          .single();

        if (queueError) {
          console.error('Error fetching queue data:', queueError);
        }

        // Get latest payment from user_payments
        const { data: latestPayment, error: paymentError } = await supabase
          .from('user_payments')
          .select('payment_date, amount, status')
          .eq('user_id', dbUser?.id)
          .order('payment_date', { ascending: false })
          .limit(1)
          .single();

        if (paymentError && paymentError.code !== 'PGRST116') {
          console.error('Error fetching payment data:', paymentError);
        }



        // Initialize business logic service
        const businessLogic = new BusinessLogicService(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get payout status using correct business rules
        const payoutStatus = await businessLogic.getPayoutStatus();

        // Get member payment status
        const memberPaymentStatus = await businessLogic.getMemberPaymentStatus(dbUser?.id);

        // Calculate next payment due using business logic
        let nextPaymentDue = '';
        let daysUntilPayment = 0;
        
        if (memberPaymentStatus.nextPaymentDue) {
          nextPaymentDue = new Date(memberPaymentStatus.nextPaymentDue).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          daysUntilPayment = Math.ceil(
            (new Date(memberPaymentStatus.nextPaymentDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
        } else if (!memberPaymentStatus.hasJoiningFee) {
          nextPaymentDue = 'Joining Fee Required ($300)';
          daysUntilPayment = 0;
        } else {
          nextPaymentDue = 'Monthly Payment Required ($25)';
          daysUntilPayment = 0;
        }

        // Get tenure start from business logic (BR-9)
        const tenureStart = await businessLogic.getMemberTenureStart(dbUser?.id);

        // Set user data with correct business logic
        const userInfo = {
          memberId: dbUser?.id ? `TRP-${dbUser.id.toString().padStart(3, '0')}` : `TRP-${new Date().getFullYear()}-${String(user.id).slice(-3).toUpperCase()}`,
          tenureStart: tenureStart ? tenureStart.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : (memberPaymentStatus.hasJoiningFee ? 'Joining fee paid' : 'Joining fee required'),
          nextPaymentDue,
          lastPaymentDate: memberPaymentStatus.lastMonthlyPayment ? memberPaymentStatus.lastMonthlyPayment.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : (memberPaymentStatus.hasJoiningFee ? 'Joining fee only' : 'No payments yet'),
          paymentStatus: memberPaymentStatus.isInDefault ? 'Default Risk' : (memberPaymentStatus.hasJoiningFee ? 'Active' : 'Pending'),
          queuePosition: queueData?.queue_position || 0,
          totalPaid: memberPaymentStatus.totalPaid,
          subscriptionActive: !memberPaymentStatus.isInDefault && memberPaymentStatus.hasJoiningFee,
        };

        // Set dashboard statistics with correct business rules
        const stats = {
          totalRevenue: payoutStatus.totalRevenue,
          potentialWinners: payoutStatus.potentialWinners,
          daysUntilDraw: payoutStatus.daysUntilEligible,
          daysUntilPayment: Math.max(0, daysUntilPayment),
          paymentAmount: memberPaymentStatus.hasJoiningFee ? BUSINESS_RULES.MONTHLY_FEE : BUSINESS_RULES.JOINING_FEE,
          fundReady: payoutStatus.fundReady,
          timeReady: payoutStatus.timeReady,
          payoutReady: payoutStatus.payoutReady,
          fundStatus: payoutStatus.fundStatus,
          timeStatus: payoutStatus.timeStatus,
        };

        // Get winner order for queue display (BR-5, BR-6, BR-10)
        const winnerOrder = await businessLogic.getWinnerOrder();
        const queueDisplay = winnerOrder.slice(0, 10).map((member, index) => ({
          rank: member.queuePosition,
          name: member.memberName,
          tenureMonths: Math.floor(
            (Date.now() - member.tenureStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
          ),
          status: member.isActive ? 'Active' : 'Inactive',
          isCurrentUser: member.memberId === dbUser?.id,
          memberId: member.memberId
        }));

        // Generate activity feed based on business logic
        const activities = [];
        
        // Payout eligibility activity
        if (payoutStatus.payoutReady) {
          activities.push({
            title: "🎉 Payout Conditions Met!",
            message: `Fund has reached $${payoutStatus.totalRevenue.toLocaleString()} with ${payoutStatus.potentialWinners} potential winners. Payout process can begin.`,
            timestamp: "Now",
            type: "success"
          });
        } else {
          if (!payoutStatus.fundReady) {
            activities.push({
              title: "💰 Fund Building Progress",
              message: `Current fund: $${payoutStatus.totalRevenue.toLocaleString()}. Need $${(BUSINESS_RULES.PAYOUT_THRESHOLD - payoutStatus.totalRevenue).toLocaleString()} more to reach minimum payout threshold.`,
              timestamp: "Live",
              type: "info"
            });
          }
          if (!payoutStatus.timeReady) {
            activities.push({
              title: "⏰ Time Requirement Progress", 
              message: `${payoutStatus.daysUntilEligible} days remaining until 12-month business launch requirement is met.`,
              timestamp: "Live",
              type: "info"
            });
          }
        }

        // Member status activity
        if (memberPaymentStatus.isInDefault) {
          activities.push({
            title: "⚠️ Payment Default Risk",
            message: `Your membership is at risk due to overdue payments. Pay immediately to maintain your queue position.`,
            timestamp: "Critical",
            type: "error"
          });
        } else if (memberPaymentStatus.hasJoiningFee) {
          activities.push({
            title: "✅ Active Membership",
            message: `Your tenure is being tracked. Total paid: $${memberPaymentStatus.totalPaid}. Monthly payments: ${memberPaymentStatus.monthlyPaymentCount}.`,
            timestamp: "Active",
            type: "success"
          });
        } else {
          activities.push({
            title: "🚀 Complete Your Registration",
            message: `Pay your $${BUSINESS_RULES.JOINING_FEE} joining fee to activate your membership and start tenure tracking.`,
            timestamp: "Pending",
            type: "warning"
          });
        }

        // Queue position activity
        if (userInfo.queuePosition > 0) {
          const positionSuffix = userInfo.queuePosition === 1 ? 'st' : 
                                userInfo.queuePosition === 2 ? 'nd' : 
                                userInfo.queuePosition === 3 ? 'rd' : 'th';
          activities.push({
            title: `🏆 Queue Position: ${userInfo.queuePosition}${positionSuffix}`,
            message: `You are currently ${userInfo.queuePosition}${positionSuffix} in line for payout based on your continuous tenure.`,
            timestamp: "Current",
            type: "info"
          });
        }

        setUserData(userInfo);
        setDashboardStats(stats);
        setQueueData(queueDisplay);
        setActivityFeed(activities);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Set default data even on error to show payout components
        setDashboardStats({
          totalRevenue: 0,
          potentialWinners: 0,
          daysUntilDraw: 45,
          daysUntilPayment: 0,
          paymentAmount: 25,
          fundReady: false,
          timeReady: true, // Since we're past 12 months from 2024-01-01
          payoutReady: false,
          fundStatus: 'Need $100,000 to reach minimum payout threshold',
          timeStatus: 'Time Requirement Met (12+ months since launch)',
        });
        
        setActivityFeed([
          {
            title: "💰 Fund Building Progress",
            message: "Current fund: $0. Need $100,000 more to reach minimum payout threshold.",
            timestamp: "Live",
            type: "info"
          },
          {
            title: "⏰ Time Requirement Met",
            message: "12+ months have passed since business launch. Time requirement satisfied.",
            timestamp: "Active",
            type: "success"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, supabase]);

  // Queue data state
  const [queueData, setQueueData] = useState([]);

  // Activity feed state
  const [activityFeed, setActivityFeed] = useState([]);

  const fundData = {
    nextDrawDate: "March 15, 2025",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Payment Notification Banner */}
        <PaymentNotificationBanner />
        
        {/* Mobile Priority Section - Compact Vertical Layout */}
        <div className="lg:hidden space-y-3 mb-6">
          {/* Compact Payout Fund & Payment Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Mini Payout Fund */}
            <Card className="glass-card p-2 hover-glow">
              <div className="text-center">
                <p className="text-xs text-purple-300 font-medium">Revenue</p>
                <p className="text-lg font-bold text-purple-400" ref={totalRevenue.ref}>
                  ${totalRevenue.count.toLocaleString()}
                </p>
                <p className="text-xs text-yellow-300 mt-1">{potentialWinners.count} x $100K Winners</p>
              </div>
            </Card>

            {/* Mini Payment Card */}
            <Card className="glass-card p-2 border-2 border-green-600 glow-blue">
              <div className="text-center">
                <p className="text-xs text-red-300 font-medium">Payment Due</p>
                <p className="text-lg font-bold text-red-400" ref={paymentAmount.ref}>
                  {daysUntilPayment.count}d
                </p>
                <p className="text-xs text-accent font-bold">${paymentAmount.count.toFixed(0)}</p>
              </div>
            </Card>
          </div>

          {/* Compact Countdown */}
          <Card className={`glass-card p-2 border countdown-pulse ${dashboardStats.payoutReady ? 'bg-green-900/50 border-green-600' : 'bg-red-900/50 border-red-600'}`}>
            <div className="text-center">
              <p className="text-xs font-medium" style={{color: dashboardStats.payoutReady ? '#86efac' : '#fca5a5'}}>
                {dashboardStats.payoutReady ? 'PAYOUT READY!' : 'Payout Eligibility'}
              </p>
              <p className="text-lg font-bold tracking-wider" style={{color: dashboardStats.payoutReady ? '#22c55e' : '#ef4444'}} ref={daysUntilDraw.ref}>
                {dashboardStats.payoutReady ? 'ELIGIBLE' : `${daysUntilDraw.count} DAYS`}
              </p>
            </div>
          </Card>

          {/* Mobile Payment Button */}
          <Button className="w-full py-3 bg-green-500 hover:bg-green-600 text-gray-900 font-bold rounded-xl shadow-xl transition duration-150 transform hover:scale-[1.02] text-sm">
            {userData.subscriptionActive 
              ? `PROCESS $${BUSINESS_RULES.MONTHLY_FEE}.00 MONTHLY FEE NOW`
              : `PAY $${BUSINESS_RULES.JOINING_FEE}.00 JOINING FEE NOW`
            }
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Tenure Queue - Moved to top */}
            <Card className="glass-card p-3 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                Tenure Queue
              </h2>
              <div className="overflow-x-auto" ref={queueCounter.ref}>
                <table className="w-full min-w-[400px]">
                  <thead className="border-b border-border">
                    <tr className="text-left text-xs sm:text-sm text-muted-foreground">
                      <th className="pb-2 sm:pb-3 pr-2">Rank</th>
                      <th className="pb-2 sm:pb-3 pr-2">Member</th>
                      <th className="pb-2 sm:pb-3 pr-2">Tenure</th>
                      <th className="pb-2 sm:pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueData.map((member, index) => (
                      <QueueRow
                        key={member.rank}
                        rank={member.rank}
                        name={member.name}
                        tenureMonths={member.tenureMonths}
                        status={member.status}
                        isCurrentUser={member.isCurrentUser}
                        index={index}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Status Cards - Moved below queue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Card className="glass-card p-4 sm:p-6 hover-glow group border-indigo-600">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-xs sm:text-sm text-indigo-300 font-medium">Anonymous Member ID</p>
                  <p className="text-lg sm:text-2xl font-mono font-bold text-white group-hover:glow-blue transition-all break-all">
                    {userData.memberId}
                  </p>
                  <p className="text-xs text-indigo-400 hidden sm:block">Unique identifier for system use.</p>
                </div>
              </Card>

              <Card className="glass-card p-4 sm:p-6 hover-glow group border-green-600">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-xs sm:text-sm text-green-300 font-medium flex items-center gap-1 sm:gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    Tenure Start Date
                  </p>
                  <p className="text-base sm:text-lg font-bold text-white">{userData.tenureStart}</p>
                  <p className="text-xs text-green-400 hidden sm:block">Tenure is calculated to the millisecond.</p>
                </div>
              </Card>

              <Card className={`glass-card p-4 sm:p-6 hover-glow group sm:col-span-2 lg:col-span-1 ${userData.subscriptionActive ? 'border-red-600' : 'border-orange-600'}`}>
                <div className="space-y-1 sm:space-y-2">
                  <p className={`text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 ${userData.subscriptionActive ? 'text-red-300' : 'text-orange-300'}`}>
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    {userData.subscriptionActive ? 'Next Payment Due (Critical)' : 'Joining Fee Required'}
                  </p>
                  <p className={`text-base sm:text-lg font-bold ${userData.subscriptionActive ? 'text-red-400' : 'text-orange-400'}`} ref={daysUntilPayment.ref}>
                    {userData.subscriptionActive 
                      ? `${daysUntilPayment.count} days`
                      : 'Immediate'
                    }
                  </p>
                  <p className={`text-xs ${userData.subscriptionActive ? 'text-red-400' : 'text-orange-400'}`}>
                    {userData.subscriptionActive 
                      ? `Defaulting means instant loss of rank! ($${BUSINESS_RULES.MONTHLY_FEE}.00)`
                      : `Required to start tenure tracking ($${BUSINESS_RULES.JOINING_FEE}.00)`
                    }
                  </p>
                </div>
              </Card>
            </div>

            {/* Activity Feed */}
            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Activity Feed
              </h2>
              <div className="space-y-3">
                {activityFeed.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading activity feed...</p>
                  </div>
                ) : (
                  activityFeed.map((activity, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg hover:bg-accent/5 transition-all cursor-pointer group border-l-4 ${
                        activity.type === 'success' ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' :
                        activity.type === 'error' ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' :
                        activity.type === 'warning' ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20' :
                        'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold group-hover:text-accent transition-colors">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">{activity.message}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          activity.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          activity.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          activity.type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {activity.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - 1/3 (Desktop Only) */}
          <div className="hidden lg:block space-y-6">
            {/* Payout Fund Tracker */}
            <Card className="glass-card p-3 sm:p-6 hover-glow">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                💰 Payout Fund Tracker
              </h2>
              <div className="space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 bg-purple-900/50 rounded-lg border border-purple-600">
                  <p className="text-xs sm:text-sm text-purple-300 font-medium">Current Revenue Collected</p>
                  <p className="text-2xl sm:text-4xl font-bold text-purple-400 mt-1" ref={totalRevenue.ref}>
                    ${totalRevenue.count.toLocaleString()}.00
                  </p>
                </div>

                <div className="p-3 sm:p-4 bg-yellow-900/50 rounded-lg border-2 border-yellow-500">
                  <p className="text-xs sm:text-sm text-yellow-300 font-medium">Potential Winners ($100K Each)</p>
                  <p className="text-2xl sm:text-4xl font-bold text-yellow-400 mt-1" ref={potentialWinners.ref}>
                    {potentialWinners.count} Winners
                  </p>
                  <p className="text-xs text-yellow-500 mt-1 hidden sm:block">
                    {potentialWinners.count > 0 
                      ? `${potentialWinners.count} member${potentialWinners.count > 1 ? 's' : ''} can win $100K each`
                      : 'Need $100K minimum to fund first winner'
                    }
                  </p>
                </div>

                <div className={`text-center p-2 sm:p-3 rounded-lg border countdown-pulse ${dashboardStats.payoutReady ? 'bg-green-900/50 border-green-600' : 'bg-red-900/50 border-red-600'}`}>
                  <p className="text-xs sm:text-sm font-medium" style={{color: dashboardStats.payoutReady ? '#86efac' : '#fca5a5'}}>
                    {dashboardStats.payoutReady ? 'PAYOUT CONDITIONS MET!' : 'Payout Eligibility:'}
                  </p>
                  <p className="text-xl sm:text-3xl font-bold tracking-wider" style={{color: dashboardStats.payoutReady ? '#22c55e' : '#ef4444'}} ref={daysUntilDraw.ref}>
                    {dashboardStats.payoutReady ? 'READY' : `${daysUntilDraw.count} DAYS`}
                  </p>
                  <div className="text-xs mt-2 space-y-1">
                    <p style={{color: dashboardStats.fundReady ? '#22c55e' : '#ef4444'}}>
                      Fund: {dashboardStats.fundStatus}
                    </p>
                    <p style={{color: dashboardStats.timeReady ? '#22c55e' : '#ef4444'}}>
                      Time: {dashboardStats.timeStatus}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Card */}
            <Card className="glass-card p-3 sm:p-6 border-2 border-green-600 glow-blue">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Time to Renew?</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Secure your position by ensuring your next payment is processed on time.</p>
              <div className="space-y-3 sm:space-y-4">
                <div className="text-center py-2 sm:py-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">Next payment in</p>
                  <p className="text-xl sm:text-3xl font-bold text-red-400 my-1 sm:my-2" ref={paymentAmount.ref}>
                    {daysUntilPayment.count} Days
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-accent">${paymentAmount.count.toFixed(2)}</p>
                </div>

                <Button className="w-full py-3 sm:py-4 px-3 sm:px-4 bg-green-500 hover:bg-green-600 text-gray-900 font-bold sm:font-extrabold rounded-xl shadow-xl transition duration-150 transform hover:scale-[1.02] text-sm sm:text-base" size="lg">
                  {userData.subscriptionActive 
                    ? `PROCESS $${BUSINESS_RULES.MONTHLY_FEE}.00 MONTHLY FEE NOW`
                    : `PAY $${BUSINESS_RULES.JOINING_FEE}.00 JOINING FEE NOW`
                  }
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Auto-renewal status: **Active** (Update Payment Method)
                </p>
              </div>
            </Card>
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
