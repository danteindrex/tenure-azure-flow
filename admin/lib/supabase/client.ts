import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser/frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          email_verified: boolean;
          status: string;
          created_at: string;
          updated_at: string;
          name: string | null;
          image: string | null;
          two_factor_enabled: boolean;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          email_verified?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          name?: string | null;
          image?: string | null;
          two_factor_enabled?: boolean;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string;
          email_verified?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          name?: string | null;
          image?: string | null;
          two_factor_enabled?: boolean;
        };
      };
      user_payments: {
        Row: {
          id: string;
          user_id: string | null;
          subscription_id: string | null;
          payment_method_id: string | null;
          provider: string;
          provider_payment_id: string | null;
          provider_invoice_id: string | null;
          provider_charge_id: string | null;
          amount: number;
          currency: string;
          payment_type: string;
          payment_date: string;
          status: string;
          is_first_payment: boolean;
          failure_reason: string | null;
          receipt_url: string | null;
          metadata: any | null;
          created_at: string;
          updated_at: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          provider: string;
          provider_subscription_id: string;
          provider_customer_id: string;
          status: string;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      payout_management: {
        Row: {
          id: string;
          payout_id: string;
          user_id: string;
          queue_position: number;
          amount: number;
          currency: string;
          status: string;
          eligibility_check: any | null;
          approval_workflow: any | null;
          scheduled_date: string | null;
          payment_method: string;
          bank_details: any | null;
          tax_withholding: any | null;
          processing: any | null;
          receipt_url: string | null;
          internal_notes: any | null;
          audit_trail: any | null;
          created_at: string;
          updated_at: string;
        };
      };
      membership_queue: {
        Row: {
          id: string;
          user_id: string | null;
          queue_position: number | null;
          joined_queue_at: string;
          is_eligible: boolean;
          priority_score: number;
          subscription_active: boolean;
          total_months_subscribed: number;
          last_payment_date: string | null;
          lifetime_payment_total: number;
          has_received_payout: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string | null;
          address_type: string;
          street_address: string | null;
          address_line_2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country_code: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};