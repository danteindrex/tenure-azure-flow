'use client'

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Filter, Edit, Trash2, CreditCard, Calendar, User, RefreshCw, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
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

async function fetchSubscriptions(page = 1, search = '', status = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '10',
    ...(search && { search }),
    ...(status && status !== 'all' && { status })
  });
  
  const response = await fetch(`/api/subscriptions?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch subscriptions');
  }
  return response.json();
}

async function updateSubscription(id: string, subscriptionData: any) {
  const response = await fetch(`/api/subscriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscriptionData),
  });
  if (!response.ok) {
    throw new Error('Failed to update subscription');
  }
  return response.json();
}

async function deleteSubscription(id: string) {
  const response = await fetch(`/api/subscriptions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete subscription');
  }
  return response.json();
}

export default function SubscriptionManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    user_id: '',
    stripe_subscription_id: '',
    provider: 'stripe',
    status: 'active',
    current_period_start: '',
    current_period_end: '',
    plan_id: ''
  });

  const queryClient = useQueryClient();

  // Fetch all subscriptions once, filter on client side for instant results
  const { data: allData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['subscriptions-all'], // Fetch all subscriptions
    queryFn: () => fetchSubscriptions(1, '', '').then(async (firstPage) => {
      // If there are more pages, fetch all of them
      const totalPages = firstPage.pagination.pages;
      if (totalPages > 1) {
        const additionalPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => 
            fetchSubscriptions(i + 2, '', '')
          )
        );
        return {
          subscriptions: [
            ...firstPage.subscriptions,
            ...additionalPages.flatMap(page => page.subscriptions)
          ],
          pagination: firstPage.pagination
        };
      }
      return firstPage;
    }),
    refetchInterval: 30000, // Real-time updates every 30 seconds
    staleTime: 10000, // Keep data fresh for 10 seconds
  });

  // Realtime: refresh subscriptions when user_billing_schedules changes
  useEffect(() => {
    const channel = supabase
      .channel('realtime-billing-schedules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_billing_schedules' }, () => {
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setIsEditDialogOpen(false);
      setSelectedSubscription(null);
      resetForm();
      toast.success('Subscription updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update subscription: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete subscription: ' + error.message);
    },
  });

  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      stripe_subscription_id: '',
      provider: 'stripe',
      status: 'active',
      current_period_start: '',
      current_period_end: '',
      plan_id: ''
    });
  };

  const handleEdit = (subscription: any) => {
    setSelectedSubscription(subscription);
    setFormData({
      user_id: subscription.user_id,
      stripe_subscription_id: subscription.provider_subscription_id || subscription.stripe_subscription_id || '',
      provider: subscription.provider || 'stripe',
      status: subscription.status,
      current_period_start: subscription.current_period_start?.split('T')[0] || '',
      current_period_end: subscription.current_period_end?.split('T')[0] || '',
      plan_id: subscription.plan_id || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedSubscription) return;
    updateMutation.mutate({ id: selectedSubscription.id, data: formData });
  };

  const handleDelete = (subscriptionId: string) => {
    deleteMutation.mutate(subscriptionId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'canceled':
        return 'destructive';
      case 'past_due':
        return 'secondary';
      case 'trialing':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Only show full loading state on initial load (no data yet)
  if (isLoading && !allData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">Loading real-time billing schedules from user_billing_schedules table...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Subscription Management</h1>
          <p className="text-muted-foreground text-red-500">Error loading billing schedules. Please check your database connection.</p>
        </div>
      </div>
    );
  }

  // Get all subscriptions and filter client-side for instant results
  let allSubscriptions = allData?.subscriptions || [];
  
  // Apply status filter instantly on client side
  if (statusFilter && statusFilter !== 'all') {
    allSubscriptions = allSubscriptions.filter(sub => sub.status === statusFilter);
  }
  
  // Apply search filter instantly on client side
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    allSubscriptions = allSubscriptions.filter(sub =>
      sub.users?.name?.toLowerCase().includes(searchLower) ||
      sub.users?.email?.toLowerCase().includes(searchLower) ||
      sub.provider_subscription_id?.toLowerCase().includes(searchLower)
    );
  }

  // Client-side pagination
  const limit = 10;
  const total = allSubscriptions.length;
  const pages = Math.ceil(total / limit);
  const offset = (currentPage - 1) * limit;
  const paginatedSubscriptions = allSubscriptions.slice(offset, offset + limit);

  const pagination = { page: currentPage, pages, total, limit };

  // Separate subscriptions by billing cycle (from filtered results) - case insensitive
  const monthlySubscriptions = allSubscriptions.filter(s => 
    s.billing_cycle?.toUpperCase() === 'MONTHLY'
  );
  const yearlySubscriptions = allSubscriptions.filter(s => 
    s.billing_cycle?.toUpperCase() === 'YEARLY' || s.billing_cycle?.toUpperCase() === 'ANNUAL'
  );

  // Calculate stats from all subscriptions (not filtered)
  const stats = {
    total: allSubscriptions.length,
    active: allSubscriptions.filter(s => s.status === 'active').length,
    canceled: allSubscriptions.filter(s => s.status === 'canceled').length,
    monthly: allSubscriptions.filter(s => s.billing_cycle === 'MONTHLY').length,
    yearly: allSubscriptions.filter(s => s.billing_cycle === 'YEARLY').length
  };

  // Calculate real-time trend data from subscription creation dates
  const calculateMonthlyTrends = () => {
    const monthlyData: any = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = { month: monthKey, active: 0, canceled: 0, trialing: 0 };
    }

    // Count subscriptions by month
    allSubscriptions.forEach(sub => {
      const createdDate = new Date(sub.created_at);
      const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthlyData[monthKey]) {
        if (sub.status === 'active') monthlyData[monthKey].active++;
        else if (sub.status === 'canceled') monthlyData[monthKey].canceled++;
        else if (sub.status === 'trialing') monthlyData[monthKey].trialing++;
      }
    });

    return Object.values(monthlyData);
  };

  // Calculate real monthly revenue from billing schedules
  const calculateMonthlyRevenue = () => {
    const monthlyRevenue: any = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyRevenue[monthKey] = { month: monthKey, revenue: 0 };
    }

    // Calculate revenue from active subscriptions using actual amounts
    allSubscriptions.forEach(sub => {
      if (sub.status === 'active' && sub.created_at) {
        const createdDate = new Date(sub.created_at);
        const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short' });
        
        if (monthlyRevenue[monthKey]) {
          // Use actual amount from billing schedule
          monthlyRevenue[monthKey].revenue += sub.amount || 0;
        }
      }
    });

    return Object.values(monthlyRevenue);
  };

  const trendData = calculateMonthlyTrends();
  const revenueData = calculateMonthlyRevenue();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            Subscription Management
            {isFetching && (
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            )}
          </h1>
          <p className="text-muted-foreground">
            Real-time billing schedules from user_billing_schedules table.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canceled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.canceled}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.monthly}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yearly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.yearly}</div>
          </CardContent>
        </Card>
      </div>

     

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user name, email, or Stripe ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="w-full md:w-auto">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Subscriptions Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Subscriptions ({monthlySubscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Billing Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySubscriptions.length > 0 ? monthlySubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={subscription.users?.image} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{subscription.users?.name || 'No Name'}</div>
                          <div className="text-sm text-muted-foreground">{subscription.users?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {subscription.provider_subscription_id?.substring(0, 20) || 'N/A'}...
                    </TableCell>
                    <TableCell className="font-semibold">
                      {subscription.currency} {subscription.amount?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {subscription.current_period_end ? 
                          new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(subscription.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No monthly subscriptions found.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Subscriptions Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            Yearly Subscriptions ({yearlySubscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Billing Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearlySubscriptions.length > 0 ? yearlySubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={subscription.users?.image} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{subscription.users?.name || 'No Name'}</div>
                          <div className="text-sm text-muted-foreground">{subscription.users?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {subscription.provider_subscription_id?.substring(0, 20) || 'N/A'}...
                    </TableCell>
                    <TableCell className="font-semibold">
                      {subscription.currency} {subscription.amount?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {subscription.current_period_end ? 
                          new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(subscription.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No yearly subscriptions found.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      {/* Data Visualizations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Trends Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Subscription Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
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
                <Line type="monotone" dataKey="active" stroke="hsl(var(--success))" strokeWidth={2} name="Active" />
                <Line type="monotone" dataKey="canceled" stroke="hsl(var(--destructive))" strokeWidth={2} name="Canceled" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscription Distribution Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: stats.active, color: 'hsl(var(--success))' },
                    { name: 'Canceled', value: stats.canceled, color: 'hsl(var(--destructive))' },
                    { name: 'Monthly', value: stats.monthly, color: 'hsl(var(--primary))' },
                    { name: 'Yearly', value: stats.yearly, color: 'hsl(var(--accent))' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Active', value: stats.active, color: '#22c55e' },
                    { name: 'Canceled', value: stats.canceled, color: '#ef4444' },
                    { name: 'Monthly', value: stats.monthly, color: '#3b82f6' },
                    { name: 'Yearly', value: stats.yearly, color: '#8b5cf6' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Summary */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Monthly Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: any) => `$${value.toFixed(2)}`}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-plan_id" className="text-right">Plan ID</Label>
              <Input
                id="edit-plan_id"
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-current_period_start" className="text-right">Period Start</Label>
              <Input
                id="edit-current_period_start"
                type="date"
                value={formData.current_period_start}
                onChange={(e) => setFormData({ ...formData, current_period_start: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-current_period_end" className="text-right">Period End</Label>
              <Input
                id="edit-current_period_end"
                type="date"
                value={formData.current_period_end}
                onChange={(e) => setFormData({ ...formData, current_period_end: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}