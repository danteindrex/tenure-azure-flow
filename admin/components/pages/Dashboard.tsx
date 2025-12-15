'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// No fallback data - use only real data from Supabase

async function fetchDashboardStats() {
  const response = await fetch('/api/dashboard/stats');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return response.json();
}

// User activity not available with current schema

export default function Dashboard() {
  const queryClient = useQueryClient();

  // Realtime: invalidate queries on changes to users/transactions/subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-ui')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['user-activity'] });
      })
      // payments affect revenue and counts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time data
    refetchIntervalInBackground: true, // Continue refetching even when tab is not focused
  });

  const handleRefresh = () => {
    refetch();
    toast.success("Dashboard data refreshed!");
  };

  // Activity data not available with current schema
  const activityData = null;

  // Use only real API data from Supabase
  const revenueData = data?.charts?.revenueData || [];
  const memberData = data?.charts?.memberData || [];
  const recentActivity = data?.recentActivity || [];

  const stats = [
    {
      title: "Total Revenue Collected (Real-time)",
      value: data?.stats?.totalRevenue || "$0",
      change: data?.stats?.revenueChange || "Loading from Supabase...",
      icon: DollarSign,
      gradient: "bg-gradient-success",
    },
    {
      title: "Active Members (Live)",
      value: data?.stats?.activeMembers?.toString() || "0",
      change: data?.stats?.memberChange || "Loading from database...",
      icon: Users,
      gradient: "bg-gradient-primary",
    },
    {
      title: "Recently Active",
      value: data?.stats?.onlineNow?.toString() || "0",
      change: "Users active in last 15 minutes",
      icon: AlertCircle,
      gradient: "bg-gradient-success",
    },
    {
      title: "Total Transactions (Live)",
      value: data?.stats?.totalTransactions?.toString() || "0",
      change: data?.stats?.transactionChange || "Loading from database...",
      icon: Clock,
      gradient: "bg-warning",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back! Here&apos;s an overview of your membership system with real-time Supabase data.
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Now
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="relative overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 border-l-4 border-l-primary/20"
          >
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] text-muted-foreground">LIVE</span>
              </div>
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.gradient}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground transition-all duration-300">
                {stat.value}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Revenue Trend</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Real-time</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[200px] sm:h-[250px] lg:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--success))"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Member Growth Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Member Growth</CardTitle>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Real-time</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[200px] sm:h-[250px] lg:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={memberData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="defaulted"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))" }}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      {data?.integrations && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${data.integrations.stripe.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>Stripe</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {data.integrations.stripe.connected ? `$${data.integrations.stripe.mrr} MRR` : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${data.integrations.twilio.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>Twilio</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {data.integrations.twilio.connected ? `${data.integrations.twilio.totalMessages} messages` : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${data.integrations.email.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>Email Service</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {data.integrations.email.connected ? `${data.integrations.email.totalEmails} emails` : 'Disconnected'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Microservices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.integrations.microservices?.map((service: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-500' :
                        service.status === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <span className="capitalize">{service.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {service.responseTime}ms
                    </span>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground">No microservices detected</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Live updates</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.user}</p>
                </div>
                <span className="text-sm text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
