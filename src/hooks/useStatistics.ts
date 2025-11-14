import { useQuery } from '@tanstack/react-query';

interface StatisticsResponse {
  success: boolean;
  data: {
    totalRevenue: number;
    totalMembers?: number;
    activeMembers?: number;
  };
}

export const useStatistics = () => {
  return useQuery<StatisticsResponse>({
    queryKey: ['statistics'],
    queryFn: async () => {
      const response = await fetch('/api/queue/statistics', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (more dynamic data)
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};
