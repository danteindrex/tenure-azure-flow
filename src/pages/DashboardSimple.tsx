import { useState } from "react";
import { Crown, Calendar, DollarSign, Users, Clock, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const DashboardSimple = () => {
  // Static data instead of animated counters
  const userData = {
    memberId: "TRP-2024-001",
    tenureStart: "January 1, 2025",
    nextPaymentDue: "February 1, 2025",
  };

  const stats = {
    daysUntilPayment: 15,
    totalRevenue: 250000,
    potentialWinners: 2,
    daysUntilDraw: 45,
    paymentAmount: 25,
    queuePosition: 3
  };

  const queueData = [
    { rank: 1, name: "Alice Johnson", tenureMonths: 24, status: "Active" },
    { rank: 2, name: "Bob Smith", tenureMonths: 22, status: "Active" },
    { rank: 3, name: "John Doe", tenureMonths: 18, status: "Active", isCurrentUser: true },
    { rank: 4, name: "Emma Wilson", tenureMonths: 15, status: "Active" },
    { rank: 5, name: "Michael Brown", tenureMonths: 12, status: "Active" }
  ];

  const fundData = {
    nextDrawDate: "March 15, 2025",
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
          {queueData.slice(0, 3).map((member) => (
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
