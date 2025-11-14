import { useQuery, useQueryClient } from '@tanstack/react-query';

interface QueueMember {
  user_id: string;
  queue_position: number;
  id?: number;
}

interface QueueResponse {
  success: boolean;
  data: {
    queue: QueueMember[];
  };
}

export const useQueueData = () => {
  const queryClient = useQueryClient();

  const query = useQuery<QueueResponse>({
    queryKey: ['queue'],
    queryFn: async () => {
      const response = await fetch('/api/queue', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }
      return response.json();
    },
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Manual refresh function
  const refreshQueue = () => {
    return queryClient.invalidateQueries({ queryKey: ['queue'] });
  };

  return {
    ...query,
    refreshQueue,
  };
};
