import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  Award,
  Clock,
  Activity
} from "lucide-react";

const Analytics = () => {
  const [timeRange, setTimeRange] = useState("6months");

  const analyticsData = {
    overview: {
      totalInvested: 375.00,
      totalEarned: 5.00,
      netPosition: -370.00,
      tenureMonths: 15,
      queuePosition: 3,
      potentialPayout: 125000.00
    },
    monthlyData: [
      { month: "Jul 2024", invested: 25, earned: 0, net: -25 },
      { month: "Aug 2024", invested: 25, earned: 0, net: -25 },
      { month: "Sep 2024", invested: 25, earned: 0, net: -25 },
      { month: "Oct 2024", invested: 25, earned: 0, net: -25 },
      { month: "Nov 2024", invested: 25, earned: 0, net: -25 },
      { month: "Dec 2024", invested: 25, earned: 0, net: -25 },
      { month: "Jan 2025", invested: 25, earned: 5, net: -20 }
    ],
    performance: {
      paymentConsistency: 100,
      queueProgress: 75,
      fundGrowth: 15.2,
      riskLevel: "Low"
    },
    projections: {
      nextPayout: "March 2025",
      estimatedPayout: 125000.00,
      confidence: 85
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low": return "text-green-500";
      case "Medium": return "text-yellow-500";
      case "High": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your performance and investment insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Invested</p>
              <p className="text-2xl font-bold">${analyticsData.overview.totalInvested.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold text-green-500">${analyticsData.overview.totalEarned.toFixed(2)}</p>
            </div>
            <Award className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Position</p>
              <p className="text-2xl font-bold text-red-500">${analyticsData.overview.netPosition.toFixed(2)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Queue Position</p>
              <p className="text-2xl font-bold">#{analyticsData.overview.queuePosition}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Performance Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment Consistency</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{analyticsData.performance.paymentConsistency}%</span>
                {getTrendIcon(analyticsData.performance.paymentConsistency - 80)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${analyticsData.performance.paymentConsistency}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Queue Progress</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{analyticsData.performance.queueProgress}%</span>
                {getTrendIcon(analyticsData.performance.queueProgress - 50)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${analyticsData.performance.queueProgress}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fund Growth Rate</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{analyticsData.performance.fundGrowth}%</span>
                {getTrendIcon(analyticsData.performance.fundGrowth)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <span className={`font-semibold ${getRiskColor(analyticsData.performance.riskLevel)}`}>
                {analyticsData.performance.riskLevel}
              </span>
            </div>
          </div>
        </Card>

        {/* Projections */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Projections
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-accent/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Next Payout Date</span>
                <Clock className="w-4 h-4 text-accent" />
              </div>
              <p className="text-2xl font-bold">{analyticsData.projections.nextPayout}</p>
            </div>
            
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Estimated Payout</span>
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">${analyticsData.projections.estimatedPayout.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Confidence Level</span>
                <Target className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{analyticsData.projections.confidence}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Monthly Breakdown
        </h3>
        <div className="space-y-3">
          {analyticsData.monthlyData.map((month, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium">{month.month}</div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="font-semibold text-red-500">-${month.invested}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Earned</p>
                    <p className="font-semibold text-green-500">+${month.earned}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className={`font-semibold ${month.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {month.net >= 0 ? '+' : ''}${month.net}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(month.earned)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          Insights & Recommendations
        </h3>
        <div className="space-y-3">
          <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Excellent Payment Consistency</p>
                <p className="text-sm text-green-700 dark:text-green-300">You've maintained 100% payment consistency. Keep it up!</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Strong Queue Position</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">You're in the top 3 positions. A payout is likely in the next cycle.</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Consider Referrals</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Refer new members to earn bonus rewards and improve your position.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
