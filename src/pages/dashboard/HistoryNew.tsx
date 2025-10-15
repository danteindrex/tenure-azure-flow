import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Search, 
  Calendar,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

const HistoryNew = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const historyData = [
    {
      id: "HIST-001",
      type: "payment",
      action: "Monthly Payment Processed",
      description: "Successfully processed monthly membership fee",
      amount: 25.00,
      status: "completed",
      date: "2025-01-15",
      time: "14:30"
    },
    {
      id: "HIST-002",
      type: "queue",
      action: "Queue Position Changed",
      description: "Moved up 2 positions in tenure queue",
      amount: null,
      status: "completed",
      date: "2025-01-14",
      time: "09:15"
    },
    {
      id: "HIST-003",
      type: "milestone",
      action: "Fund Milestone Reached",
      description: "Fund reached $250,000 milestone",
      amount: 250000.00,
      status: "completed",
      date: "2025-01-12",
      time: "16:45"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredHistory = historyData.filter(item => {
    const matchesSearch = item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.type === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-muted-foreground">View your account activity and transaction history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-2xl font-bold">{historyData.length}</p>
            </div>
            <History className="w-8 h-8 text-accent" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{historyData.filter(h => h.status === "completed").length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">{historyData.filter(h => h.status === "failed").length}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
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
              <p className="text-muted-foreground">No history found</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="p-2 rounded-full bg-background/50">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{item.action}</h3>
                        {getStatusIcon(item.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        {item.amount !== null && (
                          <p className="font-bold text-blue-500">
                            +${item.amount?.toFixed(2)}
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

export default HistoryNew;
