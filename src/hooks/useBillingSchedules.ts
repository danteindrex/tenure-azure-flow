import { useQuery } from '@tanstack/react-query';

export interface BillingSchedule {
  billingCycle: 'MONTHLY' | 'YEARLY';
  nextBillingDate: string;
  amount: number;
  daysUntil: number;
}

interface BillingSchedulesResponse {
  success: boolean;
  data: {
    schedules: BillingSchedule[];
  };
}

export const useBillingSchedules = (userId: string | undefined) => {
  return useQuery<BillingSchedulesResponse>({
    queryKey: ['billing-schedules', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const baseUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_SERVICE_URL
        || process.env.NEXT_PUBLIC_API_URL
        || 'http://localhost:3001';

      const response = await fetch(
        `${baseUrl}/api/billing/schedules/${userId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch billing schedules');
      }

      return response.json();
    },
    enabled: !!userId, // Only run query if userId exists
    staleTime: 60 * 60 * 1000, // 1 hour (billing data updates less frequently)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};
