import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Calendar,
  DollarSign,
  Award,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Users
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "sonner";

interface NewsPost {
  id: number;
  title: string;
  content: any; // JSONB content
  publish_date: string;
  status: 'Draft' | 'Published' | 'Scheduled' | 'Archived';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  created_at: string;
  updated_at: string;
}

interface FundStats {
  totalRevenue: number;
  totalMembers: number;
  potentialWinners: number;
  nextPayoutDate: string;
}

const NewsFeed = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [fundStats, setFundStats] = useState<FundStats>({
    totalRevenue: 0,
    totalMembers: 0,
    potentialWinners: 0,
    nextPayoutDate: 'TBD'
  });

  const supabase = useSupabaseClient();
  const { data: session } = useSession();
  const user = session?.user;

  // Load news feed data
  const loadNewsFeedData = async () => {
    try {
      setLoading(true);

      // Fetch published news posts
      const { data: posts, error: postsError } = await supabase
        .from('newsfeedpost')
        .select('*')
        .eq('status', 'Published')
        .order('publish_date', { ascending: false })
        .limit(10);

      if (postsError) {
        console.error('Error fetching news posts:', postsError);
      } else {
        setNewsPosts(posts || []);
      }

      // Calculate fund statistics using normalized tables
      const { data: payments, error: paymentsError } = await supabase
        .from('user_payments')
        .select('amount')
        .eq('status', 'completed');

      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('id')
        .eq('status', 'Active');

      if (!paymentsError && !membersError) {
        const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const totalMembers = members?.length || 0;
        const potentialWinners = Math.min(Math.floor(totalRevenue / 100000), totalMembers); // BR-4: $100K per winner

        setFundStats({
          totalRevenue,
          totalMembers,
          potentialWinners,
          nextPayoutDate: 'March 15, 2025' // This could be calculated based on business rules
        });
      }

    } catch (error) {
      console.error('Error loading news feed data:', error);
      toast.error('Failed to load news feed');
    } finally {
      setLoading(false);
    }
  };

  // Refresh news feed
  const refreshNewsFeed = async () => {
    setRefreshing(true);
    await loadNewsFeedData();
    setRefreshing(false);
    toast.success('News feed refreshed');
  };

  useEffect(() => {
    loadNewsFeedData();
  }, [supabase]);

  // Get priority badge color
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'High':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">High</Badge>;
      case 'Normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'Low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'High':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'Normal':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'Low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Render post content (handle JSONB)
  const renderPostContent = (content: any) => {
    if (typeof content === 'string') {
      return content;
    }
    if (content && typeof content === 'object') {
      return content.text || content.content || JSON.stringify(content);
    }
    return 'No content available';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">News & Updates</h1>
            <p className="text-muted-foreground">Latest announcements and fund progress</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">News & Updates</h1>
          <p className="text-muted-foreground">Latest announcements and fund progress</p>
        </div>
        <Button 
          onClick={refreshNewsFeed} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Fund Statistics Banner */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Fund Progress Update</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Collected</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(fundStats.totalRevenue)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-muted-foreground">Potential Winners</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{fundStats.potentialWinners}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Active Members</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{fundStats.totalMembers}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Next Payout</span>
            </div>
            <p className="text-lg font-bold text-purple-600">{fundStats.nextPayoutDate}</p>
          </div>
        </div>
        
        {fundStats.potentialWinners > 0 && (
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              🎉 <strong>{formatCurrency(fundStats.totalRevenue)} collected!</strong> Currently <strong>{fundStats.potentialWinners} winner{fundStats.potentialWinners > 1 ? 's' : ''}</strong> eligible for payout.
            </p>
          </div>
        )}
      </Card>

      {/* News Posts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-accent" />
          Latest Announcements
        </h2>
        
        {newsPosts.length === 0 ? (
          <Card className="p-8 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No announcements yet</h3>
            <p className="text-muted-foreground">Check back later for updates from the administration team.</p>
          </Card>
        ) : (
          newsPosts.map((post) => (
            <Card key={post.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getPriorityIcon(post.priority)}
                  <div>
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Published {formatDate(post.publish_date)}
                    </p>
                  </div>
                </div>
                {getPriorityBadge(post.priority)}
              </div>
              
              <div className="prose prose-sm max-w-none text-muted-foreground">
                {renderPostContent(post.content)}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NewsFeed;