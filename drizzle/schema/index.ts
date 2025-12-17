/**
 * Drizzle Schema - Index File
 *
 * This file exports all schema definitions for use with Drizzle ORM.
 * It provides a single import point for all database tables and relations.
 *
 * Schema Organization:
 * - auth.ts: Better Auth tables (user, session, account, verification, passkey, two_factor)
 * - users.ts: Core user tables (users, user_profiles, user_contacts, user_addresses, user_memberships)
 * - settings.ts: User settings tables (6 tables for preferences)
 * - financial.ts: Financial tables (payment_methods, subscriptions, payments, billing_schedules, agreements)
 * - membership.ts: Membership management (membership_queue, kyc_verification, payout_management, disputes)
 * - compliance.ts: Compliance tables (tax_forms, transaction_monitoring, verification_codes)
 * - audit.ts: Audit logs (system_audit_logs, user_audit_logs)
 * - organizations.ts: Organization management (organization, organization_member, organization_invitation)
 * - admin.ts: Admin users and Payload CMS tables (admin, admin_sessions, admin_alerts, payload_*)
 * - content.ts: Content tables (newsfeedposts)
 */

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================
export {
  user,
  session,
  account,
  verification,
  twoFactor,
  passkey,
  organization
} from './auth'

// Backward compatibility: export 'user' as 'users' for legacy code
export { user as users } from './auth'

// ============================================================================
// CORE USER TABLES
// ============================================================================
export {
  userProfiles,
  userContacts,
  userAddresses,
  userMemberships
} from './users'

// ============================================================================
// USER SETTINGS TABLES
// ============================================================================
export {
  userSettings,
  userNotificationPreferences,
  userSecuritySettings,
  userPaymentSettings,
  userPrivacySettings,
  userAppearanceSettings
} from './settings'

// ============================================================================
// FINANCIAL TABLES
// ============================================================================
export {
  userPaymentMethods,
  userSubscriptions,
  userPayments,
  userBillingSchedules,
  userAgreements
} from './financial'

// ============================================================================
// MEMBERSHIP TABLES
// ============================================================================
export {
  membershipQueue,
  kycVerification,
  payoutManagement,
  disputes
} from './membership'

// ============================================================================
// COMPLIANCE TABLES
// ============================================================================
export {
  taxForms,
  transactionMonitoring,
  verificationCodes
} from './compliance'

// ============================================================================
// AUDIT TABLES
// ============================================================================
export {
  systemAuditLogs,
  userAuditLogs
} from './audit'

// ============================================================================
// ORGANIZATION TABLES (BETTER AUTH) - Now exported from auth.ts
// ============================================================================

// ============================================================================
// ADMIN & PAYLOAD CMS TABLES
// ============================================================================
export {
  admin,
  adminSessions,
  adminAlerts,
  payloadMigrations,
  payloadPreferences,
  payloadPreferencesRels,
  payloadLockedDocuments,
  payloadLockedDocumentsRels
} from './admin'

// ============================================================================
// NOTIFICATIONS TABLES
// ============================================================================
export {
  notifications
} from './notifications'

// ============================================================================
// CONTENT TABLES
// ============================================================================
export {
  newsfeedPosts,
  type NewsfeedPost,
  type NewsfeedPostInsert
} from './content'

// ============================================================================
// ACCESS CONTROL TABLES
// ============================================================================
export {
  accessControlRules,
  protectedRoutes,
  featureAccess,
  // Relations
  accessControlRulesRelations,
  protectedRoutesRelations,
  featureAccessRelations,
  // Types
  type AccessControlRule,
  type NewAccessControlRule,
  type ProtectedRoute,
  type NewProtectedRoute,
  type FeatureAccess,
  type NewFeatureAccess,
  // Status ID constants
  USER_STATUS,
  MEMBER_STATUS,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  KYC_STATUS,
  PAYOUT_STATUS,
  VERIFICATION_STATUS,
  ADMIN_STATUS,
  QUEUE_ENTRY_STATUS,
  BILLING_SCHEDULE_STATUS,
  DISPUTE_STATUS,
  TRANSACTION_STATUS,
  ADMIN_ALERT_STATUS,
  TAX_FORM_STATUS,
  POST_STATUS,
  AUDIT_LOG_STATUS,
  SIGNUP_SESSION_STATUS,
  TRANSACTION_MONITORING_STATUS,
  // Helper functions
  isUserOnboarded,
  isMemberActive,
  isMemberEligibleForQueue,
  hasMemberWonOrPaid,
  isSubscriptionActive,
  isPaymentSuccessful,
  isKycVerified,
  isPayoutCompleted,
  // Stripe mapping functions
  mapStripeSubscriptionStatus,
  mapStripePaymentStatus,
} from './status-system'
