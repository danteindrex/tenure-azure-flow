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
 */

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================
export {
  user,
  session,
  account,
  verification,
  passkey,
  twoFactor,
  userRelations,
  sessionRelations,
  accountRelations,
  passkeyRelations,
  twoFactorRelations
} from './auth'

// ============================================================================
// CORE USER TABLES
// ============================================================================
export {
  users,
  userProfiles,
  userContacts,
  userAddresses,
  userMemberships,
  usersRelations,
  userProfilesRelations,
  userContactsRelations,
  userAddressesRelations,
  userMembershipsRelations
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
  userAppearanceSettings,
  userSettingsRelations,
  userNotificationPreferencesRelations,
  userSecuritySettingsRelations,
  userPaymentSettingsRelations,
  userPrivacySettingsRelations,
  userAppearanceSettingsRelations
} from './settings'

// ============================================================================
// FINANCIAL TABLES
// ============================================================================
export {
  userPaymentMethods,
  userSubscriptions,
  userPayments,
  userBillingSchedules,
  userAgreements,
  userPaymentMethodsRelations,
  userSubscriptionsRelations,
  userPaymentsRelations,
  userBillingSchedulesRelations,
  userAgreementsRelations
} from './financial'

// ============================================================================
// MEMBERSHIP TABLES
// ============================================================================
export {
  membershipQueue,
  kycVerification,
  payoutManagement,
  disputes,
  membershipQueueRelations,
  kycVerificationRelations,
  payoutManagementRelations,
  disputesRelations
} from './membership'

// ============================================================================
// COMPLIANCE TABLES
// ============================================================================
export {
  taxForms,
  transactionMonitoring,
  verificationCodes,
  taxFormsRelations,
  transactionMonitoringRelations,
  verificationCodesRelations
} from './compliance'

// ============================================================================
// AUDIT TABLES
// ============================================================================
export {
  systemAuditLogs,
  userAuditLogs,
  systemAuditLogsRelations,
  userAuditLogsRelations
} from './audit'

// ============================================================================
// ORGANIZATION TABLES (BETTER AUTH)
// ============================================================================
export {
  organization,
  organizationMember,
  organizationInvitation,
  organizationRelations,
  organizationMemberRelations,
  organizationInvitationRelations
} from './organizations'
