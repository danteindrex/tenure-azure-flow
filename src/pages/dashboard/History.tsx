import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/lib/auth-client";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import {
  History as HistoryIcon,
  Search,
  Filter,
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

const History = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { data: session } = useSession();
  const { data: paymentHistoryData, isLoading: isLoadingPayments } = usePaymentHistory(session?.user?.id);

  // Load activity history from API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);

        const response = await fetch('/api/history/activity?limit=50', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }

        const result = await response.json();

        if (result.success) {
          setActivityData(result.activities || []);
        } else {
          throw new Error(result.error || 'Failed to load activity history');
        }
      } catch (error) {
        console.error('Error fetching history:', error);
        toast({
          title: "Error",
          description: "Failed to load activity history. Please try again.",
          variant: "destructive",
        });
        // Set empty array on error
        setActivityData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Combine activity history with payment transactions
  const historyData = useMemo(() => {
    const payments = (paymentHistoryData?.data || []).map((payment: any) => {
      const paymentDate = new Date(payment.payment_date);
      const dateStr = paymentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = paymentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        id: payment.id,
        type: 'payment',
        action: payment.payment_type === 'initial' ? 'Joining Fee Payment' :
                payment.payment_type === 'recurring' ? 'Recurring Payment' :
                'One-time Payment',
        description: `Payment of $${parseFloat(payment.amount).toFixed(2)} ${payment.currency}`,
        details: payment.provider_invoice_id ? `Invoice: ${payment.provider_invoice_id}` : '',
        status: payment.status,
        date: dateStr,
        time: timeStr,
        amount: parseFloat(payment.amount),
        metadata: {
          payment_id: payment.provider_payment_id,
          invoice_id: payment.provider_invoice_id,
          receipt_url: payment.receipt_url
        }
      };
    });

    console.log('Payment transactions:', payments);
    console.log('Activity data:', activityData);

    // Merge and sort by date
    const combined = [...activityData, ...payments];
    console.log('Combined history:', combined);

    return combined.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
      const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
      return dateB.getTime() - dateA.getTime();
    });
  }, [activityData, paymentHistoryData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <DollarSign className="w-4 h-4 text-blue-500" />;
      case "queue":
        return <User className="w-4 h-4 text-purple-500" />;
      case "milestone":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "profile":
        return <User className="w-4 h-4 text-green-500" />;
      case "bonus":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case "system":
        return <HistoryIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <HistoryIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredHistory = historyData.filter(item => {
    const matchesSearch = item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.type === categoryFilter;
    const matchesDate = dateFilter === "all" || 
                       (dateFilter === "today" && item.date === "2025-01-15") ||
                       (dateFilter === "week" && new Date(item.date) >= new Date("2025-01-08")) ||
                       (dateFilter === "month" && new Date(item.date) >= new Date("2025-01-01"));
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground">View your account activity and transaction history</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-2xl font-bold">{historyData.length}</p>
            </div>
            <HistoryIcon className="w-8 h-8 text-accent" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">{historyData.filter(h => new Date(h.date) >= new Date("2025-01-01")).length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{historyData.filter(h => h.status === "succeeded").length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">
                ${historyData
                  .filter(h => h.type === 'payment' && h.status === 'succeeded')
                  .reduce((sum, h) => sum + (h.amount || 0), 0)
                  .toFixed(2)}
              </p>
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
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
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
              <SelectItem value="bonus">Bonuses</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-background/50">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* History List */}
      <Card className="p-6">
        <div className="space-y-4">
          {(loading || isLoadingPayments) ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-lg animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-accent/10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-accent/10 rounded"></div>
                    <div className="h-3 w-32 bg-accent/10 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <HistoryIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No history found</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="p-2 rounded-full bg-background/50">
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.action}</h3>
                        {getStatusIcon(item.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.details}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        {item.amount !== null && (
                          <p className={`font-bold ${
                            item.type === "payment" && item.status === "failed" ? "text-red-500" :
                            item.type === "bonus" ? "text-green-500" :
                            "text-blue-500"
                          }`}>
                            {item.type === "payment" && item.status === "failed" ? "-" : "+"}${item.amount?.toFixed(2)}
                          </p>
                        )}
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

export default History;
