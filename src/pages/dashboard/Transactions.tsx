import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import HistoryService from "@/lib/history";
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";


const Transactions = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  // Memoize service so it doesn't trigger useEffect re-runs
  const historyServiceRef = useRef<InstanceType<typeof HistoryService> | null>(null);
  if (!historyServiceRef.current) historyServiceRef.current = new HistoryService();
  const historyService = historyServiceRef.current;
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    // Subscription logic removed - using polling instead
    const fetchAndSubscribe = async () => {
      // fetchTransactions returns the user id used in tables
      const queryUserId = await fetchTransactions();

      // Set up periodic refresh instead of real-time subscriptions
      // TODO: Implement real-time updates with Better Auth and WebSockets if needed
      const targetUserId = queryUserId || user?.id;
      if (!targetUserId) return;
      try {
        // Fallback to polling every 30s
        pollRef.current = window.setInterval(() => fetchTransactions(), 10000);
      } catch (e) {
        console.warn('Realtime subscription failed for transactions, falling back to polling', e);
        pollRef.current = window.setInterval(() => fetchTransactions(), 10000);
      }
    };

    if (user) fetchAndSubscribe();

    return () => {
      // Cleanup polling interval
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return null;
    try {
      setLoading(true);
      // Use auth user ID directly - TODO: Implement user ID mapping if needed
      const queryUserId = user.id;
      const data = await historyService.getTransactionHistory(queryUserId, 100);
      setTransactions(data.map(transaction => ({
        id: transaction.id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        status: transaction.status,
        date: new Date(transaction.created_at).toISOString().split('T')[0],
        description: transaction.description,
        method: transaction.payment_method || 'Unknown',
        reference: transaction.provider_transaction_id || 'N/A'
      })));

      // Calculate monthly total
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyTransactions = data.filter(t => {
        const date = new Date(t.created_at);
        return date.getMonth() === currentMonth &&
               date.getFullYear() === currentYear &&
               t.status === 'succeeded';
      });
      
      setMonthlyTotal(monthlyTransactions.reduce((sum, t) => 
        sum + (t.transaction_type === 'payment' ? t.amount : -t.amount), 0
      ));
      return queryUserId;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    return null;
  };

  

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <ArrowDownLeft className="w-4 h-4 text-red-500" />;
      case "refund":
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case "bonus":
        return <DollarSign className="w-4 h-4 text-blue-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const searchFields = [
      transaction.description,
      transaction.id,
      transaction.method,
      transaction.reference
    ].map(field => (field || '').toLowerCase());
    
    const matchesSearch = searchTerm === '' || 
      searchFields.some(field => field.includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalAmount = transactions
    .filter(t => t.status === "succeeded")
    .reduce((sum, t) => sum + (t.type === "payment" ? -t.amount : t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">View and manage your payment history</p>
        </div>
        <Button 
          className="bg-accent hover:bg-accent/90"
          onClick={() => {
            const csv = filteredTransactions
              .map(t => [
                t.date,
                t.id,
                t.type,
                t.description,
                t.method,
                t.reference,
                t.status,
                `${t.type === 'payment' ? '-' : '+'}${t.amount.toFixed(2)}`
              ].join(','))
              .join('\n');
            
            const blob = new Blob([`Date,ID,Type,Description,Method,Reference,Status,Amount\n${csv}`], 
              { type: 'text/csv' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `$${Math.abs(totalAmount).toFixed(2)}`
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-accent" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `$${Math.abs(monthlyTotal).toFixed(2)}`
                )}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  transactions.filter(t => t.status === "succeeded").length
                )}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  transactions.filter(t => t.status === "pending").length
                )}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
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
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-background/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-background/50">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="p-6">
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-accent/10 rounded"></div>
                      <div className="h-3 w-32 bg-accent/10 rounded"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-24 bg-accent/10 rounded mb-2"></div>
                    <div className="h-3 w-16 bg-accent/10 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-background/50">
                    {getTypeIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{transaction.description}</p>
                      {getStatusIcon(transaction.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {transaction.method} • {transaction.reference} • {transaction.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold ${
                      transaction.type === "payment" ? "text-red-500" : "text-green-500"
                    }`}>
                      {transaction.type === "payment" ? "-" : "+"}${transaction.amount.toFixed(2)}
                    </p>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{transaction.id}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default Transactions;
