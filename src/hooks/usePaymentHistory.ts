import { useQuery } from '@tanstack/react-query';

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id?: string;
  provider_payment_id?: string;
  provider_invoice_id?: string;
  provider_charge_id?: string;
  amount: string;
  currency: string;
  payment_type: string;
  payment_date: string;
  status: string;
  is_first_payment: boolean;
  failure_reason?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentHistoryResponse {
  success: boolean;
  data: PaymentTransaction[];
}

export const usePaymentHistory = (userId: string | undefined) => {
  return useQuery<PaymentHistoryResponse>({
    queryKey: ['payment-history', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Use relative URL to call Next.js API route (works in all environments)
      const response = await fetch(
        `/api/payments/history/${userId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      return response.json();
    },
    enabled: !!userId, // Only run query if userId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
