# Complete Database Schema Analysis

## Overview
This document provides a comprehensive analysis of the Tenure application's database schema, including all tables, relationships, and their purposes within the system.

## Database Technology
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit migrations

## Core Table Categories

### 1. User Management Tables

#### `users` (Primary User Table)
- **Purpose**: Core user records
- **Key Fields**:
  - `id` (UUID, Primary Key)
  - `auth_user_id` (Text, links to auth system)
  - `email` (VARCHAR(255), unique)
  - `email_verified` (Boolean)
  - `status` (Enum: Active, Inactive, Suspended, Pending)
  - `created_at`, `updated_at` (Timestamps)
- **Policies**: Row-level security enabled for user data access

#### `user_profiles`
- **Purpose**: Extended user profile information
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `first_name`, `last_name`, `middle_name` (VARCHAR)
  - `date_of_birth` (Date)
- **Relationship**: One-to-one with users

#### `user_contacts`
- **Purpose**: User contact information (phone, email, emergency)
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `contact_type` (Enum: phone, email, emergency)
  - `contact_value` (VARCHAR(255))
  - `is_primary`, `is_verified` (Boolean)
- **Relationship**: One-to-many with users

#### `user_addresses`
- **Purpose**: User address information
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `address_type` (Enum: primary, billing, shipping)
  - `street_address`, `city`, `state`, `postal_code` (VARCHAR)
  - `country_code` (CHAR(2), default 'US')
  - `is_primary` (Boolean)
- **Relationship**: One-to-many with users

### 2. Authentication & Security Tables

#### `verification_codes`
- **Purpose**: Email/phone verification codes
- **Key Fields**:
  - `email` (VARCHAR(255))
  - `code` (VARCHAR(6))
  - `link_token` (VARCHAR(64))
  - `expires_at` (Timestamp)
  - `used` (Boolean)
  - `user_id` (UUID, FK to users)

#### `signup_sessions`
- **Purpose**: Multi-step signup process tracking
- **Key Fields**:
  - `session_id` (VARCHAR(50), unique)
  - `token` (VARCHAR(50), unique)
  - `email`, `phone` (VARCHAR)
  - `step` (Integer, default 1)
  - `status` (VARCHAR, default 'active')
  - `profile_data` (JSONB)
  - `expires_at` (Timestamp)

#### `user_security_settings`
- **Purpose**: User security preferences and 2FA settings
- **Key Fields**:
  - `two_factor_enabled` (Boolean)
  - `two_factor_secret` (Text)
  - `two_factor_backup_codes` (Text array)
  - `login_alerts` (Boolean)
  - `session_timeout` (Integer, default 30)
  - `trusted_devices` (JSONB)

### 3. Payment & Subscription Tables

#### `user_payments`
- **Purpose**: Payment transaction records
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `subscription_id` (UUID, FK to user_subscriptions)
  - `provider` (Enum: stripe, paypal, bank)
  - `provider_payment_id`, `provider_invoice_id` (VARCHAR)
  - `amount` (NUMERIC(10,2))
  - `currency` (CHAR(3), default 'USD')
  - `payment_type` (Enum: initial, recurring, one_time)
  - `status` (Enum: succeeded, pending, failed, refunded, canceled)
  - `is_first_payment` (Boolean)
  - `metadata` (JSONB)

#### `user_subscriptions`
- **Purpose**: User subscription records
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `provider` (Enum: stripe, paypal)
  - `provider_subscription_id`, `provider_customer_id` (VARCHAR)
  - `status` (Enum: active, past_due, canceled, incomplete, trialing, unpaid)
  - `current_period_start`, `current_period_end` (Timestamps)
  - `cancel_at_period_end` (Boolean)
  - `trial_end` (Timestamp)

#### `user_payment_methods`
- **Purpose**: Stored payment methods
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `provider` (Enum: stripe, paypal)
  - `method_type` (Enum: card, bank_account, digital_wallet)
  - `method_subtype` (Enum: apple_pay, google_pay, cash_app)
  - `provider_payment_method_id` (Text)
  - `last_four` (VARCHAR(4))
  - `brand` (VARCHAR(20))
  - `expires_month`, `expires_year` (Integer)
  - `is_default`, `is_active` (Boolean)

#### `user_billing_schedules`
- **Purpose**: Billing schedule management
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `subscription_id` (UUID)
  - `billing_cycle` (Enum: MONTHLY, QUARTERLY, YEARLY)
  - `next_billing_date` (Date)
  - `amount` (NUMERIC(10,2))
  - `is_active` (Boolean)

### 4. Membership & Queue Management Tables

#### `membership_queue`
- **Purpose**: Core queue management for membership payouts
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `queue_position` (Integer)
  - `joined_queue_at` (Timestamp)
  - `is_eligible` (Boolean, default true)
  - `priority_score` (Integer, default 0)
  - `subscription_active` (Boolean)
  - `total_months_subscribed` (Integer)
  - `last_payment_date` (Timestamp)
  - `lifetime_payment_total` (NUMERIC(10,2))
  - `has_received_payout` (Boolean)
  - `notes` (Text)

