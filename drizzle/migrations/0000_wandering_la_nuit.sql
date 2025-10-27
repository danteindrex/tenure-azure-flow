CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"expiresAt" timestamp with time zone,
	"scope" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"dispute_type" varchar(50) NOT NULL,
	"dispute_status" varchar(20) DEFAULT 'open' NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now(),
	"assigned_to" integer,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kyc_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verification_type" varchar(50),
	"document_type" varchar(50),
	"document_number" varchar(100),
	"document_front_url" text,
	"document_back_url" text,
	"selfie_url" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" integer,
	"rejection_reason" text,
	"expires_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "kyc_verification_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
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
	"status" varchar(20) DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "membership_queue_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"email" text NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"inviterId" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" text,
	"credentialId" text NOT NULL,
	"publicKey" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"deviceType" text,
	"backedUp" boolean DEFAULT false,
	"transports" text[],
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp with time zone,
	CONSTRAINT "passkey_credentialId_unique" UNIQUE("credentialId")
);
--> statement-breakpoint
CREATE TABLE "payout_management" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"payout_amount" numeric(10, 2) NOT NULL,
	"payout_method" varchar(50),
	"payout_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payout_date" timestamp with time zone,
	"scheduled_date" date,
	"completed_date" timestamp with time zone,
	"transaction_id" varchar(255),
	"failure_reason" text,
	"bank_account_last4" varchar(4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "tax_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"form_type" varchar(20) NOT NULL,
	"tax_year" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"tax_id_type" varchar(20),
	"tax_id_number" varchar(50),
	"legal_name" varchar(255),
	"business_name" varchar(255),
	"address" text,
	"city" varchar(100),
	"state" varchar(50),
	"zip_code" varchar(20),
	"country" varchar(2) DEFAULT 'US',
	"form_data" jsonb,
	"document_url" text,
	"total_income" numeric(10, 2),
	"federal_tax_withheld" numeric(10, 2),
	"submitted_at" timestamp with time zone,
	"submitted_by" uuid,
	"approved_at" timestamp with time zone,
	"approved_by" integer,
	"filed_with_irs" boolean DEFAULT false,
	"irs_filing_date" timestamp with time zone,
	"irs_confirmation_number" varchar(100),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transaction_monitoring" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"transaction_type" varchar(50) NOT NULL,
	"transaction_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"risk_score" integer DEFAULT 0,
	"risk_level" varchar(20) DEFAULT 'low',
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"flagged" boolean DEFAULT false,
	"flag_reason" text,
	"flagged_at" timestamp with time zone,
	"flagged_by" integer,
	"review_status" varchar(20) DEFAULT 'pending',
	"reviewed_at" timestamp with time zone,
	"reviewed_by" integer,
	"review_notes" text,
	"aml_check" boolean DEFAULT false,
	"aml_check_date" timestamp with time zone,
	"sanction_screening" boolean DEFAULT false,
	"sanction_screening_date" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"location" jsonb,
	"device_fingerprint" text,
	"transaction_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text[],
	"verified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"verifiedAt" timestamp with time zone,
	CONSTRAINT "two_factor_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"password" text,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"address_type" varchar(20) DEFAULT 'primary',
	"street_address" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country_code" varchar(2) DEFAULT 'US',
	"is_primary" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "user_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_category" varchar(50),
	"event_description" text,
	"event_data" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"device_type" varchar(20),
	"browser" varchar(50),
	"os" varchar(50),
	"location" jsonb,
	"success" boolean DEFAULT true,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "user_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"contact_type" varchar(20) NOT NULL,
	"contact_value" varchar(255) NOT NULL,
	"is_primary" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_contacts_user_id_contact_type_contact_value_key" UNIQUE("user_id","contact_type","contact_value")
);
--> statement-breakpoint
CREATE TABLE "user_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"join_date" date DEFAULT now() NOT NULL,
	"tenure" numeric DEFAULT '0',
	"verification_status" varchar(20) DEFAULT 'PENDING',
	"assigned_admin_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_memberships_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"middle_name" varchar(100),
	"date_of_birth" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_subscriptions_provider_subscription_id_unique" UNIQUE("provider_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"code_type" varchar(20) NOT NULL,
	"code" varchar(10) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"email" varchar(255),
	"phone_number" varchar(20),
	"used" boolean DEFAULT false,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_queue" ADD CONSTRAINT "membership_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_management" ADD CONSTRAINT "payout_management_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_forms" ADD CONSTRAINT "tax_forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_monitoring" ADD CONSTRAINT "transaction_monitoring_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agreements" ADD CONSTRAINT "user_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_appearance_settings" ADD CONSTRAINT "user_appearance_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_billing_schedules" ADD CONSTRAINT "user_billing_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_billing_schedules" ADD CONSTRAINT "user_billing_schedules_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_settings" ADD CONSTRAINT "user_payment_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payments" ADD CONSTRAINT "user_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payments" ADD CONSTRAINT "user_payments_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payments" ADD CONSTRAINT "user_payments_payment_method_id_user_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."user_payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_security_settings" ADD CONSTRAINT "user_security_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_disputes_user_id" ON "disputes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_disputes_status" ON "disputes" USING btree ("dispute_status");--> statement-breakpoint
