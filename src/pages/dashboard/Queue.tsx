import { useState, useEffect } from "react";
import { useCallback } from "react";
import { useSession } from "@/lib/auth-client";
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
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  RefreshCw
} from "lucide-react";

import { toast } from "sonner";
// Queue service moved to API endpoints - using fetch calls instead
import { QueueMember } from "@/lib/types";

const Queue = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [queueData, setQueueData] = useState<QueueMember[]>([]);
  const [statistics, setStatistics] = useState({
    totalMembers: 0,
    activeMembers: 0,
    eligibleMembers: 0,
    totalRevenue: 0,
    potentialWinners: 0,
    payoutThreshold: 500000,
    receivedPayouts: 0
  });
  const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queue service moved to API endpoints - using fetch calls instead
  const { data: session } = useSession();
  const user = session?.user;

  // Load queue data from microservice
  const loadQueueData = async () => {
    if (!user) {
      console.log('No user authenticated, skipping queue data load');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/queue?${searchTerm ? `search=${encodeURIComponent(searchTerm)}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to load queue data');
      }
      
      const result = await response.json();
      
      // Handle both direct response and nested data structure
      const data = result.data || result;
      
      // Map view fields to component expected fields
      const mappedQueue = (data.queue || []).map((member: any) => ({
        id: member.user_id,
        position: member.queue_position,
        name: member.full_name || 'N/A',
        email: member.email,
        continuousTenure: member.total_successful_payments || 0,
        totalPaid: parseFloat(member.lifetime_payment_total || 0),
        status: member.is_eligible ? 'active' : 'inactive',
        eligible: member.is_eligible,
        lastPaymentDate: member.last_payment_date,
        joinDate: member.tenure_start_date,
        hasReceivedPayout: member.has_received_payout
      }));
      
      setQueueData(mappedQueue);
      setStatistics(data.statistics || {});

    } catch (error) {
      console.error('Error loading queue data:', error);
      toast.error('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh queue data
  const refreshQueueData = async () => {
    setRefreshing(true);
    await loadQueueData();
    setRefreshing(false);
    toast.success('Queue data refreshed');
  };

  useEffect(() => {
    if (user) {
      loadQueueData();
    }
  }, [user]);

  // Find current user in queue
  const currentUserMember = queueData.find(member => 
    member.id && user?.id && member.id.toString() === user.id
  );

  // Use statistics from microservice
  const { activeMembers, eligibleMembers, totalRevenue, potentialWinners } = statistics;
  const nextPayoutDate = "March 15, 2025"; // This could be calculated based on business rules
  const winnersCount = potentialWinners;
  const potentialPayoutPerWinner = totalRevenue > 0 ? totalRevenue / Math.max(winnersCount, 1) : 0;

  // Filter queue data based on search
  const filteredQueue = queueData.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.id.toString().includes(searchTerm)
  );

  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getEligibilityBadge = (isEligible: boolean, subscriptionActive: boolean) => {
    if (isEligible && subscriptionActive) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Eligible</Badge>;
    } else if (subscriptionActive) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Active</Badge>;
    } else {
      return <Badge variant="destructive">Inactive</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading queue data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (queueData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Queue Data Available</h3>
            <p className="text-muted-foreground">Queue data will appear here once members are added to the system.</p>
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> The queue table needs to be created in the database. 
                Run the SQL script in <code>create-queue-table.sql</code> in your Supabase dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    // show the raw number (no # prefix) — callers should pass queue_position when available
    if (rank <= 3) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{rank}</Badge>;
    } else if (rank <= 10) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{rank}</Badge>;
    } else {
      return <Badge variant="secondary">{rank}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenure Queue</h1>
          <p className="text-muted-foreground">Track member positions and progress in the tenure queue</p>
        </div>
        <Button 
          onClick={refreshQueueData} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Current User Status */}
      {currentUserMember && (
        <Card className="p-6 bg-accent/5 border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-accent" />
              <div>
                <h3 className="text-lg font-semibold">Your Position</h3>
                <p className="text-sm text-muted-foreground">Current status in the tenure queue</p>
              </div>
            </div>
            {getRankBadge(currentUserMember.position)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{currentUserMember.position}</p>
              <p className="text-sm text-muted-foreground">Queue Position</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{currentUserMember.continuousTenure}</p>
              <p className="text-sm text-muted-foreground">Months Subscribed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(currentUserMember.totalPaid)}</p>
              <p className="text-sm text-muted-foreground">Total Paid</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{formatCurrency(potentialPayoutPerWinner)}</p>
              <p className="text-sm text-muted-foreground">Potential Payout</p>
            </div>
          </div>
        </Card>
      )}

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{statistics.totalMembers}</p>
            </div>
            <Users className="w-8 h-8 text-accent" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Members</p>
              <p className="text-2xl font-bold">{activeMembers}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Eligible Winners</p>
              <p className="text-2xl font-bold">{eligibleMembers}</p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Next Payout</p>
              <p className="text-lg font-bold">{nextPayoutDate}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
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
            <span className="text-sm font-medium">{formatCurrency(totalRevenue)} / {formatCurrency(statistics.payoutThreshold)}</span>
          </div>
          <Progress value={Math.min((totalRevenue / statistics.payoutThreshold) * 100, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {totalRevenue >= statistics.payoutThreshold 
              ? 'Payout threshold reached!' 
              : `Need ${formatCurrency(statistics.payoutThreshold - totalRevenue)} more for next payout`
            }
          </p>
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
          Queue Members ({filteredQueue.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Position</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">user_id</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Subscription</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">eligibility</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Last Payment</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Total Paid</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Payout Status</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Joined Queue</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {searchTerm ? 'No members found matching your search.' : 'No queue members found.'}
                  </td>
                </tr>
              ) : (
                filteredQueue.map((member) => {
                  const isCurrentUser = member.id && user?.id && member.id.toString() === user.id;
                  const isWinner = member.position <= winnersCount;
                  
                  return (
                    <tr 
                      key={member.id} 
                      className={`border-b border-border hover:bg-accent/5 transition-colors ${
                        isCurrentUser ? 'bg-accent/10' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {getRankBadge(member.position)}
                          {isWinner && (
                            <Award className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          {isCurrentUser ? (
                            <>
                              <p className="font-medium text-accent">{member.id} (You)</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-muted-foreground">{member.id}</p>
                              <p className="text-xs text-muted-foreground">{member.email ?? 'Privacy Protected'}</p>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{member.continuousTenure} months</p>
                          <div className="flex items-center gap-1 mt-1">
                            {member.status === 'active' ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span className="text-xs">
                              {member.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {(() => {
                          // Prefer explicit eligibility flag from API, otherwise fallback to active status
                          const isEligible = (member as any).eligible ?? (member.status === 'active');
                          return getEligibilityBadge(!!isEligible, member.status === 'active');
                        })()}
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm">{formatDate(member.lastPaymentDate)}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium">{formatCurrency(member.totalPaid)}</p>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-yellow-600">Pending</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm">{formatDate(member.joinDate)}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Queue Summary */}
        {queueData.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total in Queue</p>
                <p className="font-semibold">{queueData.length} members</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Subscriptions</p>
                <p className="font-semibold">{activeMembers} members</p>
              </div>
              <div>
                <p className="text-muted-foreground">Eligible for Payout</p>
                <p className="font-semibold">{eligibleMembers} members</p>
              </div>
              <div>
                <p className="text-muted-foreground">Received Payouts</p>
                <p className="font-semibold">{statistics.receivedPayouts} members</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Queue;
