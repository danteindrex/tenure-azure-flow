import { useState } from "react";
import { Crown, LogOut, User, Calendar, DollarSign, Users, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import { QueueRow } from "@/components/QueueRow";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Animated counters
  const daysUntilPayment = useCounterAnimation(15, 1200, 100);
  const totalRevenue = useCounterAnimation(250000, 1500, 200);
  const potentialWinners = useCounterAnimation(2, 800, 300);
  const daysUntilDraw = useCounterAnimation(45, 1000, 250);
  const paymentAmount = useCounterAnimation(25, 800, 150);
  const queueCounter = useCounterAnimation(1, 500, 0);

  // Mock data
  const userData = {
    name: "John Doe",
    memberId: "TRP-2024-001",
    tenureStart: "January 1, 2025",
    nextPaymentDue: "February 1, 2025",
  };

  const queueData = [
    { rank: 1, name: "Alice Johnson", tenureMonths: 24, status: "Active" },
    { rank: 2, name: "Bob Smith", tenureMonths: 22, status: "Active" },
    { rank: 3, name: "John Doe", tenureMonths: 18, status: "Active", isCurrentUser: true },
    { rank: 4, name: "Emma Wilson", tenureMonths: 15, status: "Active" },
    { rank: 5, name: "Michael Brown", tenureMonths: 12, status: "Active" },
  ];

  const activityFeed = [
    { title: "Milestone Reached", message: "$250,000 collected — 2 winners funded!", timestamp: "2 hours ago" },
    { title: "Payment Processed", message: "Your monthly payment of $25 was successful", timestamp: "1 day ago" },
    { title: "Queue Update", message: "You moved up 2 positions in the tenure queue", timestamp: "3 days ago" },
  ];

  const fundData = {
    nextDrawDate: "March 15, 2025",
  };

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sweep Animation on Load */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent sweep-line z-50" />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 text-accent">
              <Crown className="w-6 h-6" />
              <span className="text-xl font-bold">Tenure</span>
            </div>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-accent/10"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <span className="hidden md:inline">{userData.name}</span>
                <div className="w-2 h-2 rounded-full bg-success pulse-glow" />
              </Button>

              {showProfileMenu && (
                <Card className="absolute right-0 mt-2 w-48 glass-card p-2 animate-fade-in">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 rounded-md text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card p-6 hover-glow group border-indigo-600">
                <div className="space-y-2">
                  <p className="text-sm text-indigo-300 font-medium">Anonymous Member ID</p>
                  <p className="text-2xl font-mono font-bold text-white group-hover:glow-blue transition-all">
                    {userData.memberId}
                  </p>
                  <p className="text-xs text-indigo-400">Unique identifier for system use.</p>
                </div>
              </Card>

              <Card className="glass-card p-6 hover-glow group border-green-600">
                <div className="space-y-2">
                  <p className="text-sm text-green-300 font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Tenure Start Date
                  </p>
                  <p className="text-lg font-bold text-white">{userData.tenureStart}</p>
                  <p className="text-xs text-green-400">Tenure is calculated to the millisecond.</p>
                </div>
              </Card>

              <Card className="glass-card p-6 hover-glow group border-red-600">
                <div className="space-y-2">
                  <p className="text-sm text-red-300 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Next Payment Due (Critical)
                  </p>
                  <p className="text-lg font-bold text-red-400" ref={daysUntilPayment.ref}>{daysUntilPayment.count} days</p>
                  <p className="text-xs text-red-400">Defaulting means instant loss of rank! ($25.00)</p>
                </div>
              </Card>
            </div>

            {/* Tenure Queue */}
            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Tenure Queue
              </h2>
              <div className="overflow-x-auto" ref={queueCounter.ref}>
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3">Rank</th>
                      <th className="pb-3">Member</th>
                      <th className="pb-3">Tenure Time</th>
                      <th className="pb-3">Status</th>
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

            {/* Activity Feed */}
            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Activity Feed
              </h2>
              <div className="space-y-3">
                {activityFeed.map((activity, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-background/50 hover:bg-accent/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-accent transition-colors">
                          {activity.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{activity.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* Payout Fund Tracker */}
            <Card className="glass-card p-6 hover-glow">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                💰 Payout Fund Tracker
              </h2>
              <div className="space-y-6">
                <div className="p-4 bg-purple-900/50 rounded-lg border border-purple-600">
                  <p className="text-sm text-purple-300 font-medium">Current Revenue Collected (Member Fees)</p>
                  <p className="text-4xl font-bold text-purple-400 mt-1" ref={totalRevenue.ref}>
                    ${totalRevenue.count.toLocaleString()}.00
                  </p>
                </div>

                <div className="p-4 bg-yellow-900/50 rounded-lg border-2 border-yellow-500">
                  <p className="text-sm text-yellow-300 font-medium">Potential Winners Funded</p>
                  <p className="text-4xl font-bold text-yellow-400 mt-1" ref={potentialWinners.ref}>
                    {potentialWinners.count} Winners
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">The top {potentialWinners.count} tenured members' prizes are currently covered.</p>
                </div>

                <div className="text-center p-3 bg-red-900/50 rounded-lg border border-red-600 countdown-pulse">
                  <p className="text-sm text-red-300 font-medium">12 Month Payout Countdown:</p>
                  <p className="text-3xl font-bold text-red-400 tracking-wider" ref={daysUntilDraw.ref}>
                    {daysUntilDraw.count} DAYS
                  </p>
                </div>
              </div>
            </Card>

            {/* Payment Card */}
            <Card className="glass-card p-6 border-2 border-green-600 glow-blue">
              <h2 className="text-xl font-bold mb-4">Time to Renew?</h2>
              <p className="text-sm text-muted-foreground mb-4">Secure your position by ensuring your next payment is processed on time.</p>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Next payment in</p>
                  <p className="text-3xl font-bold text-red-400 my-2" ref={paymentAmount.ref}>
                    {daysUntilPayment.count} Days
                  </p>
                  <p className="text-2xl font-bold text-accent">${paymentAmount.count.toFixed(2)}</p>
                </div>

                <Button className="w-full py-4 px-4 bg-green-500 hover:bg-green-600 text-gray-900 font-extrabold rounded-xl shadow-xl transition duration-150 transform hover:scale-[1.02]" size="lg">
                  PROCESS $25.00 MONTHLY FEE NOW
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Auto-renewal status: **Active** (Update Payment Method)
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
