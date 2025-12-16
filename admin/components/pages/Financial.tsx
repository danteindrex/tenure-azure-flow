'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Percent, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

async function fetchFinancialData() {
  const [financialRes, stripeRes] = await Promise.allSettled([
    fetch('/api/analytics/financial'),
    fetch('/api/analytics/stripe')
  ]);

  return {
    financial: financialRes.status === 'fulfilled' ? await financialRes.value.json() : null,
    stripe: stripeRes.status === 'fulfilled' ? await stripeRes.value.json() : null,
  };
}

export default function Financial() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-data'],
    queryFn: fetchFinancialData,
    refetchInterval: 60000, // Refetch every minute for real-time updates
  });

  const handleRefresh = () => {
    refetch();
    toast.success("Financial data refreshed!");
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Financial Reports</h1>
          <p className="text-muted-foreground">Loading real-time financial data from Supabase...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.financial) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Financial Reports</h1>
          <p className="text-muted-foreground text-red-500">Error loading financial data. Please check your Supabase database connection.</p>
        </div>
      </div>
    );
  }

  // Use 100% real-time financial data from Supabase
  const financialData = data.financial;
  const monthlyRevenue = financialData?.charts?.monthlyRevenue || [];
  const paymentBreakdown = financialData?.charts?.paymentBreakdown || [];
  const expenseBreakdown = financialData?.charts?.expenseBreakdown || [];

  const totalRevenue = financialData?.summary?.totalRevenue || 0;
  const totalExpenses = financialData?.summary?.totalExpenses || 0;
  const netIncome = financialData?.summary?.netIncome || 0;
  const collectionRate = financialData?.summary?.collectionRate || 0;
  const revenueGrowth = financialData?.summary?.revenueGrowth || 0;
  const expenseRatio = financialData?.summary?.expenseRatio || 0;
  
  const stats = [
    {
      title: "Total Revenue (YTD)",
      value: `$${totalRevenue.toLocaleString()}`,
      change: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% vs last month`,
      trend: revenueGrowth >= 0 ? "up" : "down",
      icon: DollarSign,
    },
    {
      title: "Net Income",
      value: `$${netIncome.toLocaleString()}`,
      change: `${((netIncome / (totalRevenue || 1)) * 100).toFixed(1)}% profit margin`,
      trend: netIncome > 0 ? "up" : "down",
      icon: TrendingUp,
    },
    {
      title: "Operating Expenses",
      value: `$${totalExpenses.toLocaleString()}`,
      change: `${expenseRatio.toFixed(1)}% of revenue`,
      trend: expenseRatio < 20 ? "up" : "down",
      icon: TrendingDown,
    },
    {
      title: "Collection Rate",
      value: `${collectionRate.toFixed(1)}%`,
      change: `${financialData?.subscriptionMetrics?.active || 0} active subscriptions`,
      trend: collectionRate > 90 ? "up" : "down",
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Financial Reports
          </h1>
          <p className="text-muted-foreground">
            Real-time financial overview and analytics from Supabase database.
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="shadow-card hover:shadow-elevated transition-all duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="flex items-center mt-1">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-success mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive mr-1" />
                )}
                <span
                  className={`text-sm ${
                    stat.trend === "up" ? "text-success" : "text-destructive"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div> 
     {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue vs Expenses */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle>Revenue vs Expenses (Real-time from Supabase)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
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
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(var(--destructive))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscription Status Breakdown */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Subscription Status (Live Data)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions and Expense Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Transactions (Live from Database)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financialData?.recentTransactions?.length > 0 ? financialData.recentTransactions.slice(0, 5).map((transaction, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {transaction.users?.name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {transaction.type || 'payment'} - {transaction.description || 'Transaction'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.source === 'transactions' ? 'Transactions Table' : 'User Payments Table'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.status === 'completed' ? 'text-success' : 
                      transaction.status === 'failed' ? 'text-destructive' : 'text-warning'
                    }`}>
                      {transaction.currency || '$'} {parseFloat(transaction.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent transactions found in database.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Data is pulled from Supabase transactions and user_payments tables.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Expense Breakdown (Calculated)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Summary */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Monthly Performance Summary (Real-time Data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyRevenue.length > 0 ? monthlyRevenue.slice(-3).map((item, index) => {
              const net = item.revenue - item.expenses;
              const margin = item.revenue > 0 ? ((net / item.revenue) * 100).toFixed(1) : 0;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0"
                >
                  <div className="font-medium text-foreground">{item.month}</div>
                  <div className="grid grid-cols-4 gap-4 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-semibold text-foreground text-sm">
                        ${item.revenue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expenses</p>
                      <p className="font-semibold text-destructive text-sm">
                        ${item.expenses.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net</p>
                      <p className="font-semibold text-success text-sm">
                        ${net.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Margin</p>
                      <p className="font-semibold text-foreground text-sm">{margin}%</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No financial data available in database.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add transactions to your Supabase database to see monthly performance.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Source Information */}
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Real-time Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Supabase Tables:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>transactions</strong> - All transaction records</li>
                <li>• <strong>user_payments</strong> - User payment history</li>
                <li>• <strong>subscriptions</strong> - Subscription data</li>
                <li>• <strong>users</strong> - User information</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Update Frequency:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Auto-refresh:</strong> Every 60 seconds</li>
                <li>• <strong>Manual refresh:</strong> Click refresh button</li>
                <li>• <strong>Data processing:</strong> Real-time calculations</li>
                <li>• <strong>No dummy data:</strong> 100% live database</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}