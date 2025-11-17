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

      // Use relative URL to call Next.js API route (works in all environments)
      const response = await fetch(
        `/api/billing/schedules/${userId}`,
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
