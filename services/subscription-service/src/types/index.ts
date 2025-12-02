export interface Subscription {
  id: string;
  user_id: string;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string;
  // Subscription status - references subscription_statuses lookup table
  // 1 = Active, 2 = Trialing, 3 = Past Due, 4 = Canceled, 5 = Incomplete, 6 = Unpaid
  subscription_status_id: number;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  trial_end?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id?: string;
  payment_method_id?: string;
  provider: string;
  provider_payment_id?: string;
  provider_invoice_id?: string;
  provider_charge_id?: string;
  amount: number;
  currency: string;
  payment_type: 'initial' | 'recurring' | 'one_time';
  payment_date: Date;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'canceled';
  is_first_payment: boolean;
  failure_reason?: string;
  receipt_url?: string;
  metadata?: object;
  created_at: Date;
  updated_at: Date;
}

export interface Queue {
  id: string;
  user_id: string;
  queue_position: number;
  joined_queue_at: Date;
  is_eligible: boolean;
  subscription_active: boolean;
  total_months_subscribed: number;
  last_payment_date?: Date;
  lifetime_payment_total: number;
  has_received_payout: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  // User status - references user_funnel_statuses lookup table
  // 1 = Pending, 2 = Onboarded
  user_status_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCheckoutSessionRequest {
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionResponse {
  subscription: Subscription;
  customer: {
    id: string;
    email: string;
  };
}
