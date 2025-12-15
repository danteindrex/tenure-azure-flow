'use client'

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { exportToCSV, exportToPDF, formatDataForExport } from "@/lib/utils/export";

async function fetchTransactions(page = 1, search = '', status = '', type = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
  });
  
  if (search) params.append('search', search);
  if (status && status !== 'all') params.append('status', status);
  if (type && type !== 'all') params.append('type', type);
  
  const response = await fetch(`/api/transactions?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }
  return response.json();
}

async function fetchTransactionStats() {
  const response = await fetch('/api/analytics/financial');
  if (!response.ok) {
    throw new Error('Failed to fetch transaction stats');
  }
  return response.json();
}

export default function TransactionManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [billingSchedules, setBillingSchedules] = useState<any[]>([]);

  // Fetch all transactions once, filter on client side for instant results
  const { data: allTransactionData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['transactions-all'], // Fetch all transactions
    queryFn: () => fetchTransactions(1, '', '', ''), // Fetch without filters
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 10000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['transaction-stats'],
    queryFn: fetchTransactionStats,
    refetchInterval: 60000, // Refetch every minute
  });

  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Transactions refreshed!");
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon!");
  };

  const handleViewTransaction = async (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsViewDialogOpen(true);
    
    // Fetch billing schedules for this user
    if (transaction.user_id) {
      try {
        const response = await fetch(`/api/billing-schedules?user_id=${transaction.user_id}`);
        if (response.ok) {
          const data = await response.json();
          setBillingSchedules(data.schedules || []);
        }
      } catch (error) {
        console.error('Error fetching billing schedules:', error);
        setBillingSchedules([]);
      }
    }
  };

  if (isLoading && !allTransactionData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Transaction Management</h1>
          <p className="text-muted-foreground">Loading real-time transaction data from Supabase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Transaction Management</h1>
          <p className="text-muted-foreground text-red-500">Error loading transactions. Please check your database connection.</p>
        </div>
      </div>
    );
  }

  // Get all transactions and filter client-side for instant results
  let allTransactions = allTransactionData?.transactions || [];
  
  // Apply status filter instantly on client side
  if (statusFilter && statusFilter !== 'all') {
    allTransactions = allTransactions.filter(transaction => transaction.status === statusFilter);
  }
  
  // Apply type filter instantly on client side
  if (typeFilter && typeFilter !== 'all') {
    allTransactions = allTransactions.filter(transaction => transaction.payment_type === typeFilter);
  }
  
  // Apply search filter instantly on client side
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    allTransactions = allTransactions.filter(transaction =>
      transaction.users?.name?.toLowerCase().includes(searchLower) ||
      transaction.users?.email?.toLowerCase().includes(searchLower) ||
      transaction.id?.toLowerCase().includes(searchLower) ||
      transaction.description?.toLowerCase().includes(searchLower)
    );
  }

  // Client-side pagination
  const limit = 20;
  const total = allTransactions.length;
  const pages = Math.ceil(total / limit);
  const offset = (currentPage - 1) * limit;
  const transactions = allTransactions.slice(offset, offset + limit);

  const pagination = { page: currentPage, pages, total, limit };
  
  // Calculate stats from filtered data (updates in real-time as you search)
  const totalAmount = allTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const completedTransactions = allTransactions.filter(t => t.status === 'completed').length;
  const pendingTransactions = allTransactions.filter(t => t.status === 'pending').length;
  const failedTransactions = allTransactions.filter(t => t.status === 'failed').length;

  const stats = [
    {
      title: "Total Transactions",
      value: total.toLocaleString(),
      change: `${transactions.length} on this page`,
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Total Amount",
      value: `$${totalAmount.toLocaleString()}`,
      change: "Current page total",
      trend: "up",
      icon: TrendingUp,
    },
    {
      title: "Completed",
      value: completedTransactions.toString(),
      change: `${((completedTransactions / transactions.length) * 100).toFixed(1)}% success rate`,
      trend: "up",
      icon: CheckCircle,
    },
    {
      title: "Pending/Failed",
      value: (pendingTransactions + failedTransactions).toString(),
      change: `${pendingTransactions} pending, ${failedTransactions} failed`,
      trend: failedTransactions > 0 ? "down" : "up",
      icon: failedTransactions > 0 ? XCircle : Clock,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            Transaction Management
            {isFetching && (
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            )}
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage all financial transactions in real-time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
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
     {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name, email, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="payout">Payout</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="w-full md:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Transactions</span>
            <Badge variant="secondary" className="ml-2">
              {pagination.total} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {transaction.users?.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {transaction.users?.name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.users?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {transaction.payment_type || 'payment'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {transaction.currency || '$'} {parseFloat(transaction.amount || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === "completed" ? "default" : 
                          transaction.status === "failed" ? "destructive" : 
                          transaction.status === "pending" ? "secondary" : "outline"
                        }
                        className={
                          transaction.status === "completed" ? "bg-success text-success-foreground" :
                          transaction.status === "failed" ? "bg-destructive" :
                          transaction.status === "pending" ? "bg-warning text-warning-foreground" : ""
                        }
                      >
                        {transaction.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {transaction.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                        {transaction.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                        {transaction.status || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {transaction.provider || 'manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(transaction.created_at).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTransaction(transaction)}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No transactions found.</p>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your search filters or check back later.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total transactions)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                  disabled={currentPage === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete transaction information and user billing schedules
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Transaction Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono text-sm">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg">
                      {selectedTransaction.currency || 'UGX'} {parseFloat(selectedTransaction.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={
                      selectedTransaction.status === "completed" ? "default" : 
                      selectedTransaction.status === "failed" ? "destructive" : "secondary"
                    }>
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline">{selectedTransaction.payment_type || 'payment'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-sm">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{selectedTransaction.description || 'No description'}</p>
                  </div>
                </div>
              </div>

              {/* Provider IDs */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Provider Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Provider Payment ID</p>
                    <p className="font-mono text-sm break-all">
                      {selectedTransaction.provider_payment_id || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Provider Invoice ID</p>
                    <p className="font-mono text-sm break-all">
                      {selectedTransaction.provider_invoice_id || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Provider Charge ID</p>
                    <p className="font-mono text-sm break-all">
                      {selectedTransaction.provider_charge_id || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Name
                    </p>
                    <p className="font-medium">{selectedTransaction.users?.name || 'Unknown User'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </p>
                    <p className="text-sm">{selectedTransaction.users?.email || 'No email'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-xs">{selectedTransaction.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline">{selectedTransaction.users?.status || 'Unknown'}</Badge>
                  </div>
                </div>
              </div>

              {/* Billing Schedules */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Billing Schedules
                </h3>
                {billingSchedules.length > 0 ? (
                  <div className="space-y-3">
                    {billingSchedules.map((schedule, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="font-semibold">UGX {parseFloat(schedule.amount || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="text-sm">{schedule.due_date ? new Date(schedule.due_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge variant={schedule.status === 'paid' ? 'default' : 'secondary'}>
                              {schedule.status || 'pending'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Payment Method</p>
                            <p className="text-sm">{schedule.payment_method || 'Not specified'}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No billing schedules found for this user</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}