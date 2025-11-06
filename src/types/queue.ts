/**
 * Queue Types - View-Based Queue System
 * 
 * These types represent the data structure returned by the active_member_queue_view
 * database view. The view dynamically calculates queue positions from existing
 * user, subscription, and payment data.
 */

export interface ActiveMemberQueue {
  // User identification
  user_id: string;
  email: string;
  user_created_at: Date;
  
  // Profile information
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  full_name: string | null;
  
  // Subscription details
  subscription_id: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  provider_subscription_id: string | null;
  
  // Payment statistics
  tenure_start_date: Date;  // First successful payment date
  last_payment_date: Date;
  total_successful_payments: number;
  lifetime_payment_total: number;
  
  // Payout status
  has_received_payout: boolean;
  
  // Calculated queue position
  queue_position: number;
  
  // Eligibility flags
  is_eligible: boolean;
  meets_time_requirement: boolean;
  
  // Metadata
  calculated_at: Date;
}

export interface QueueStatistics {
  total_members: number;
  eligible_members: number;
  members_meeting_time_req: number;
  total_revenue: number;
  oldest_member_date: Date | null;
  newest_member_date: Date | null;
  potential_winners: number;
  payout_threshold: number;
}

export interface QueueMemberSummary {
  user_id: string;
  queue_position: number;
  tenure_start_date: Date;
  total_payments: number;
  lifetime_total: number;
  is_eligible: boolean;
}

// Legacy type for backward compatibility (deprecated)
/** @deprecated Use ActiveMemberQueue instead */
export interface Queue {
  id: string;
  user_id: string;
  queue_position: number;
  joined_queue_at: Date;
  is_eligible: boolean;
  subscription_active: boolean;
  total_months_subscribed: number;
  last_payment_date: Date | null;
  lifetime_payment_total: number;
  has_received_payout: boolean;
  created_at: Date;
  updated_at: Date;
}
