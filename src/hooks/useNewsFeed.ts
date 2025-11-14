import { useQuery } from '@tanstack/react-query';

export interface NewsPost {
  id: number;
  title: string;
  content: any;
  publish_date: string;
  status: 'Draft' | 'Published' | 'Scheduled' | 'Archived';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  created_at: string;
  updated_at: string;
}

export interface FundStats {
  totalRevenue: number;
  totalMembers: number;
  potentialWinners: number;
  nextPayoutDate: string;
}

interface NewsFeedResponse {
  posts: NewsPost[];
}

export const useNewsFeed = () => {
  return useQuery<NewsFeedResponse>({
    queryKey: ['newsfeed'],
    queryFn: async () => {
      const response = await fetch('/api/newsfeed/posts');

      if (!response.ok) {
        throw new Error('Failed to fetch news posts');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (news updates frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Note: Fund statistics are now handled by useStatistics hook
// which was already created and provides totalRevenue, totalMembers, etc.
