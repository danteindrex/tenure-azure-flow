import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Search, 
  Crown,
  Clock,
  TrendingUp,
  Award,
  Target,
  Calendar,
  AlertCircle,
  CheckCircle
} from "lucide-react";

const Queue = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const queueData = [
    { 
      rank: 1, 
      name: "Alice Johnson", 
      memberId: "TRP-2024-001",
      tenureMonths: 24, 
      tenureDays: 730,
      status: "Active",
      lastPayment: "2025-01-15",
      nextPayment: "2025-02-15",
      potentialPayout: 125000.00,
      isCurrentUser: false
    },
    { 
      rank: 2, 
      name: "Bob Smith", 
      memberId: "TRP-2024-002",
      tenureMonths: 22, 
      tenureDays: 670,
      status: "Active",
      lastPayment: "2025-01-10",
      nextPayment: "2025-02-10",
      potentialPayout: 125000.00,
      isCurrentUser: false
    },
    { 
      rank: 3, 
      name: "John Doe", 
      memberId: "TRP-2024-003",
      tenureMonths: 18, 
      tenureDays: 548,
      status: "Active",
      lastPayment: "2025-01-15",
      nextPayment: "2025-02-15",
      potentialPayout: 125000.00,
      isCurrentUser: true
    },
    { 
      rank: 4, 
      name: "Emma Wilson", 
      memberId: "TRP-2024-004",
      tenureMonths: 15, 
      tenureDays: 456,
      status: "Active",
      lastPayment: "2025-01-12",
      nextPayment: "2025-02-12",
      potentialPayout: 125000.00,
      isCurrentUser: false
    },
    { 
      rank: 5, 
      name: "Michael Brown", 
      memberId: "TRP-2024-005",
      tenureMonths: 12, 
      tenureDays: 365,
      status: "Active",
      lastPayment: "2025-01-08",
      nextPayment: "2025-02-08",
      potentialPayout: 125000.00,
      isCurrentUser: false
    },
    { 
      rank: 6, 
      name: "Sarah Davis", 
      memberId: "TRP-2024-006",
      tenureMonths: 10, 
      tenureDays: 304,
      status: "Active",
      lastPayment: "2025-01-05",
      nextPayment: "2025-02-05",
      potentialPayout: 125000.00,
      isCurrentUser: false
    },
    { 
      rank: 7, 
      name: "David Lee", 
      memberId: "TRP-2024-007",
      tenureMonths: 8, 
      tenureDays: 243,
      status: "Active",
      lastPayment: "2025-01-03",
      nextPayment: "2025-02-03",
      potentialPayout: 125000.00,
      isCurrentUser: false
    },
    { 
      rank: 8, 
      name: "Lisa Garcia", 
      memberId: "TRP-2024-008",
      tenureMonths: 6, 
      tenureDays: 182,
      status: "Active",
      lastPayment: "2025-01-01",
      nextPayment: "2025-02-01",
      potentialPayout: 125000.00,
      isCurrentUser: false
    }
  ];

  const currentUser = queueData.find(member => member.isCurrentUser);
  const nextPayoutDate = "March 15, 2025";
  const totalFund = 250000.00;
  const winnersCount = 2;

  const filteredQueue = queueData.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.memberId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "Pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "Inactive":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">#{rank}</Badge>;
    } else if (rank <= 10) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">#{rank}</Badge>;
    } else {
      return <Badge variant="secondary">#{rank}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenure Queue</h1>
          <p className="text-muted-foreground">Track your position and progress in the tenure queue</p>
        </div>
      </div>

      {/* Current User Status */}
      {currentUser && (
        <Card className="p-6 bg-accent/5 border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-accent" />
              <div>
                <h3 className="text-lg font-semibold">Your Position</h3>
                <p className="text-sm text-muted-foreground">Current status in the tenure queue</p>
              </div>
            </div>
            {getRankBadge(currentUser.rank)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">#{currentUser.rank}</p>
              <p className="text-sm text-muted-foreground">Queue Position</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{currentUser.tenureMonths}</p>
              <p className="text-sm text-muted-foreground">Months</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{currentUser.tenureDays}</p>
              <p className="text-sm text-muted-foreground">Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">${currentUser.potentialPayout.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Potential Payout</p>
            </div>
          </div>
        </Card>
      )}

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{queueData.length}</p>
            </div>
            <Users className="w-8 h-8 text-accent" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Next Payout</p>
              <p className="text-2xl font-bold">{nextPayoutDate}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Winners</p>
              <p className="text-2xl font-bold">{winnersCount}</p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Fund</p>
              <p className="text-2xl font-bold">${totalFund.toLocaleString()}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Progress to Next Payout */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Progress to Next Payout
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Fund Progress</span>
            <span className="text-sm font-medium">${totalFund.toLocaleString()} / $500,000</span>
          </div>
          <Progress value={50} className="h-2" />
          <p className="text-xs text-muted-foreground">50% complete - Need $250,000 more for next payout</p>
        </div>
      </Card>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>
      </Card>

      {/* Queue Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Queue Members
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Rank</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Member</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Tenure</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Next Payment</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Payout</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((member) => (
                <tr 
                  key={member.rank} 
                  className={`border-b border-border hover:bg-accent/5 transition-colors ${
                    member.isCurrentUser ? 'bg-accent/10' : ''
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {getRankBadge(member.rank)}
                      {member.rank <= winnersCount && (
                        <Award className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.memberId}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium">{member.tenureMonths} months</p>
                      <p className="text-xs text-muted-foreground">{member.tenureDays} days</p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(member.status)}
                      <span className="text-sm">{member.status}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-sm">{member.nextPayment}</p>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <p className="font-semibold text-green-500">${member.potentialPayout.toLocaleString()}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Queue;