CREATE INDEX "idx_disputes_type" ON "disputes" USING btree ("dispute_type");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_user_id" ON "kyc_verification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_verification_status" ON "kyc_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_membership_queue_user_id" ON "membership_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_membership_queue_position" ON "membership_queue" USING btree ("queue_position");--> statement-breakpoint
CREATE INDEX "idx_membership_queue_eligible" ON "membership_queue" USING btree ("is_eligible");--> statement-breakpoint
CREATE INDEX "idx_organization_slug" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_organization_invitation_org_id" ON "organization_invitation" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_organization_invitation_email" ON "organization_invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_organization_invitation_token" ON "organization_invitation" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_organization_invitation_status" ON "organization_invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_organization_member_org_id" ON "organization_member" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "idx_organization_member_user_id" ON "organization_member" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_organization_member_role" ON "organization_member" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_payout_management_user_id" ON "payout_management" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payout_management_status" ON "payout_management" USING btree ("payout_status");--> statement-breakpoint
CREATE INDEX "idx_payout_management_payout_date" ON "payout_management" USING btree ("payout_date");--> statement-breakpoint
CREATE INDEX "idx_system_audit_logs_user_id" ON "system_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_system_audit_logs_entity" ON "system_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_system_audit_logs_created_at" ON "system_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_system_audit_logs_action" ON "system_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_system_audit_logs_success" ON "system_audit_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "idx_tax_forms_user_id" ON "tax_forms" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tax_forms_status" ON "tax_forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tax_forms_tax_year" ON "tax_forms" USING btree ("tax_year");--> statement-breakpoint
CREATE INDEX "idx_tax_forms_form_type" ON "tax_forms" USING btree ("form_type");--> statement-breakpoint
CREATE INDEX "idx_transaction_monitoring_user_id" ON "transaction_monitoring" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_monitoring_transaction_id" ON "transaction_monitoring" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_transaction_monitoring_risk_level" ON "transaction_monitoring" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_transaction_monitoring_flagged" ON "transaction_monitoring" USING btree ("flagged");--> statement-breakpoint
CREATE INDEX "idx_transaction_monitoring_review_status" ON "transaction_monitoring" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "idx_user_addresses_user_id" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_addresses_primary" ON "user_addresses" USING btree ("user_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_user_agreements_user_id" ON "user_agreements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_agreements_type" ON "user_agreements" USING btree ("agreement_type");--> statement-breakpoint
CREATE INDEX "idx_user_appearance_settings_user_id" ON "user_appearance_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_audit_logs_user_id" ON "user_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_audit_logs_event_type" ON "user_audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_user_audit_logs_event_category" ON "user_audit_logs" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "idx_user_audit_logs_created_at" ON "user_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_billing_schedules_user_id" ON "user_billing_schedules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_billing_schedules_next_billing" ON "user_billing_schedules" USING btree ("next_billing_date");--> statement-breakpoint
CREATE INDEX "idx_user_contacts_user_id" ON "user_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_contacts_type" ON "user_contacts" USING btree ("contact_type");--> statement-breakpoint
CREATE INDEX "idx_user_contacts_primary" ON "user_contacts" USING btree ("user_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_user_memberships_user_id" ON "user_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_memberships_join_date" ON "user_memberships" USING btree ("join_date");--> statement-breakpoint
CREATE INDEX "idx_user_notification_preferences_user_id" ON "user_notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_payment_methods_user_id" ON "user_payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_payment_methods_default" ON "user_payment_methods" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE INDEX "idx_user_payment_methods_active" ON "user_payment_methods" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_user_payment_settings_user_id" ON "user_payment_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_payments_user_id" ON "user_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_payments_subscription_id" ON "user_payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_user_payments_date" ON "user_payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_user_payments_status" ON "user_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_privacy_settings_user_id" ON "user_privacy_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_name" ON "user_profiles" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "idx_user_security_settings_user_id" ON "user_security_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_settings_user_id" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_user_id" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_provider_id" ON "user_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_auth_user_id" ON "users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_verification_codes_user_id" ON "verification_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_verification_codes_code" ON "verification_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_verification_codes_email" ON "verification_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_verification_codes_expires_at" ON "verification_codes" USING btree ("expires_at");