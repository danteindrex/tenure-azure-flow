import { useState, useEffect } from "react";
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
  CheckCircle,
  Loader2,
  DollarSign,
  RefreshCw
} from "lucide-react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { toast } from "sonner";

interface QueueMember {
  id: number;
  memberid: number;
  queue_position: number;
  joined_at: string;
  is_eligible: boolean;
  subscription_active: boolean;
  total_months_subscribed: number;
  last_payment_date: string;
  lifetime_payment_total: number;
  has_received_payout: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined member data
  member?: {
    id: number;
    name: string;
    email: string;
    status: string;
    join_date: string;
  };
  member_name?: string;
  member_email?: string;
  member_status?: string;
  member_join_date?: string;
}

const Queue = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [queueData, setQueueData] = useState<QueueMember[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = useSupabaseClient();
  const user = useUser();

  // Load queue data from database
  const loadQueueData = async () => {
    try {
      setLoading(true);
      
      // Fetch queue data first
      const { data: queueMembers, error: queueError } = await supabase
        .from('queue')
        .select('*')
        .order('queue_position', { ascending: true });

      if (queueError) {
        console.error('Error fetching queue data:', queueError);
        toast.error('Failed to load queue data');
        return;
      }

      // Fetch member data separately and join manually
      const memberIds = queueMembers?.map(q => q.memberid) || [];
      const { data: members, error: memberError } = await supabase
        .from('member')
        .select('id, name, email, status, join_date')
        .in('id', memberIds);

      if (memberError) {
        console.error('Error fetching member data:', memberError);
      }

      // Transform data to include member details
      const transformedData = queueMembers?.map(item => {
        const member = members?.find(m => m.id === item.memberid);
        return {
          ...item,
          member: member || null,
          member_name: member?.name || `Member ${item.memberid}`,
          member_email: member?.email || '',
          member_status: member?.status || 'Unknown',
          member_join_date: member?.join_date || ''
        };
      }) || [];

      setQueueData(transformedData);

      // Calculate total revenue from payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payment')
        .select('amount')
        .eq('status', 'Completed');

      if (!paymentsError && payments) {
        const total = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        setTotalRevenue(total);
      }

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
    loadQueueData();
  }, [supabase]);

  // Find current user in queue
  const currentUserMember = queueData.find(member => 
    member.member?.id && user?.id && member.member.id.toString() === user.id
  );

  // Calculate statistics from real data
  const activeMembers = queueData.filter(member => member.subscription_active).length;
  const eligibleMembers = queueData.filter(member => member.is_eligible).length;
  const nextPayoutDate = "March 15, 2025"; // This could be calculated based on business rules
  const winnersCount = Math.min(2, eligibleMembers); // Top 2 eligible members
  const potentialPayoutPerWinner = totalRevenue > 0 ? totalRevenue / Math.max(winnersCount, 1) : 0;

  // Filter queue data based on search
  const filteredQueue = queueData.filter(member =>
    member.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.member_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.memberid.toString().includes(searchTerm)
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
            {getRankBadge(currentUserMember.queue_position)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">#{currentUserMember.queue_position}</p>
              <p className="text-sm text-muted-foreground">Queue Position</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{currentUserMember.total_months_subscribed}</p>
              <p className="text-sm text-muted-foreground">Months Subscribed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(currentUserMember.lifetime_payment_total)}</p>
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
              <p className="text-2xl font-bold">{queueData.length}</p>
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
            <span className="text-sm font-medium">{formatCurrency(totalRevenue)} / $500,000</span>
          </div>
          <Progress value={Math.min((totalRevenue / 500000) * 100, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {totalRevenue >= 500000 
              ? 'Payout threshold reached!' 
              : `Need ${formatCurrency(500000 - totalRevenue)} more for next payout`
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
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Member</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Subscription</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Eligibility</th>
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
                  const isCurrentUser = member.member?.id && user?.id && member.member.id.toString() === user.id;
                  const isWinner = member.queue_position <= winnersCount && member.is_eligible;
                  
                  return (
                    <tr 
                      key={member.id} 
                      className={`border-b border-border hover:bg-accent/5 transition-colors ${
                        isCurrentUser ? 'bg-accent/10' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {getRankBadge(member.queue_position)}
                          {isWinner && (
                            <Award className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{member.member_name}</p>
                          <p className="text-xs text-muted-foreground">ID: {member.memberid}</p>
                          <p className="text-xs text-muted-foreground">{member.member_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{member.total_months_subscribed} months</p>
                          <div className="flex items-center gap-1 mt-1">
                            {member.subscription_active ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                            <span className="text-xs">
                              {member.subscription_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {getEligibilityBadge(member.is_eligible, member.subscription_active)}
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm">{formatDate(member.last_payment_date)}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium">{formatCurrency(member.lifetime_payment_total)}</p>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          {member.has_received_payout ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-green-600">Received</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs text-yellow-600">Pending</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm">{formatDate(member.joined_at)}</p>
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
                <p className="font-semibold">{queueData.filter(m => m.has_received_payout).length} members</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Queue;
