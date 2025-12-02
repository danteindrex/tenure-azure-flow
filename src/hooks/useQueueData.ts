import { useQuery, useQueryClient } from '@tanstack/react-query';

interface QueueMember {
  user_id: string;
  queue_position: number;
  id?: number;
  member_status?: string;
  is_eligible?: boolean;
}

interface QueueResponse {
  success: boolean;
  data: {
    queue: QueueMember[];
  };
}

export const useQueueData = (currentPosition?: number) => {
  const queryClient = useQueryClient();

  const query = useQuery<QueueResponse>({
    queryKey: ['queue', currentPosition],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentPosition) {
        params.append('currentPosition', currentPosition.toString());
      }
      
      const queryString = params.toString();
      const url = `/api/queue${queryString ? `?${queryString}` : ''}`;
      
      try {
        const response = await fetch(url, { credentials: 'include' });
        if (response.ok) {
          return response.json();
        }
      } catch {}

      // If local API fails, throw error (no fallback to external service from client)
      throw new Error('Failed to fetch queue data');
    },
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Manual refresh function
  const refreshQueue = () => {
    return queryClient.invalidateQueries({ queryKey: ['queue', currentPosition] });
  };

  return {
    ...query,
    refreshQueue,
  };
};
