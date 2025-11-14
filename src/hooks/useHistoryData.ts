import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HistoryService, {
  UserActivityHistory,
  TransactionHistory,
  QueueHistory,
  MilestoneHistory,
  HistorySummary
} from '@/lib/history';

interface CombinedHistoryResponse {
  activities: UserActivityHistory[];
  transactions: TransactionHistory[];
  queue_changes: QueueHistory[];
  milestones: MilestoneHistory[];
}

export const useHistoryData = (userId: string | undefined, limit: number = 100) => {
  const queryClient = useQueryClient();
  const historyService = new HistoryService();

  const query = useQuery<CombinedHistoryResponse>({
    queryKey: ['history', userId, limit],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return historyService.getCombinedHistory(userId, { limit });
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Manual refresh function
  const refreshHistory = () => {
    return queryClient.invalidateQueries({ queryKey: ['history', userId] });
  };

  return {
    ...query,
    refreshHistory,
  };
};

export const useHistorySummary = (userId: string | undefined) => {
  const historyService = new HistoryService();

  return useQuery<HistorySummary>({
    queryKey: ['history-summary', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return historyService.getHistorySummary(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useSearchHistory = () => {
  const historyService = new HistoryService();

  return useMutation({
    mutationFn: async ({ userId, searchTerm, limit = 50 }: { userId: string; searchTerm: string; limit?: number }) => {
      return historyService.searchHistory(userId, searchTerm, { limit });
    },
  });
};
