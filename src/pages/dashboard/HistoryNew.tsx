import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History,
  Search,
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { UserActivityHistory, TransactionHistory } from "@/lib/history";
import { useHistoryData, useHistorySummary, useSearchHistory } from "@/hooks/useHistoryData";
import { PAYMENT_STATUS, getPaymentStatusName } from "@/lib/status-ids";

const HistoryNew = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: session } = useSession();
  const user = session?.user;

  // React Query hooks - replaces manual fetching
  const { data: historyData, isLoading: loadingHistory, isFetching: refreshingHistory, refreshHistory } = useHistoryData(user?.id);
  const { data: summaryData, isLoading: loadingSummary } = useHistorySummary(user?.id);
  const searchMutation = useSearchHistory();

  const activities = historyData?.activities || [];
  const transactions = historyData?.transactions || [];
  const queueChanges = historyData?.queue_changes || [];
  const milestones = historyData?.milestones || [];
  const summary = summaryData || {
    total_activities: 0,
    completed_activities: 0,
    failed_activities: 0,
    total_transactions: 0,
    total_amount: 0,
    recent_activities: []
  };

  const loading = loadingHistory || loadingSummary;
  const refreshing = refreshingHistory;

  const handleRefresh = async () => {
    toast.info("Refreshing history...");
    await refreshHistory();
    toast.success("History refreshed");
  };

  const handleSearch = async () => {
    if (!user || !searchTerm.trim()) return;

    try {
      const results = await searchMutation.mutateAsync({
        userId: user.id,
        searchTerm,
        limit: 50
      });

      if (results.activities.length === 0 && results.transactions.length === 0) {
        toast.info("No results found for your search");
      }
    } catch (error: any) {
      console.error('Error searching history:', error);
      toast.error("Search failed");
    }
  };

  const getStatusIcon = (status: number | string) => {
    const statusId = typeof status === 'string' ? parseInt(status) : status;
    switch (statusId) {
      case PAYMENT_STATUS.SUCCEEDED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case PAYMENT_STATUS.FAILED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case PAYMENT_STATUS.PENDING:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case PAYMENT_STATUS.CANCELED:
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: number | string) => {
    const statusId = typeof status === 'string' ? parseInt(status) : status;
    const statusName = getPaymentStatusName(statusId);
    
    switch (statusId) {
      case PAYMENT_STATUS.SUCCEEDED:
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{statusName}</Badge>;
      case PAYMENT_STATUS.FAILED:
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{statusName}</Badge>;
      case PAYMENT_STATUS.PENDING:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{statusName}</Badge>;
      case PAYMENT_STATUS.CANCELED:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">{statusName}</Badge>;
      default:
        return <Badge variant="secondary">{statusName}</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case "queue":
        return <User className="w-4 h-4 text-blue-500" />;
      case "milestone":
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case "profile":
        return <User className="w-4 h-4 text-indigo-500" />;
      case "login":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "logout":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "settings":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "support":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  // Combine all history items for display
  const allHistoryItems = [
    ...activities.map(activity => ({
      id: activity.id,
      type: activity.activity_type,
      action: activity.action,
      description: activity.description,
      amount: activity.amount,
      status: activity.status,
      date: activity.created_at ? new Date(activity.created_at).toLocaleDateString() : '',
      time: activity.created_at ? new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      created_at: activity.created_at,
      isActivity: true
    })),
    ...transactions.map(transaction => {
      const createdDate = transaction.created_at ? new Date(transaction.created_at) : new Date();
      const monthYear = createdDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        id: transaction.id,
        type: 'transaction',
        action: monthYear, // Show month and year instead of "Payment Transaction"
        description: `${transaction.metadata?.payment_type || 'payment'} • $${transaction.amount.toFixed(2)} ${transaction.currency || 'USD'}`,
        amount: transaction.amount,
        status: transaction.status,
        date: createdDate.toLocaleDateString(),
        time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        created_at: transaction.created_at,
        provider_invoice_id: transaction.provider_invoice_id,
        receipt_url: transaction.receipt_url,
        isTransaction: true
      };
    })
  ].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const filteredHistory = allHistoryItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || item.type === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // If no user after initial load, show message
  if (!user && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Please log in to view your history</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">View your account activity and transaction history</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-2xl font-bold">{summary.total_activities}</p>
            </div>
            <History className="w-8 h-8 text-accent" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{summary.completed_activities}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">{summary.failed_activities}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">${summary.total_amount.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={searchMutation.isPending || !searchTerm.trim()}
            className="px-6"
          >
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {searchMutation.isPending ? "Searching..." : "Search"}
          </Button>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-background/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="queue">Queue</SelectItem>
              <SelectItem value="milestone">Milestones</SelectItem>
              <SelectItem value="profile">Profile</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="transaction">Transactions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* History List */}
      <Card className="p-6">
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No results found for your search" : "No history found"}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 border border-border rounded-lg transition-colors ${
                  'receipt_url' in item && item.receipt_url
                    ? 'hover:bg-accent/5 cursor-pointer'
                    : 'hover:bg-accent/5'
                }`}
                onClick={() => {
                  if ('receipt_url' in item && item.receipt_url) {
                    window.open(item.receipt_url, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <div className="p-2 rounded-full bg-background/50">
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.action}</h3>
                        {getStatusIcon(item.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{item.type}</span>
                          {'isActivity' in item && item.isActivity && <span>• Activity</span>}
                          {'isTransaction' in item && item.isTransaction && <span>• Transaction</span>}
                        </div>
                        {'provider_invoice_id' in item && item.provider_invoice_id && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Invoice ID:</span>
                            <span className="font-mono">{item.provider_invoice_id}</span>
                          </div>
                        )}
                        {'receipt_url' in item && item.receipt_url && (
                          <a
                            href={item.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.date} at {item.time}</p>
                      <p className="text-xs text-muted-foreground">{item.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default HistoryNew;
