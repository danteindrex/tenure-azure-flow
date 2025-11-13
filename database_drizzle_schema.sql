[dotenv@17.2.3] injecting env (32) from .env.local -- tip: ⚙️  specify custom .env file path with { path: '/custom/path/.env' }
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);

CREATE TABLE "admin" (
	"id" serial PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" varchar NOT NULL,
	"reset_password_token" varchar,
	"reset_password_expiration" timestamp with time zone,
	"salt" varchar,
	"hash" varchar,
	"login_attempts" numeric DEFAULT '0',
	"lock_until" timestamp with time zone,
	"role" text DEFAULT 'Manager' NOT NULL
);

CREATE TABLE "admin_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" text DEFAULT (gen_random_uuid())::text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"related_entity" jsonb,
	"trigger_info" jsonb,
	"assigned_to" integer,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp with time zone,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"notifications_sent" jsonb DEFAULT '[]'::jsonb,
	"escalation" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "admin_sessions" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" text NOT NULL,
	"payment_id" uuid,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'needs_response' NOT NULL,
	"reason" text NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'USD',
	"stripe_dispute_id" text,
	"customer_message" text,
	"respond_by" timestamp with time zone NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb,
	"assigned_to" integer,
	"internal_notes" jsonb DEFAULT '[]'::jsonb,
	"resolution" jsonb,
	"impact" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "kyc_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verification_method" text,
	"document_type" text,
	"document_number" text,
	"document_front_url" text,
	"document_back_url" text,
	"selfie_url" text,
	"verification_provider" text,
	"provider_verification_id" text,
	"verification_data" jsonb DEFAULT '{}'::jsonb,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"rejection_reason" text,
	"reviewer_id" integer,
	"reviewer_notes" text,
	"risk_score" integer,
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"geolocation" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "membership_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"queue_position" integer,
	"joined_queue_at" timestamp with time zone DEFAULT now(),
	"is_eligible" boolean DEFAULT true,
	"priority_score" integer DEFAULT 0,
	"subscription_active" boolean DEFAULT false,
	"total_months_subscribed" integer DEFAULT 0,
	"last_payment_date" timestamp with time zone,
	"lifetime_payment_total" numeric(10, 2) DEFAULT '0.00',
	"has_received_payout" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "membership_queue_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);

CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"webauthn_user_id" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"transports" text,
	"created_at" timestamp DEFAULT now(),
	"credentialID" text
);

CREATE TABLE "payload_locked_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"global_slug" varchar,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payload_locked_documents_rels" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer,
	"parent_id" integer NOT NULL,
	"path" varchar NOT NULL,
	"admin_id" integer,
	"users_id" integer
);

CREATE TABLE "payload_migrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"batch" numeric,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payload_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payload_preferences_rels" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer,
	"parent_id" integer NOT NULL,
	"path" varchar NOT NULL,
	"admin_id" integer
);

CREATE TABLE "payout_management" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_id" uuid,
	"queue_position" integer NOT NULL,
	"amount" numeric(12, 2) DEFAULT '100000.00' NOT NULL,
	"currency" text DEFAULT 'USD',
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"eligibility_check" jsonb DEFAULT '{}'::jsonb,
	"approval_workflow" jsonb DEFAULT '[]'::jsonb,
	"scheduled_date" timestamp with time zone,
	"payment_method" text DEFAULT 'ach' NOT NULL,
	"bank_details" jsonb,
	"tax_withholding" jsonb,
	"processing" jsonb,
	"receipt_url" text,
	"internal_notes" jsonb DEFAULT '[]'::jsonb,
	"audit_trail" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payout_management_payout_id_unique" UNIQUE("payout_id")
);

CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE "system_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"admin_id" integer,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"action" varchar(50) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"success" boolean NOT NULL,
	"error_message" text,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "tax_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" text DEFAULT (gen_random_uuid())::text NOT NULL,
	"user_id" uuid NOT NULL,
	"form_type" text NOT NULL,
	"tax_year" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"recipient_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payer_info" jsonb DEFAULT '{}'::jsonb,
	"income_details" jsonb DEFAULT '{}'::jsonb,
	"w9_data" jsonb DEFAULT '{}'::jsonb,
	"generation" jsonb DEFAULT '{}'::jsonb,
	"delivery" jsonb DEFAULT '{}'::jsonb,
	"irs_filing" jsonb DEFAULT '{}'::jsonb,
	"corrections" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "transaction_monitoring" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"risk_level" text DEFAULT 'low' NOT NULL,
	"risk_score" integer,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb,
	"aml_check" jsonb DEFAULT '{}'::jsonb,
	"velocity_check" jsonb DEFAULT '{}'::jsonb,
	"device_fingerprint" jsonb DEFAULT '{}'::jsonb,
	"geographic_data" jsonb DEFAULT '{}'::jsonb,
	"reviewer_id" integer,
	"reviewer_notes" text,
	"reviewed_at" timestamp with time zone,
	"action_taken" text,
	"sar_filed" boolean DEFAULT false,
	"sar_filed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" uuid NOT NULL
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"status" text DEFAULT 'Pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text,
	"image" text,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"address_type" varchar(20) DEFAULT 'primary',
	"street_address" varchar(255) NOT NULL,
	"address_line_2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country_code" varchar(2) DEFAULT 'US',
	"is_primary" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"agreement_type" varchar(50) NOT NULL,
	"version_number" varchar(20) NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now(),
	"ip_address" text,
	"user_agent" text,
	"document_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_agreements_user_id_agreement_type_version_number_key" UNIQUE("user_id","agreement_type","version_number")
);

CREATE TABLE "user_appearance_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"theme" text DEFAULT 'light',
	"accent_color" text DEFAULT 'blue',
	"language" text DEFAULT 'en',
	"timezone" text DEFAULT 'UTC',
	"date_format" text DEFAULT 'MM/DD/YYYY',
	"time_format" text DEFAULT '12',
	"font_size" text DEFAULT 'medium',
	"compact_mode" boolean DEFAULT false,
	"show_animations" boolean DEFAULT true,
	"reduce_motion" boolean DEFAULT false,
	"dashboard_layout" text DEFAULT 'default',
	"sidebar_collapsed" boolean DEFAULT false,
	"show_tooltips" boolean DEFAULT true,
	"notification_position" text DEFAULT 'top-right',
	"notification_duration" integer DEFAULT 5000,
	CONSTRAINT "user_appearance_settings_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "user_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"admin_id" integer,
	"entity_type" varchar NOT NULL,
	"entity_id" uuid,
	"action" varchar NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"success" boolean NOT NULL,
	"error_message" text,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_billing_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"subscription_id" uuid,
	"billing_cycle" varchar(20) DEFAULT 'MONTHLY',
	"next_billing_date" timestamp,
	"amount" numeric(10, 2),
	"currency" char(3) DEFAULT 'USD',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_type" varchar(20) NOT NULL,
	"contact_value" varchar(255) NOT NULL,
	"is_primary" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_contacts_user_id_contact_type_contact_value_key" UNIQUE("user_id","contact_type","contact_value")
);

CREATE TABLE "user_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"subscription_id" uuid,
	"join_date" date DEFAULT now() NOT NULL,
	"tenure" numeric DEFAULT '0',
	"verification_status" varchar(20) DEFAULT 'PENDING',
	"assigned_admin_id_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_memberships_subscription_id_unique" UNIQUE("subscription_id")
);

CREATE TABLE "user_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email_payment_reminders" boolean DEFAULT true,
	"email_tenure_updates" boolean DEFAULT true,
	"email_security_alerts" boolean DEFAULT true,
	"email_system_updates" boolean DEFAULT false,
	"email_newsletter" boolean DEFAULT false,
	"sms_payment_reminders" boolean DEFAULT false,
	"sms_security_alerts" boolean DEFAULT true,
	"sms_urgent_updates" boolean DEFAULT true,
	"push_payment_reminders" boolean DEFAULT true,
	"push_tenure_updates" boolean DEFAULT true,
	"push_security_alerts" boolean DEFAULT true,
	"push_system_updates" boolean DEFAULT false,
	"email_frequency" text DEFAULT 'immediate',
	"sms_frequency" text DEFAULT 'urgent_only',
	"push_frequency" text DEFAULT 'immediate',
	CONSTRAINT "user_notification_preferences_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "user_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" varchar(20) DEFAULT 'stripe' NOT NULL,
	"method_type" varchar(20) NOT NULL,
	"method_subtype" varchar(20),
	"provider_payment_method_id" text,
	"last_four" varchar(4),
	"brand" varchar(20),
	"expires_month" integer,
	"expires_year" integer,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_payment_methods_user_id_provider_payment_method_id_key" UNIQUE("user_id","provider_payment_method_id")
);

