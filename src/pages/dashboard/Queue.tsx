import { useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
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
import { QueueMember } from "@/lib/types";
import { useQueueData } from "@/hooks/useQueueData";
import { useStatistics } from "@/hooks/useStatistics";

const Queue = () => {
  // Removed search functionality as per requirement

  const { data: session } = useSession();
  const user = session?.user;

  // First, fetch all queue data to find current user's position
  const { data: allQueueData, isLoading: isLoadingAllQueue } = useQueueData();

  // Find current user's position from all queue data
  const currentUserPosition = useMemo(() => {
    if (!user?.id || !allQueueData?.data?.queue) return null;
    const userInQueue = allQueueData.data.queue.find((q: any) => q.user_id === user.id);
    return userInQueue?.queue_position || null;
  }, [allQueueData, user?.id]);

  // Then fetch nearest 5 users based on current position
  const { data: queueResponse, isLoading: isLoadingQueue, isFetching: isFetchingQueue, refreshQueue } = useQueueData(currentUserPosition || undefined);
  const { data: statsResponse, isLoading: isLoadingStats } = useStatistics();

  // Compute derived data from React Query results using useMemo
  const { queueData, statistics, currentUserMember } = useMemo(() => {
    const rawQueue = queueResponse?.data?.queue || [];
    const allQueue = allQueueData?.data?.queue || [];
    const rawStats = statsResponse?.data || {};

    // Map view fields to component expected fields - mask user IDs like dashboard
    const mappedQueue = rawQueue.map((member: any) => ({
      id: member.user_id,
      position: member.queue_position,
      name: member.user_id,
      maskedId: member.user_id ? `${member.user_id.substring(0, 6)}xxxxx` : 'N/A', // Mask user ID
      email: '',
      continuousTenure: 0,
      totalPaid: 0,
      status: 'active',
      eligible: true,
      lastPaymentDate: null,
      joinDate: null,
      hasReceivedPayout: false,
      nextPaymentDue: null
    }));

    const stats = {
      totalMembers: (rawStats as any).totalMembers || allQueue.length || 0,
      activeMembers: (rawStats as any).activeMembers || allQueue.length || 0,
      eligibleMembers: (rawStats as any).eligibleMembers || allQueue.filter((m: any) => m.eligible).length || 0,
      totalRevenue: (rawStats as any).totalRevenue || 0,
      potentialWinners: (rawStats as any).potentialWinners || allQueue.filter((m: any) => m.eligible).length || 0,
      payoutThreshold: 100000, // BR-3: $100K payout threshold
      receivedPayouts: (rawStats as any).receivedPayouts || 0
    };

    const currentUser = mappedQueue.find((member: QueueMember) =>
      member.id && user?.id && member.id.toString() === user.id
    );

    return {
      queueData: mappedQueue,
      statistics: stats,
      currentUserMember: currentUser
    };
  }, [queueResponse, allQueueData, statsResponse, user?.id]);

  // Manual refresh function
  const handleRefresh = async () => {
    toast.info('Refreshing queue data...');
    await refreshQueue();
    toast.success('Queue data refreshed');
  };

  const { activeMembers, eligibleMembers, totalRevenue, potentialWinners } = statistics;
  const nextPayoutDate = "March 15, 2025"; // This could be calculated based on business rules
  const winnersCount = potentialWinners;
  const potentialPayoutPerWinner = totalRevenue > 0 ? totalRevenue / Math.max(winnersCount, 1) : 0;

  // No filtering - show all queue data as per requirement

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

  if (isLoadingQueue || isLoadingStats || isLoadingAllQueue) {
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
          onClick={handleRefresh}
          disabled={isFetchingQueue}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetchingQueue ? 'animate-spin' : ''}`} />
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

      {/* Queue Table - Privacy Mode (Search removed as per requirement) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Queue Members ({queueData.length})
        </h3>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Position</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User ID</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {queueData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    No queue members found.
                  </td>
                </tr>
              ) : (
                queueData.map((member) => {
                  const isCurrentUser = member.id && user?.id && member.id.toString() === user.id;
                  const isWinner = member.position <= winnersCount;

                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-border hover:bg-accent/5 transition-colors ${
                        isCurrentUser ? 'bg-accent/10 border-l-4 border-l-accent' : ''
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
                            <p className="font-medium text-accent">You</p>
                          ) : (
                            <p className="font-medium text-muted-foreground text-sm">{(member as any).maskedId || 'N/A'}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Queue;
