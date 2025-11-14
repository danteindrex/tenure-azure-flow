import { useQuery } from '@tanstack/react-query';

export interface AnalyticsOverview {
  investedTotal: number;
  totalEarned: number;
  netPosition: number;
  tenureMonths: number;
  queuePosition: number;
  potentialPayout: number;
  queueCount: number;
  nextPayoutDate: string;
}

export interface MonthlyData {
  month: string;
  invested: number;
  earned: number;
  net: number;
}

interface AnalyticsResponse {
  overview: AnalyticsOverview;
  monthly: MonthlyData[];
}

export const useAnalytics = (userId: string | undefined, rangeMonths: number = 6) => {
  return useQuery<AnalyticsResponse>({
    queryKey: ['analytics', userId, rangeMonths],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await fetch(`/api/analytics/overview?rangeMonths=${rangeMonths}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      const { overview, monthly } = data;

      // Add net calculation to monthly data
      const monthlyWithNet = monthly.map((m: any) => ({
        ...m,
        net: m.earned - m.invested
      }));

      return {
        overview,
        monthly: monthlyWithNet
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes (analytics data changes less frequently)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