CREATE TABLE "user_payment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"auto_renewal" boolean DEFAULT true,
	"payment_method" text DEFAULT 'card',
	"billing_cycle" text DEFAULT 'monthly',
	"billing_address" jsonb,
	"tax_id" text,
	"saved_payment_methods" jsonb DEFAULT '[]'::jsonb,
	"default_payment_method_id" text,
	"invoice_delivery" text DEFAULT 'email',
	"payment_reminders" boolean DEFAULT true,
	"payment_reminder_days" integer DEFAULT 3,
	"currency" text DEFAULT 'USD',
	"tax_rate" numeric(5, 4) DEFAULT '0.0000',
	CONSTRAINT "user_payment_settings_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "user_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"subscription_id" uuid,
	"payment_method_id" uuid,
	"provider" varchar(20) DEFAULT 'stripe' NOT NULL,
	"provider_payment_id" varchar(255),
	"provider_invoice_id" varchar(255),
	"provider_charge_id" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"currency" char(3) DEFAULT 'USD',
	"payment_type" varchar(20) NOT NULL,
	"payment_date" timestamp with time zone NOT NULL,
	"status" varchar(20) NOT NULL,
	"is_first_payment" boolean DEFAULT false,
	"failure_reason" text,
	"receipt_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"profile_visibility" text DEFAULT 'private',
	"show_tenure_months" boolean DEFAULT true,
	"show_join_date" boolean DEFAULT true,
	"show_activity_status" boolean DEFAULT true,
	"data_sharing" boolean DEFAULT false,
	"analytics_consent" boolean DEFAULT false,
	"marketing_consent" boolean DEFAULT false,
	"third_party_sharing" boolean DEFAULT false,
	"show_email" boolean DEFAULT false,
	"show_phone" boolean DEFAULT false,
	"show_address" boolean DEFAULT false,
	"show_login_activity" boolean DEFAULT false,
	"show_payment_history" boolean DEFAULT false,
	"show_tenure_progress" boolean DEFAULT true,
	"searchable" boolean DEFAULT true,
	"appear_in_leaderboards" boolean DEFAULT true,
	"show_in_member_directory" boolean DEFAULT false,
	"data_retention_period" integer DEFAULT 365,
	"auto_delete_inactive" boolean DEFAULT false,
	"inactive_period" integer DEFAULT 730,
	CONSTRAINT "user_privacy_settings_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"first_name" varchar,
	"last_name" varchar,
	"middle_name" varchar,
	"date_of_birth" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "user_security_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" text,
	"two_factor_backup_codes" text[],
	"two_factor_last_used" timestamp with time zone,
	"login_alerts" boolean DEFAULT true,
	"session_timeout" integer DEFAULT 30,
	"max_concurrent_sessions" integer DEFAULT 3,
	"password_last_changed" timestamp with time zone,
	"password_strength_score" integer DEFAULT 0,
	"require_password_change" boolean DEFAULT false,
	"trusted_devices" jsonb DEFAULT '[]'::jsonb,
	"device_fingerprint_required" boolean DEFAULT false,
	"security_questions" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "user_security_settings_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"push_notifications" boolean DEFAULT true,
	"marketing_emails" boolean DEFAULT false,
	"two_factor_auth" boolean DEFAULT false,
	"two_factor_secret" text,
	"login_alerts" boolean DEFAULT true,
	"session_timeout" integer DEFAULT 30,
	"profile_visibility" text DEFAULT 'private',
	"data_sharing" boolean DEFAULT false,
	"theme" text DEFAULT 'light',
	"language" text DEFAULT 'en',
	"auto_renewal" boolean DEFAULT true,
	"payment_method" text DEFAULT 'card',
	"billing_cycle" text DEFAULT 'monthly',
	"timezone" text DEFAULT 'UTC',
	"date_format" text DEFAULT 'MM/DD/YYYY',
	"currency" text DEFAULT 'USD',
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" varchar(20) DEFAULT 'stripe' NOT NULL,
	"provider_subscription_id" varchar(255) NOT NULL,
	"provider_customer_id" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"code" varchar(6) NOT NULL,
	"link_token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "verification_codes_link_token_unique" UNIQUE("link_token")
);

ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "membership_queue" ADD CONSTRAINT "membership_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payout_management" ADD CONSTRAINT "payout_management_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tax_forms" ADD CONSTRAINT "tax_forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transaction_monitoring" ADD CONSTRAINT "transaction_monitoring_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_agreements" ADD CONSTRAINT "user_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_appearance_settings" ADD CONSTRAINT "user_appearance_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_billing_schedules" ADD CONSTRAINT "user_billing_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_billing_schedules" ADD CONSTRAINT "user_billing_schedules_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_payment_settings" ADD CONSTRAINT "user_payment_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_payments" ADD CONSTRAINT "user_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_security_settings" ADD CONSTRAINT "user_security_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "idx_admin_email" ON "admin" USING btree ("email");
CREATE INDEX "idx_admin_alerts_alert_id" ON "admin_alerts" USING btree ("alert_id");
CREATE INDEX "idx_admin_alerts_status" ON "admin_alerts" USING btree ("status");
CREATE INDEX "idx_admin_alerts_severity" ON "admin_alerts" USING btree ("severity");
CREATE INDEX "idx_admin_alerts_assigned_to" ON "admin_alerts" USING btree ("assigned_to");
CREATE INDEX "idx_admin_sessions_parent_id" ON "admin_sessions" USING btree ("_parent_id");
CREATE INDEX "idx_disputes_user_id" ON "disputes" USING btree ("user_id");
CREATE INDEX "idx_disputes_status" ON "disputes" USING btree ("status");
CREATE INDEX "idx_disputes_type" ON "disputes" USING btree ("type");
CREATE INDEX "idx_disputes_dispute_id" ON "disputes" USING btree ("dispute_id");
CREATE INDEX "idx_kyc_verification_user_id" ON "kyc_verification" USING btree ("user_id");
CREATE INDEX "idx_kyc_verification_status" ON "kyc_verification" USING btree ("status");
CREATE INDEX "idx_membership_queue_user_id" ON "membership_queue" USING btree ("user_id");
CREATE INDEX "idx_membership_queue_position" ON "membership_queue" USING btree ("queue_position");
CREATE INDEX "idx_membership_queue_eligible" ON "membership_queue" USING btree ("is_eligible");
CREATE INDEX "idx_payload_locked_documents_global_slug" ON "payload_locked_documents" USING btree ("global_slug");
CREATE INDEX "idx_payload_locked_documents_rels_parent_id" ON "payload_locked_documents_rels" USING btree ("parent_id");
CREATE INDEX "idx_payload_locked_documents_rels_path" ON "payload_locked_documents_rels" USING btree ("path");
CREATE INDEX "idx_payload_locked_documents_rels_admin_id" ON "payload_locked_documents_rels" USING btree ("admin_id");
CREATE INDEX "idx_payload_locked_documents_rels_users_id" ON "payload_locked_documents_rels" USING btree ("users_id");
CREATE INDEX "idx_payload_preferences_key" ON "payload_preferences" USING btree ("key");
CREATE INDEX "idx_payload_preferences_rels_parent_id" ON "payload_preferences_rels" USING btree ("parent_id");
CREATE INDEX "idx_payload_preferences_rels_path" ON "payload_preferences_rels" USING btree ("path");
CREATE INDEX "idx_payload_preferences_rels_admin_id" ON "payload_preferences_rels" USING btree ("admin_id");
CREATE INDEX "idx_payout_management_user_id" ON "payout_management" USING btree ("user_id");
CREATE INDEX "idx_payout_management_membership_id" ON "payout_management" USING btree ("membership_id");
CREATE INDEX "idx_payout_management_status" ON "payout_management" USING btree ("status");
CREATE INDEX "idx_system_audit_logs_user_id" ON "system_audit_logs" USING btree ("user_id");
CREATE INDEX "idx_system_audit_logs_entity" ON "system_audit_logs" USING btree ("entity_type","entity_id");
CREATE INDEX "idx_system_audit_logs_created_at" ON "system_audit_logs" USING btree ("created_at");
CREATE INDEX "idx_system_audit_logs_action" ON "system_audit_logs" USING btree ("action");
CREATE INDEX "idx_system_audit_logs_success" ON "system_audit_logs" USING btree ("success");
CREATE INDEX "idx_tax_forms_user_id" ON "tax_forms" USING btree ("user_id");
CREATE INDEX "idx_tax_forms_status" ON "tax_forms" USING btree ("status");
CREATE INDEX "idx_tax_forms_tax_year" ON "tax_forms" USING btree ("tax_year");
CREATE INDEX "idx_tax_forms_form_type" ON "tax_forms" USING btree ("form_type");
CREATE INDEX "idx_tax_forms_form_id" ON "tax_forms" USING btree ("form_id");
CREATE INDEX "idx_transaction_monitoring_user_id" ON "transaction_monitoring" USING btree ("user_id");
CREATE INDEX "idx_transaction_monitoring_transaction_id" ON "transaction_monitoring" USING btree ("transaction_id");
CREATE INDEX "idx_transaction_monitoring_risk_level" ON "transaction_monitoring" USING btree ("risk_level");
CREATE INDEX "idx_transaction_monitoring_status" ON "transaction_monitoring" USING btree ("status");
CREATE INDEX "idx_user_addresses_user_id" ON "user_addresses" USING btree ("user_id");
CREATE INDEX "idx_user_addresses_primary" ON "user_addresses" USING btree ("user_id","is_primary");
CREATE INDEX "idx_user_agreements_user_id" ON "user_agreements" USING btree ("user_id");
CREATE INDEX "idx_user_agreements_type" ON "user_agreements" USING btree ("agreement_type");
CREATE INDEX "idx_user_appearance_settings_user_id" ON "user_appearance_settings" USING btree ("user_id");
CREATE INDEX "idx_user_audit_logs_user_id" ON "user_audit_logs" USING btree ("user_id");
CREATE INDEX "idx_user_audit_logs_action" ON "user_audit_logs" USING btree ("action");
CREATE INDEX "idx_user_audit_logs_created_at" ON "user_audit_logs" USING btree ("created_at");
CREATE INDEX "idx_user_audit_logs_entity_type" ON "user_audit_logs" USING btree ("entity_type");
CREATE INDEX "idx_user_billing_schedules_user_id" ON "user_billing_schedules" USING btree ("user_id");
CREATE INDEX "idx_user_billing_schedules_next_billing" ON "user_billing_schedules" USING btree ("next_billing_date");
CREATE INDEX "idx_user_contacts_user_id" ON "user_contacts" USING btree ("user_id");
CREATE INDEX "idx_user_contacts_type" ON "user_contacts" USING btree ("contact_type");
CREATE INDEX "idx_user_contacts_primary" ON "user_contacts" USING btree ("user_id","is_primary");
CREATE INDEX "idx_user_memberships_user_id" ON "user_memberships" USING btree ("user_id");
CREATE INDEX "idx_user_memberships_subscription_id" ON "user_memberships" USING btree ("subscription_id");
CREATE INDEX "idx_user_memberships_join_date" ON "user_memberships" USING btree ("join_date");
CREATE INDEX "idx_user_notification_preferences_user_id" ON "user_notification_preferences" USING btree ("user_id");
CREATE INDEX "idx_user_payment_methods_user_id" ON "user_payment_methods" USING btree ("user_id");
CREATE INDEX "idx_user_payment_methods_default" ON "user_payment_methods" USING btree ("user_id","is_default");
CREATE INDEX "idx_user_payment_methods_active" ON "user_payment_methods" USING btree ("user_id","is_active");
CREATE INDEX "idx_user_payment_settings_user_id" ON "user_payment_settings" USING btree ("user_id");
CREATE INDEX "idx_user_payments_user_id" ON "user_payments" USING btree ("user_id");
CREATE INDEX "idx_user_payments_subscription_id" ON "user_payments" USING btree ("subscription_id");
CREATE INDEX "idx_user_payments_date" ON "user_payments" USING btree ("payment_date");
CREATE INDEX "idx_user_payments_status" ON "user_payments" USING btree ("status");
CREATE INDEX "idx_user_privacy_settings_user_id" ON "user_privacy_settings" USING btree ("user_id");
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");
CREATE INDEX "idx_user_profiles_name" ON "user_profiles" USING btree ("first_name","last_name");
CREATE INDEX "idx_user_security_settings_user_id" ON "user_security_settings" USING btree ("user_id");
CREATE INDEX "idx_user_settings_user_id" ON "user_settings" USING btree ("user_id");
CREATE INDEX "idx_user_subscriptions_user_id" ON "user_subscriptions" USING btree ("user_id");
CREATE INDEX "idx_user_subscriptions_provider_id" ON "user_subscriptions" USING btree ("provider_subscription_id");
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions" USING btree ("status");
CREATE INDEX "idx_verification_codes_code" ON "verification_codes" USING btree ("code");
CREATE INDEX "idx_verification_codes_email" ON "verification_codes" USING btree ("email");
CREATE INDEX "idx_verification_codes_expires_at" ON "verification_codes" USING btree ("expires_at");
CREATE INDEX "idx_verification_codes_link_token" ON "verification_codes" USING btree ("link_token");
CREATE INDEX "idx_verification_codes_user_id" ON "verification_codes" USING btree ("user_id");
