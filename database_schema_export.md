# Supabase Database Schema Export
**Generated:** 2025-11-10
**Database:** tenure-azure-flow

## Table of Contents
- [Extensions](#extensions)
- [Migrations](#migrations)
- [Tables](#tables)
- [Materialized Views](#materialized-views)
- [Functions](#functions)
- [Triggers](#triggers)
- [Indexes](#indexes)
- [Sequences](#sequences)
- [Enum Types](#enum-types)
- [RLS Policies](#rls-policies)

---

## Extensions

### Installed Extensions
- **pg_graphql** (v1.5.11) - GraphQL support
- **supabase_vault** (v0.3.1) - Supabase Vault Extension
- **pgcrypto** (v1.3) - Cryptographic functions
- **pg_stat_statements** (v1.11) - Track SQL statement statistics
- **plpgsql** (v1.0) - PL/pgSQL procedural language
- **pg_cron** (v1.6.4) - Job scheduler for PostgreSQL
- **uuid-ossp** (v1.1) - Generate UUIDs

---

## Migrations

1. **20251021103139** - create_university_staff_table
2. **20251023143208** - create_verification_codes_table
3. **20251023144421** - create_signup_sessions_table
4. **20251023180754** - create_signup_sessions_table
5. **20251023180802** - create_verification_codes_table

---

## Tables

### Core User Tables

#### users
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 16

| Column | Type | Nullable | Default | Options |
|--------|------|----------|---------|---------|
| id | uuid | No | gen_random_uuid() | updatable |
| auth_user_id | text | Yes | | updatable |
| email | varchar | No | | updatable, unique |
| email_verified | bool | Yes | false | updatable |
| status | enum_users_status | No | 'Pending' | updatable |
| created_at | timestamptz | Yes | now() | updatable |
| updated_at | timestamptz | Yes | now() | updatable |
| name | text | Yes | | updatable |
| image | text | Yes | | updatable |
| two_factor_enabled | bool | Yes | false | updatable |

**Enum Values for status:** Active, Inactive, Suspended, Pending

---

#### user_profiles
**Primary Key:** id (varchar)
**RLS Enabled:** No
**Row Count:** 5

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | varchar | No | |
| user_id | uuid | Yes | |
| first_name | varchar | Yes | |
| last_name | varchar | Yes | |
| middle_name | varchar | Yes | |
| date_of_birth | date | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

#### user_contacts
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 5

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | |
| contact_type | varchar | No | |
| contact_value | varchar | No | (unique) |
| is_primary | bool | Yes | false |
| is_verified | bool | Yes | false |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

#### user_addresses
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 5

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | |
| address_type | varchar | Yes | 'primary' |
| street_address | varchar | No | |
| address_line_2 | varchar | Yes | |
| city | varchar | No | |
| state | varchar | No | |
| postal_code | varchar | No | |
| country_code | varchar | Yes | 'US' |
| is_primary | bool | Yes | true |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

### Membership & Queue Tables

#### user_memberships
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 8

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | |
| join_date | date | No | now() |
| tenure | numeric | Yes | 0 |
| verification_status | enum | Yes | 'PENDING' |
| assigned_admin_id_id | int4 | Yes | |
| notes | text | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |
| subscription_id | uuid | Yes | (unique) |

**Enum Values for verification_status:** PENDING, VERIFIED, FAILED, SKIPPED

**Foreign Keys:**
- user_id → users.id
- subscription_id → user_subscriptions.id

---

#### membership_queue
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 3

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | (unique) |
| queue_position | int4 | Yes | |
| joined_queue_at | timestamptz | Yes | now() |
| is_eligible | bool | Yes | true |
| priority_score | int4 | Yes | 0 |
| subscription_active | bool | Yes | false |
| total_months_subscribed | int4 | Yes | 0 |
| last_payment_date | timestamptz | Yes | |
| lifetime_payment_total | numeric | Yes | 0.00 |
| has_received_payout | bool | Yes | false |
| notes | text | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

### Payment & Subscription Tables

#### user_subscriptions
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 7

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | |
| provider | varchar | No | 'stripe' |
| provider_subscription_id | varchar | No | |
| provider_customer_id | varchar | No | |
| status | enum | No | |
| current_period_start | timestamptz | No | |
| current_period_end | timestamptz | No | |
| cancel_at_period_end | bool | Yes | false |
| canceled_at | timestamptz | Yes | |
| trial_end | timestamptz | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Enum Values for status:** active, past_due, canceled, incomplete, trialing, unpaid

**Foreign Keys:**
- user_id → users.id

---

#### user_payments
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 8

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | |
| subscription_id | uuid | Yes | |
| payment_method_id | uuid | Yes | |
| provider | varchar | No | 'stripe' |
| provider_payment_id | varchar | Yes | |
| provider_invoice_id | varchar | Yes | |
| provider_charge_id | varchar | Yes | |
| amount | numeric | No | |
| currency | bpchar | Yes | 'USD' |
| payment_type | varchar | No | |
| payment_date | timestamptz | No | |
| status | enum | No | |
| is_first_payment | bool | Yes | false |
| failure_reason | text | Yes | |
| receipt_url | text | Yes | |
| metadata | jsonb | Yes | '{}' |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Enum Values for status:** succeeded, pending, failed, refunded, canceled

**Foreign Keys:**
- user_id → users.id

---

#### user_payment_methods
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 11

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | |
| provider | varchar | No | 'stripe' |
| method_type | varchar | No | |
| method_subtype | varchar | Yes | |
| provider_payment_method_id | text | Yes | |
| last_four | varchar | Yes | |
| brand | varchar | Yes | |
| expires_month | int4 | Yes | |
| expires_year | int4 | Yes | |
| is_default | bool | Yes | false |
| is_active | bool | Yes | true |
| metadata | jsonb | Yes | '{}' |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

#### user_billing_schedules
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 7

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | |
| subscription_id | uuid | Yes | |
| billing_cycle | varchar | Yes | 'MONTHLY' |
| next_billing_date | timestamp | Yes | |
| amount | numeric | Yes | |
| currency | bpchar | Yes | 'USD' |
| is_active | bool | Yes | true |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id
- subscription_id → user_subscriptions.id

---

### Payout & Financial Tables

#### payout_management
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| payout_id | text | No | (unique) |
| user_id | uuid | No | |
| queue_position | int4 | No | |
| amount | numeric | No | 100000.00 |
| currency | text | Yes | 'USD' |
| status | text | No | 'pending_approval' |
| eligibility_check | jsonb | Yes | '{}' |
| approval_workflow | jsonb | Yes | '[]' |
| scheduled_date | timestamptz | Yes | |
| payment_method | text | No | 'ach' |
| bank_details | jsonb | Yes | |
| tax_withholding | jsonb | Yes | |
| processing | jsonb | Yes | |
| receipt_url | text | Yes | |
| internal_notes | jsonb | Yes | '[]' |
| audit_trail | jsonb | Yes | '[]' |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |
| membership_id | uuid | Yes | |

**Foreign Keys:**
- user_id → users.id
- membership_id → user_memberships.id

---

#### tax_forms
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| form_id | text | No | gen_random_uuid()::text |
| user_id | uuid | No | |
| form_type | text | No | |
| tax_year | int4 | No | |
| status | text | No | 'pending' |
| recipient_info | jsonb | No | '{}' |
| payer_info | jsonb | Yes | '{}' |
| income_details | jsonb | Yes | '{}' |
| w9_data | jsonb | Yes | '{}' |
| generation | jsonb | Yes | '{}' |
| delivery | jsonb | Yes | '{}' |
| irs_filing | jsonb | Yes | '{}' |
| corrections | jsonb | Yes | '[]' |
| notes | text | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

### Compliance & Security Tables

#### kyc_verification
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | |
| status | text | No | 'pending' |
| verification_method | text | Yes | |
| document_type | text | Yes | |
| document_number | text | Yes | |
| document_front_url | text | Yes | |
| document_back_url | text | Yes | |
| selfie_url | text | Yes | |
| verification_provider | text | Yes | |
| provider_verification_id | text | Yes | |
| verification_data | jsonb | Yes | '{}' |
| verified_at | timestamptz | Yes | |
| expires_at | timestamptz | Yes | |
| rejection_reason | text | Yes | |
| reviewer_id | int4 | Yes | |
| reviewer_notes | text | Yes | |
| risk_score | int4 | Yes | |
| risk_factors | jsonb | Yes | '[]' |
| ip_address | text | Yes | |
| user_agent | text | Yes | |
| geolocation | jsonb | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

#### transaction_monitoring
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| transaction_id | uuid | No | |
| user_id | uuid | No | |
| transaction_type | text | No | |
| amount | numeric | No | |
| currency | text | Yes | 'USD' |
| risk_level | text | No | 'low' |
| risk_score | int4 | Yes | |
| status | text | No | 'pending_review' |
| flags | jsonb | Yes | '[]' |
| aml_check | jsonb | Yes | '{}' |
| velocity_check | jsonb | Yes | '{}' |
| device_fingerprint | jsonb | Yes | '{}' |
| geographic_data | jsonb | Yes | '{}' |
| reviewer_id | int4 | Yes | |
| reviewer_notes | text | Yes | |
| reviewed_at | timestamptz | Yes | |
| action_taken | text | Yes | |
| sar_filed | bool | Yes | false |
| sar_filed_at | timestamptz | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

#### disputes
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| dispute_id | text | No | |
| payment_id | uuid | Yes | |
| user_id | uuid | No | |
| type | text | No | |
| status | text | No | 'needs_response' |
| reason | text | No | |
| amount | numeric | No | |
| currency | text | Yes | 'USD' |
| stripe_dispute_id | text | Yes | |
| customer_message | text | Yes | |
| respond_by | timestamptz | No | |
| evidence | jsonb | Yes | '{}' |
| assigned_to | int4 | Yes | |
| internal_notes | jsonb | Yes | '[]' |
| resolution | jsonb | Yes | |
| impact | jsonb | Yes | |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

### Admin & System Tables

#### admin
**Primary Key:** id (int4)
**RLS Enabled:** No
**Row Count:** 3

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | int4 | No | nextval('admin_id_seq') |
| updated_at | timestamptz | No | now() |
| created_at | timestamptz | No | now() |
| email | varchar | No | |
| reset_password_token | varchar | Yes | |
| reset_password_expiration | timestamptz | Yes | |
| salt | varchar | Yes | |
| hash | varchar | Yes | |
| login_attempts | numeric | Yes | 0 |
| lock_until | timestamptz | Yes | |
| role | text | No | 'Manager' |
| status | text | Yes | 'active' |
| name | text | Yes | |

---

#### admin_alerts
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 3

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| alert_id | text | No | gen_random_uuid()::text |
| title | text | No | |
| message | text | No | |
| severity | text | No | 'info' |
| category | text | No | |
| status | text | No | 'new' |
| related_entity | jsonb | Yes | |
| trigger_info | jsonb | Yes | |
| assigned_to | int4 | Yes | |
| acknowledged_by | int4 | Yes | |
| acknowledged_at | timestamptz | Yes | |
| resolved_by | int4 | Yes | |
| resolved_at | timestamptz | Yes | |
| resolution_notes | text | Yes | |
| notifications_sent | jsonb | Yes | '[]' |
| escalation | jsonb | Yes | |
| metadata | jsonb | Yes | '{}' |
| created_at | timestamptz | Yes | now() |
| updated_at | timestamptz | Yes | now() |

---

#### system_audit_logs
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 0

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | |
| admin_id | int4 | Yes | |
| entity_type | varchar | No | |
| entity_id | uuid | Yes | |
| action | varchar | No | |
| old_values | jsonb | Yes | |
| new_values | jsonb | Yes | |
| success | bool | No | |
| error_message | text | Yes | |
| ip_address | inet | Yes | |
| user_agent | text | Yes | |
| metadata | jsonb | Yes | '{}' |
| created_at | timestamptz | Yes | now() |

**Foreign Keys:**
- user_id → users.id

---

#### user_audit_logs
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Row Count:** 4542

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | Yes | |
| admin_id | int4 | Yes | |
| entity_type | varchar | No | |
| entity_id | uuid | Yes | |
| action | varchar | No | |
| old_values | jsonb | Yes | |
| new_values | jsonb | Yes | |
| success | bool | No | |
| error_message | text | Yes | |
| ip_address | inet | Yes | |
| user_agent | text | Yes | |
| metadata | jsonb | Yes | '{}' |
| created_at | timestamptz | Yes | now() |

---

### User Settings Tables

#### user_settings
**Primary Key:** id (uuid)
**RLS Enabled:** No
**Comment:** Main user settings table containing general preferences

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| user_id | uuid (unique) | |
| email_notifications | bool | true |
| sms_notifications | bool | false |
| push_notifications | bool | true |
| marketing_emails | bool | false |
| two_factor_auth | bool | false |
| two_factor_secret | text | |
| login_alerts | bool | true |
| session_timeout | int4 | 30 |
| profile_visibility | text | 'private' |
| data_sharing | bool | false |
| theme | text | 'light' |
| language | text | 'en' |
| auto_renewal | bool | true |
| payment_method | text | 'card' |
| billing_cycle | text | 'monthly' |
| timezone | text | 'UTC' |
| date_format | text | 'MM/DD/YYYY' |
| currency | text | 'USD' |

**Foreign Keys:**
- user_id → users.id

---

#### user_notification_preferences
**Primary Key:** id (uuid)
**Comment:** Detailed notification preferences for different types of alerts

Includes email, SMS, and push notification settings for:
- Payment reminders
- Tenure updates
- Security alerts
- System updates
- Newsletter

**Foreign Keys:**
- user_id → users.id

---

#### user_security_settings
**Primary Key:** id (uuid)
**Comment:** Security-related settings including 2FA and login preferences

Key fields:
- two_factor_enabled, two_factor_secret, two_factor_backup_codes
- login_alerts, session_timeout, max_concurrent_sessions
- password_last_changed, password_strength_score
- trusted_devices (jsonb)
- security_questions (jsonb)

**Foreign Keys:**
- user_id → users.id

---

#### user_payment_settings
**Primary Key:** id (uuid)
**Comment:** Payment method and billing preferences

**Foreign Keys:**
- user_id → users.id

---

#### user_privacy_settings
**Primary Key:** id (uuid)
**Comment:** Privacy and data sharing preferences

**Foreign Keys:**
- user_id → users.id

---

#### user_appearance_settings
**Primary Key:** id (uuid)
**Comment:** UI/UX appearance and localization preferences

**Foreign Keys:**
- user_id → users.id

---

### Authentication Tables (Better Auth)

#### session
**Primary Key:** id (text)
**Row Count:** 103

| Column | Type | Default |
|--------|------|---------|
| id | text | |
| expires_at | timestamp | |
| ip_address | text | |
| user_agent | text | |
| created_at | timestamp | now() |
| token | text (unique) | |
| updated_at | timestamp | |
| active_organization_id | text | |
| user_id | uuid | |

**Foreign Keys:**
- user_id → users.id

---

#### account
**Primary Key:** id (text)
**Row Count:** 19

| Column | Type |
|--------|------|
| id | text |
| account_id | text |
| provider_id | text |
| access_token | text |
| refresh_token | text |
| access_token_expires_at | timestamp |
| scope | text |
| id_token | text |
| refresh_token_expires_at | timestamp |
| password | text |
| user_id | uuid |

**Foreign Keys:**
- user_id → users.id

---

#### verification
**Primary Key:** id (text)
**Row Count:** 1

| Column | Type | Default |
|--------|------|---------|
| id | text | |
| identifier | text | |
| value | text | |
| expires_at | timestamp | |
| created_at | timestamp | now() |
| updated_at | timestamp | now() |

---

#### two_factor
**Primary Key:** id (text)

| Column | Type |
|--------|------|
| id | text |
| secret | text |
| backup_codes | text |
| user_id | uuid |

**Foreign Keys:**
- user_id → users.id

---

#### passkey
**Primary Key:** id (text)

| Column | Type | Default |
|--------|------|---------|
| id | text | |
| name | text | |
| public_key | text | |
| user_id | uuid | |
| webauthn_user_id | text | |
| counter | int4 | 0 |
| device_type | text | |
| backed_up | bool | false |
| transports | text | |
| created_at | timestamp | CURRENT_TIMESTAMP |
| credentialID | text | |

**Foreign Keys:**
- user_id → users.id

---

#### verification_codes
**Primary Key:** id (uuid)
**Row Count:** 0

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| email | varchar | |
| code | varchar | |
| link_token | varchar (unique) | |
| expires_at | timestamptz | |
| used | bool | false |
| user_id | uuid | |
| created_at | timestamptz | now() |

---

### Organization Tables

#### organization
**Primary Key:** id (uuid)
**Row Count:** 0

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| name | text | |
| slug | text (unique) | |
| logo | text | |
| metadata | text | |
| createdAt | timestamptz | now() |
| updatedAt | timestamptz | now() |

---

#### organization_member
**Primary Key:** id (uuid)
**Row Count:** 0

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| organizationId | uuid | |
| userId | uuid | |
| role | varchar | 'member' |
| createdAt | timestamptz | now() |

**Foreign Keys:**
- organizationId → organization.id
- userId → users.id

---

#### organization_invitation
**Primary Key:** id (uuid)
**Row Count:** 0

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| organizationId | uuid | |
| email | text | |
| role | varchar | 'member' |
| inviterId | uuid | |
| status | varchar | 'pending' |
| token | text (unique) | |
| expiresAt | timestamptz | |
| createdAt | timestamptz | now() |

**Foreign Keys:**
- organizationId → organization.id
- inviterId → users.id

---

### Payload CMS Tables

#### admin_sessions
**Primary Key:** id (varchar)
**Row Count:** 1

| Column | Type |
|--------|------|
| _order | int4 |
| _parent_id | int4 |
| id | varchar |
| created_at | timestamptz |
| expires_at | timestamptz |

---

#### payload_locked_documents
**Primary Key:** id (int4)
**Row Count:** 0

---

#### payload_preferences
**Primary Key:** id (int4)
**Row Count:** 30

| Column | Type | Default |
|--------|------|---------|
| id | int4 | nextval |
| key | varchar | |
| value | jsonb | |
| updated_at | timestamptz | now() |
| created_at | timestamptz | now() |

---

#### payload_migrations
**Primary Key:** id (int4)
**Row Count:** 1

| Column | Type | Default |
|--------|------|---------|
| id | int4 | nextval |
| name | varchar | |
| batch | numeric | |
| updated_at | timestamptz | now() |
| created_at | timestamptz | now() |

---

#### user_agreements
**Primary Key:** id (uuid)
**Row Count:** 8

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| user_id | uuid | |
| agreement_type | varchar | |
| version_number | varchar | |
| agreed_at | timestamptz | now() |
| ip_address | text | |
| user_agent | text | |
| document_url | text | |
| is_active | bool | true |
| created_at | timestamptz | now() |

**Foreign Keys:**
- user_id → users.id

---

## Materialized Views

### active_member_queue_view

This is the primary materialized view for managing the queue of members eligible for payouts.

**Unique Index:** idx_queue_matview_membership_id (membership_id)

**Key Columns:**
- membership_id, user_id, email
- subscription_id, subscription_status
- tenure_start_date, last_payment_date
- total_successful_payments, lifetime_payment_total
- has_received_payout
- queue_position (calculated via ROW_NUMBER)
- is_eligible, meets_time_requirement
- calculated_at (timestamp)

**Definition:**
```sql
SELECT
    um.id AS membership_id,
    u.id AS user_id,
    u.email,
    u.created_at AS user_created_at,
    up.first_name,
    up.last_name,
    up.middle_name,
    concat_ws(' ', up.first_name, up.middle_name, up.last_name) AS full_name,
    s.id AS subscription_id,
    s.status AS subscription_status,
    s.provider_subscription_id,
    um.join_date,
    um.verification_status,
    min(p.created_at) AS tenure_start_date,
    max(p.created_at) AS last_payment_date,
    count(p.id) FILTER (WHERE p.status = 'succeeded') AS total_successful_payments,
    COALESCE(sum(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) AS lifetime_payment_total,
    EXISTS (
        SELECT 1 FROM payout_management pm
        WHERE pm.membership_id = um.id AND pm.status = 'completed'
    ) AS has_received_payout,
    row_number() OVER (ORDER BY min(p.created_at), um.id) AS queue_position,
    (s.status = 'active') AS is_eligible,
    (count(p.id) FILTER (WHERE p.status = 'succeeded') >= 12) AS meets_time_requirement,
    now() AS calculated_at
FROM user_memberships um
JOIN users u ON u.id = um.user_id
JOIN user_subscriptions s ON s.id = um.subscription_id
JOIN user_payments p ON p.subscription_id = s.id
LEFT JOIN user_profiles up ON up.user_id = u.id
WHERE
    s.status = 'active'
    AND p.status = 'succeeded'
    AND p.amount > 0
    AND NOT EXISTS (
        SELECT 1 FROM payout_management pm
        WHERE pm.membership_id = um.id AND pm.status = 'completed'
    )
GROUP BY um.id, u.id, u.email, u.created_at, up.first_name, up.last_name,
         up.middle_name, s.id, s.status, s.provider_subscription_id,
         um.join_date, um.verification_status
ORDER BY min(p.created_at), um.id;
```

---

## Functions

### Public Schema Functions

#### assign_queue_position()
**Returns:** trigger
**Volatility:** VOLATILE

Automatically assigns queue positions for new members in membership_queue.

```sql
BEGIN
    IF NEW.queue_position IS NULL THEN
        SELECT COALESCE(MAX(queue_position), 0) + 1
        INTO NEW.queue_position
        FROM membership_queue;
    END IF;
    RETURN NEW;
END;
```

---

#### cleanup_expired_signup_sessions()
**Returns:** void

Removes expired signup sessions.

---

#### cleanup_expired_verification_codes()
**Returns:** void

Removes expired verification codes.

---

#### exec_sql(sql_query text)
**Returns:** text
**Security:** DEFINER

Executes arbitrary SQL (admin function).

---

#### get_queue_statistics()
**Returns:** TABLE
**Volatility:** STABLE

Returns aggregate statistics about the queue:
- total_members, eligible_members, members_meeting_time_req
- total_revenue, oldest_member_date, newest_member_date
- potential_winners

```sql
RETURN QUERY
SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE is_eligible = true)::BIGINT,
    COUNT(*) FILTER (WHERE meets_time_requirement = true)::BIGINT,
    COALESCE(SUM(lifetime_payment_total), 0)::NUMERIC,
    MIN(tenure_start_date),
    MAX(tenure_start_date),
    LEAST(
        FLOOR(COALESCE(SUM(lifetime_payment_total), 0) / 100000)::INTEGER,
        COUNT(*) FILTER (WHERE is_eligible = true)::INTEGER
    )
FROM active_member_queue_view;
```

---

#### get_user_queue_position(p_user_id uuid)
**Returns:** TABLE
**Volatility:** STABLE

Gets a specific user's queue information.

```sql
RETURN QUERY
SELECT
    v.membership_id,
    v.user_id,
    v.queue_position,
    v.tenure_start_date,
    v.total_successful_payments,
    v.lifetime_payment_total,
    v.is_eligible
FROM active_member_queue_view v
WHERE v.user_id = p_user_id
ORDER BY v.queue_position;
```

---

#### handle_new_user()
**Returns:** trigger
**Security:** DEFINER

Trigger function that creates related records when a new auth user is created:
1. Creates user record
2. Creates user_profile
3. Creates user_contacts (if phone provided)
4. Creates user_addresses (if address provided)
5. Creates user_memberships record

---

#### notify_queue_refresh()
**Returns:** trigger

Sends pg_notify for queue refresh events.

---

#### refresh_active_member_queue()
**Returns:** TABLE (status, rows_refreshed, refresh_duration, last_calculated)

Refreshes the materialized view with CONCURRENTLY option.

---

#### refresh_active_member_queue_fast()
**Returns:** TABLE (status, rows_refreshed, refresh_duration)

Refreshes the materialized view without CONCURRENTLY (faster but locks).

---

#### update_updated_at_column()
**Returns:** trigger

Standard trigger to update updated_at timestamps.

---

### Auth Schema Functions

#### auth.email()
**Returns:** text
**Volatility:** STABLE

Gets email from JWT claims.

---

#### auth.jwt()
**Returns:** jsonb
**Volatility:** STABLE

Gets full JWT claims.

---

#### auth.role()
**Returns:** text
**Volatility:** STABLE

Gets role from JWT claims.

---

#### auth.uid()
**Returns:** uuid
**Volatility:** STABLE

Gets user ID from JWT claims.

---

## Triggers

### Queue Management Triggers

1. **auto_assign_queue_position** (membership_queue)
   - Timing: BEFORE INSERT
   - Function: assign_queue_position()

2. **update_membership_queue_updated_at** (membership_queue)
   - Timing: BEFORE UPDATE
   - Function: update_updated_at_column()

---

### Notification Triggers

1. **payout_completion_notify** (payout_management)
   - Timing: AFTER INSERT OR UPDATE
   - Condition: new.status = 'completed'
   - Function: notify_queue_refresh()

2. **subscription_status_notify** (user_subscriptions)
   - Timing: AFTER UPDATE
   - Condition: old.status IS DISTINCT FROM new.status
   - Function: notify_queue_refresh()

---

### Updated_at Triggers

Automatic updated_at timestamp updates on:
- user_addresses
- user_appearance_settings
- user_billing_schedules
- user_contacts
- user_memberships
- user_notification_preferences
- user_payment_methods
- user_payment_settings
- user_payments
- user_privacy_settings
- user_profiles
- user_security_settings
- user_settings
- user_subscriptions
- users

---

## Indexes

### Performance Indexes

**Queue View Indexes:**
- idx_queue_matview_membership_id (UNIQUE on membership_id)
- idx_queue_matview_position (queue_position)
- idx_queue_matview_eligible (is_eligible, queue_position)
- idx_queue_matview_user_id (user_id)
- idx_queue_matview_tenure (tenure_start_date)

**User Indexes:**
- idx_users_email (email)
- idx_users_email_verified (email_verified)
- idx_users_name (name)
- idx_users_two_factor (two_factor_enabled)
- idx_users_updated_at (updated_at)

**Payment Indexes:**
- idx_user_payments_user_id (user_id)
- idx_user_payments_subscription_id (subscription_id)
- idx_user_payments_status (status)
- idx_user_payments_date (payment_date)
- idx_user_payments_user_status_date (user_id, status, created_at) WHERE status = 'succeeded' AND amount > 0
- idx_user_payments_created_at_status (created_at, status) WHERE status = 'succeeded'

**Subscription Indexes:**
- idx_user_subscriptions_user_id (user_id)
- idx_user_subscriptions_provider_id (provider_subscription_id)
- idx_user_subscriptions_status (status)
- idx_user_subscriptions_status_active (status) WHERE status = 'active'

**Membership Indexes:**
- idx_user_memberships_user_id (user_id)
- idx_user_memberships_subscription_id (subscription_id)
- idx_user_memberships_join_date (join_date)

**Audit Log Indexes:**
- idx_user_audit_logs_user_id (user_id)
- idx_user_audit_logs_entity_type (entity_type)
- idx_user_audit_logs_action (action)
- idx_user_audit_logs_created_at (created_at)
- idx_system_audit_logs_* (similar pattern)

**Payout Indexes:**
- idx_payout_management_user_id (user_id)
- idx_payout_management_status (status)
- idx_payout_management_membership_id (membership_id)
- idx_payout_management_user_status (user_id, status) WHERE status = 'completed'

---

## Sequences

| Sequence | Start | Min | Max | Increment | Last Value |
|----------|-------|-----|-----|-----------|------------|
| admin_id_seq | 1 | 1 | 2147483647 | 1 | 3 |
| payload_locked_documents_id_seq | 1 | 1 | 2147483647 | 1 | null |
| payload_locked_documents_rels_id_seq | 1 | 1 | 2147483647 | 1 | null |
| payload_migrations_id_seq | 1 | 1 | 2147483647 | 1 | 1 |
| payload_preferences_id_seq | 1 | 1 | 2147483647 | 1 | 30 |
| payload_preferences_rels_id_seq | 1 | 1 | 2147483647 | 1 | 139 |

---

## Enum Types

### enum_users_status
Values: Active, Inactive, Suspended, Pending

### enum_user_memberships_verification_status
Values: PENDING, VERIFIED, FAILED, SKIPPED

### enum_user_subscriptions_status
Values: active, past_due, canceled, incomplete, trialing, unpaid

### enum_user_payments_status
Values: succeeded, pending, failed, refunded, canceled

### better_auth_invitation_status
Values: pending, accepted, declined, expired

### dispute_type
Values: charge_dispute, fraudulent, duplicate, product_not_received, product_unacceptable, subscription_canceled, unrecognized, other

### kyc_verification_status
Values: pending, in_review, verified, rejected, expired

### member_status
Values: UNVERIFIED, PROSPECT, ACTIVE, PENDING

### payout_status
Values: pending_approval, approved, scheduled, processing, completed, failed, cancelled

### signup_session_status
Values: active, completed, expired

### transaction_risk_level
Values: low, medium, high, critical

---

## RLS Policies

**Note:** No Row Level Security (RLS) policies are currently configured on any tables in the public schema.

---

## Notes

1. **Materialized View Refresh:** The `active_member_queue_view` should be refreshed regularly using either:
   - `refresh_active_member_queue()` (concurrent, slower but non-blocking)
   - `refresh_active_member_queue_fast()` (faster but locks view)

2. **Queue Position Logic:** Queue positions are automatically assigned and calculated based on tenure_start_date (earliest payment date) and membership creation order.

3. **Payout Eligibility:** Determined by:
   - Active subscription status
   - Minimum 12 successful payments
   - No prior completed payout

4. **Security:** Most authentication and session management is handled by Better Auth library integration.

5. **Audit Trail:** Comprehensive logging through user_audit_logs and system_audit_logs tables.

---

**End of Schema Export**
