export interface Subscription {
  subscriptionid: number;
  memberid: number;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'unpaid';
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  trial_end?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  paymentid: number;
  memberid: number;
  subscriptionid?: number;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  stripe_charge_id?: string;
  amount: number;
  currency: string;
  payment_type: 'initial' | 'recurring' | 'one_time';
  payment_date: Date;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'canceled';
  is_first_payment: boolean;
  failure_reason?: string;
  receipt_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Queue {
  queueid: number;
  memberid: number;
  queue_position: number;
  joined_at: Date;
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

export interface Member {
  id: number;
  auth_user_id?: string;
  name: string;
  email: string;
  phone?: string;
  join_date: Date;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
  tenure?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCheckoutSessionRequest {
  memberId: number;
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
