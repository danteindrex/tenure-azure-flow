const SUBSCRIPTION_SERVICE_URL = process.env.NEXT_PUBLIC_SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001';

export interface CreateCheckoutSessionRequest {
  memberId: number;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
  };
}

export interface Subscription {
  subscriptionid: number;
  memberid: number;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  paymentid: number;
  memberid: number;
  amount: number;
  currency: string;
  payment_type: 'initial' | 'recurring' | 'one_time';
  payment_date: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'canceled';
  is_first_payment: boolean;
  receipt_url?: string;
}

export class SubscriptionAPI {
  /**
   * Create a Stripe Checkout session
   */
  static async createCheckoutSession(
    data: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    const response = await fetch(`${SUBSCRIPTION_SERVICE_URL}/api/subscriptions/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    return response.json();
  }

  /**
   * Get subscription details for a member
   */
  static async getSubscription(memberId: number) {
    const response = await fetch(`${SUBSCRIPTION_SERVICE_URL}/api/subscriptions/${memberId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get subscription');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(memberId: number, immediately: boolean = false) {
    const response = await fetch(`${SUBSCRIPTION_SERVICE_URL}/api/subscriptions/${memberId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ immediately }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel subscription');
    }

    return response.json();
  }

  /**
   * Reactivate subscription
   */
  static async reactivateSubscription(memberId: number) {
    const response = await fetch(`${SUBSCRIPTION_SERVICE_URL}/api/subscriptions/${memberId}/reactivate`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reactivate subscription');
    }

    return response.json();
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(memberId: number): Promise<Payment[]> {
    const response = await fetch(`${SUBSCRIPTION_SERVICE_URL}/api/subscriptions/${memberId}/payments`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get payment history');
    }

    const result = await response.json();
    return result.data;
  }
}