#### `user_memberships`
- **Purpose**: Membership status and tenure tracking
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `join_date` (Date, default CURRENT_DATE)
  - `tenure` (NUMERIC, default 0)
  - `verification_status` (VARCHAR, default 'PENDING')
  - `assigned_admin_id` (Integer, FK to admin)
  - `notes` (Text)

#### `payout_management`
- **Purpose**: Payout processing and approval workflow
- **Key Fields**:
  - `payout_id` (Text, unique)
  - `user_id` (UUID, FK to users)
  - `queue_position` (Integer)
  - `amount` (NUMERIC(12,2), default 100000.00)
  - `status` (Text, default 'pending_approval')
  - `eligibility_check` (JSONB)
  - `approval_workflow` (JSONB)
  - `scheduled_date` (Timestamp)
  - `payment_method` (Text, default 'ach')
  - `bank_details` (JSONB)
  - `tax_withholding` (JSONB)
  - `audit_trail` (JSONB)

### 5. Compliance & KYC Tables

#### `kyc_verification`
- **Purpose**: Know Your Customer verification records
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `status` (Text, default 'pending')
  - `verification_method` (Text: manual, stripe_identity, plaid, persona, onfido)
  - `document_type` (Text: passport, drivers_license, national_id, ssn)
  - `document_number` (Text)
  - `document_front_url`, `document_back_url`, `selfie_url` (Text)
  - `verification_provider` (Text)
  - `provider_verification_id` (Text)
  - `verification_data` (JSONB)
  - `verified_at`, `expires_at` (Timestamps)
  - `rejection_reason` (Text)
  - `reviewer_id` (Integer)
  - `risk_score` (Integer, 0-100)
  - `risk_factors` (JSONB)

#### `transaction_monitoring`
- **Purpose**: AML/transaction monitoring
- **Key Fields**:
  - `transaction_id` (UUID)
  - `user_id` (UUID, FK to users)
  - `transaction_type` (Text: payment, payout, refund, chargeback)
  - `amount` (NUMERIC(12,2))
  - `risk_level` (Text: low, medium, high, critical)
  - `risk_score` (Integer, 0-100)
  - `status` (Text: pending_review, approved, flagged, blocked, escalated)
  - `flags` (JSONB)
  - `aml_check`, `velocity_check` (JSONB)
  - `device_fingerprint`, `geographic_data` (JSONB)
  - `sar_filed` (Boolean, default false)

#### `disputes`
- **Purpose**: Payment dispute management
- **Key Fields**:
  - `dispute_id` (Text, unique)
  - `payment_id` (UUID)
  - `user_id` (UUID, FK to users)
  - `type` (Text: chargeback, refund_request, fraud_claim, duplicate_charge)
  - `status` (Text: needs_response, evidence_submitted, under_review, won, lost)
  - `reason` (Text)
  - `amount` (NUMERIC(12,2))
  - `stripe_dispute_id` (Text)
  - `respond_by` (Timestamp)
  - `evidence` (JSONB)
  - `internal_notes` (JSONB)

### 6. Tax & Legal Tables

#### `tax_forms`
- **Purpose**: Tax form generation and management
- **Key Fields**:
  - `form_id` (Text, unique)
  - `user_id` (UUID, FK to users)
  - `form_type` (Text: W-9, 1099-MISC, 1099-NEC, 1099-K, W-8BEN)
  - `tax_year` (Integer)
  - `status` (Text: pending, generated, sent, filed_with_irs, corrected)
  - `recipient_info`, `payer_info` (JSONB)
  - `income_details`, `w9_data` (JSONB)
  - `generation`, `delivery`, `irs_filing` (JSONB)
  - `corrections` (JSONB)

#### `user_agreements`
- **Purpose**: Legal agreement tracking
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `agreement_type` (Enum: TERMS_CONDITIONS, PAYMENT_AUTHORIZATION)
  - `version_number` (VARCHAR(20))
  - `agreed_at` (Timestamp)
  - `ip_address` (INET)
  - `user_agent` (Text)
  - `document_url` (Text)
  - `is_active` (Boolean)

### 7. Admin & Management Tables

#### `admin`
- **Purpose**: Admin user accounts
- **Key Fields**:
  - `email` (VARCHAR, unique)
  - `role` (Enum: Super Admin, Manager, Support)
  - `reset_password_token` (VARCHAR)
  - `salt`, `hash` (VARCHAR)
  - `login_attempts` (NUMERIC)
  - `lock_until` (Timestamp)

#### `admin_sessions`
- **Purpose**: Admin session management
- **Key Fields**:
  - `parent_id` (Integer, FK to admin)
  - `expires_at` (Timestamp)

