import { useState } from "react";
import { Crown, LogOut, User, Calendar, DollarSign, Users, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Mock data
  const userData = {
    name: "John Doe",
    memberId: "TRP-2024-001",
    tenureStart: "January 1, 2025",
    nextPaymentDue: "February 1, 2025",
    daysUntilPayment: 15,
  };

  const queueData = [
    { rank: 1, name: "Alice Johnson", tenureTime: "24 months", status: "Active" },
    { rank: 2, name: "Bob Smith", tenureTime: "22 months", status: "Active" },
    { rank: 3, name: "John Doe", tenureTime: "18 months", status: "Active", isCurrentUser: true },
    { rank: 4, name: "Emma Wilson", tenureTime: "15 months", status: "Active" },
    { rank: 5, name: "Michael Brown", tenureTime: "12 months", status: "Active" },
  ];

  const activityFeed = [
    { title: "Milestone Reached", message: "$250,000 collected — 2 winners funded!", timestamp: "2 hours ago" },
    { title: "Payment Processed", message: "Your monthly payment of $25 was successful", timestamp: "1 day ago" },
    { title: "Queue Update", message: "You moved up 2 positions in the tenure queue", timestamp: "3 days ago" },
  ];

  const fundData = {
    totalRevenue: 250000,
    potentialWinners: 2,
    nextDrawDate: "March 15, 2025",
    daysUntilDraw: 45,
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
              <Card className="glass-card p-6 hover-glow group">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Member ID</p>
                  <p className="text-2xl font-mono font-bold text-accent group-hover:glow-blue transition-all">
                    {userData.memberId}
                  </p>
                </div>
              </Card>

              <Card className="glass-card p-6 hover-glow group">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Tenure Start
                  </p>
                  <p className="text-lg font-bold text-success">{userData.tenureStart}</p>
                </div>
              </Card>

              <Card className="glass-card p-6 hover-glow group">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Next Payment
                  </p>
                  <p className="text-lg font-bold text-warning">{userData.daysUntilPayment} days</p>
                </div>
              </Card>
            </div>

            {/* Tenure Queue */}
            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Tenure Queue
              </h2>
              <div className="overflow-x-auto">
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
                    {queueData.map((member) => (
                      <tr
                        key={member.rank}
                        className={`border-b border-border/50 hover:bg-accent/5 transition-colors ${
                          member.isCurrentUser ? "border-l-4 border-l-accent bg-accent/10 pulse-glow" : ""
                        }`}
                      >
                        <td className="py-4 font-mono">{member.rank}</td>
                        <td className="py-4 font-medium">{member.name}</td>
                        <td className="py-4">{member.tenureTime}</td>
                        <td className="py-4">
                          <span className="px-2 py-1 rounded-full bg-success/20 text-success text-xs">
                            {member.status}
                          </span>
                        </td>
                      </tr>
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
                Payout Fund
              </h2>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Revenue Collected</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent counter-animate">
                    ${fundData.totalRevenue.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Potential Winners</p>
                  <p className="text-3xl font-bold text-success counter-animate">
                    {fundData.potentialWinners}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Next Draw</span>
                    <span className="font-medium">{fundData.daysUntilDraw} days</span>
                  </div>
                  <Progress value={(45 / 90) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">{fundData.nextDrawDate}</p>
                </div>
              </div>
            </Card>

            {/* Payment Card */}
            <Card className="glass-card p-6 border-2 border-accent/50 glow-blue">
              <h2 className="text-lg font-bold mb-4">Monthly Payment Due</h2>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Next payment in</p>
                  <p className="text-3xl font-bold text-warning my-2">
                    {userData.daysUntilPayment} Days
                  </p>
                  <p className="text-2xl font-bold text-accent">$25.00</p>
                </div>

                <Button className="w-full bg-accent text-background hover:glow-blue-lg" size="lg">
                  Pay Now
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Auto-pay scheduled for {userData.nextPaymentDue}
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