#### `admin_alerts`
- **Purpose**: System alerts for administrators
- **Key Fields**:
  - `alert_id` (Text, unique)
  - `title`, `message` (Text)
  - `severity` (Text: info, warning, error, critical)
  - `category` (Text: system, security, payment, queue, compliance)
  - `status` (Text: new, acknowledged, investigating, resolved)
  - `related_entity`, `trigger_info` (JSONB)
  - `assigned_to`, `acknowledged_by`, `resolved_by` (Integer)
  - `escalation`, `metadata` (JSONB)

### 8. Audit & Logging Tables

#### `system_audit_logs`
- **Purpose**: System-wide audit logging
- **Key Fields**:
  - `user_id` (UUID, FK to users)
  - `admin_id` (Integer, FK to admin)
  - `entity_type` (VARCHAR(50))
  - `entity_id` (UUID)
  - `action` (VARCHAR(50))
  - `old_values`, `new_values` (JSONB)
  - `success` (Boolean)
  - `error_message` (Text)
  - `ip_address` (INET)
  - `user_agent` (Text)
  - `metadata` (JSONB)

#### `user_audit_logs`
- **Purpose**: User-specific audit logging
- **Key Fields**: Similar to system_audit_logs but focused on user actions

### 9. User Settings Tables

#### `user_settings`
- **Purpose**: General user preferences
- **Key Fields**:
  - `email_notifications`, `sms_notifications`, `push_notifications` (Boolean)
  - `marketing_emails` (Boolean)
  - `two_factor_auth` (Boolean)
  - `session_timeout` (Integer, default 30)
  - `theme` (Text, default 'light')
  - `language` (Text, default 'en')
  - `timezone` (Text, default 'UTC')
  - `currency` (Text, default 'USD')

#### `user_notification_preferences`
- **Purpose**: Detailed notification preferences
- **Key Fields**:
  - Various boolean fields for different notification types
  - Frequency settings for email, SMS, and push notifications

#### `user_payment_settings`
- **Purpose**: Payment-related user preferences
- **Key Fields**:
  - `auto_renewal` (Boolean)
  - `payment_method` (Text)
  - `billing_cycle` (Text)
  - `billing_address` (JSONB)
  - `saved_payment_methods` (JSONB)

#### `user_privacy_settings`
- **Purpose**: Privacy and data sharing preferences
- **Key Fields**:
  - `profile_visibility` (Text)
  - Various boolean fields for data sharing and visibility
  - `data_retention_period` (Integer)

#### `user_appearance_settings`
- **Purpose**: UI/UX preferences
- **Key Fields**:
  - `theme`, `accent_color` (Text)
  - `font_size`, `dashboard_layout` (Text)
  - `show_animations`, `reduce_motion` (Boolean)

### 10. Content Management Tables

#### `newsfeedpost`
- **Purpose**: News feed content management
- **Key Fields**:
  - `title` (VARCHAR)
  - `content` (JSONB)
  - `admin_id` (Integer, FK to admin)
  - `publish_date` (Timestamp)
  - `status` (Enum: Draft, Published, Scheduled, Archived)
  - `priority` (Enum: Low, Normal, High, Urgent)

### 11. Payload CMS Tables

#### `payload_*` tables
- **Purpose**: Payload CMS infrastructure
- **Tables**: 
  - `payload_locked_documents`
  - `payload_migrations`
  - `payload_preferences`
  - `payload_preferences_rels`

### 12. Better Auth Tables

#### Authentication system tables:
- `user` (Better Auth user table)
- `session` (Session management)
- `account` (OAuth accounts)
- `passkey` (WebAuthn passkeys)
- `two_factor` (2FA settings)
- `verification` (Email/phone verification)
- `organization` (Organization management)
- `organization_member` (Organization membership)

## Key Relationships

### Primary Relationships:
1. **users** → **user_profiles** (1:1)
2. **users** → **user_contacts** (1:many)
3. **users** → **user_addresses** (1:many)
4. **users** → **user_payments** (1:many)
5. **users** → **user_subscriptions** (1:many)
6. **users** → **membership_queue** (1:1)
7. **users** → **kyc_verification** (1:many)
8. **users** → **payout_management** (1:many)

### Security Features:
- Row-level security (RLS) policies on most user tables
- Audit logging for all major operations
- Comprehensive KYC and AML monitoring
- Multi-factor authentication support
- Session management and device tracking

## Data Flow:
1. **User Registration** → users, user_profiles, user_contacts, user_addresses
2. **Payment Processing** → user_payments, user_subscriptions, user_payment_methods
3. **Queue Management** → membership_queue, payout_management
4. **Compliance** → kyc_verification, transaction_monitoring
5. **Administration** → admin, admin_alerts, audit logs

## Enums and Constraints:
The schema includes comprehensive enums for:
- User status types
- Payment statuses and types
- Verification statuses
- Risk levels
- Alert severities
- And many more for data integrity

This schema supports a comprehensive membership/subscription platform with robust financial, compliance, and administrative capabilities.