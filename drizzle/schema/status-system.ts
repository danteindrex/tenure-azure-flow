/**
 * Access Control System Schema
 *
 * This schema defines the access control tables for route protection.
 * Status lookups use individual lookup tables (e.g., member_eligibility_statuses)
 * with integer FK references.
 *
 * Architecture:
 * - access_control_rules: Conditions for accessing routes/features (uses status ID arrays)
 * - protected_routes: Maps routes to access control rules
 * - feature_access: Feature-level access control
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// =====================================================
// ACCESS CONTROL RULES
// =====================================================

export const accessControlRules = pgTable('access_control_rules', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),

  // Status conditions (arrays of status_value IDs)
  userStatusIds: integer('user_status_ids').array().default(sql`'{}'::integer[]`),
  memberStatusIds: integer('member_status_ids').array().default(sql`'{}'::integer[]`),
  subscriptionStatusIds: integer('subscription_status_ids').array().default(sql`'{}'::integer[]`),
  kycStatusIds: integer('kyc_status_ids').array().default(sql`'{}'::integer[]`),

  // Additional boolean conditions
  requiresEmailVerified: boolean('requires_email_verified').default(false),
  requiresPhoneVerified: boolean('requires_phone_verified').default(false),
  requiresProfileComplete: boolean('requires_profile_complete').default(false),
  requiresActiveSubscription: boolean('requires_active_subscription').default(false),

  // Condition logic
  conditionLogic: varchar('condition_logic', { length: 10 }).default('all'), // 'all' = AND, 'any' = OR

  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  activeIdx: index('idx_access_rules_active').on(table.isActive, table.priority),
}))

export const accessControlRulesRelations = relations(accessControlRules, ({ many }) => ({
  protectedRoutes: many(protectedRoutes),
  featureAccess: many(featureAccess),
}))

// =====================================================
// PROTECTED ROUTES
// =====================================================

export const protectedRoutes = pgTable('protected_routes', {
  id: serial('id').primaryKey(),
  routePattern: varchar('route_pattern', { length: 255 }).notNull().unique(),
  routeName: varchar('route_name', { length: 100 }),

  // Access control
  accessRuleId: integer('access_rule_id').references(() => accessControlRules.id, { onDelete: 'set null' }),

  // Redirect behavior
  redirectRoute: varchar('redirect_route', { length: 255 }).default('/login'),
  showErrorMessage: boolean('show_error_message').default(false),
  errorMessage: text('error_message'),

  // Route metadata
  requiresAuth: boolean('requires_auth').default(true),
  isPublic: boolean('is_public').default(false),

  // Onboarding step configuration (admin-configurable)
  stepOrder: integer('step_order'),
  stepName: varchar('step_name', { length: 50 }),
  isOnboardingStep: boolean('is_onboarding_step').default(false),

  // Conditions for this step (null = don't check, true = must be true, false = must be false)
  checkEmailVerified: boolean('check_email_verified'),
  checkPhoneVerified: boolean('check_phone_verified'),
  checkProfileComplete: boolean('check_profile_complete'),
  checkSubscriptionActive: boolean('check_subscription_active'),
  checkMemberStatus: varchar('check_member_status', { length: 50 }), // e.g., 'Suspended'

  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  patternIdx: index('idx_protected_routes_pattern').on(table.routePattern),
  activeIdx: index('idx_protected_routes_active').on(table.isActive, table.priority),
  onboardingIdx: index('idx_protected_routes_onboarding').on(table.isOnboardingStep, table.stepOrder),
}))

export const protectedRoutesRelations = relations(protectedRoutes, ({ one }) => ({
  accessRule: one(accessControlRules, {
    fields: [protectedRoutes.accessRuleId],
    references: [accessControlRules.id],
  }),
}))

// =====================================================
// FEATURE ACCESS
// =====================================================

export const featureAccess = pgTable('feature_access', {
  id: serial('id').primaryKey(),
  featureCode: varchar('feature_code', { length: 100 }).unique().notNull(),
  featureName: varchar('feature_name', { length: 100 }).notNull(),
  description: text('description'),

  // Access control
  accessRuleId: integer('access_rule_id').references(() => accessControlRules.id, { onDelete: 'set null' }),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex('idx_feature_access_code').on(table.featureCode),
}))

export const featureAccessRelations = relations(featureAccess, ({ one }) => ({
  accessRule: one(accessControlRules, {
    fields: [featureAccess.accessRuleId],
    references: [accessControlRules.id],
  }),
}))

// =====================================================
// TYPE EXPORTS
// =====================================================

export type AccessControlRule = typeof accessControlRules.$inferSelect
export type NewAccessControlRule = typeof accessControlRules.$inferInsert

export type ProtectedRoute = typeof protectedRoutes.$inferSelect
export type NewProtectedRoute = typeof protectedRoutes.$inferInsert

export type FeatureAccess = typeof featureAccess.$inferSelect
export type NewFeatureAccess = typeof featureAccess.$inferInsert

// =====================================================
// STATUS ID CONSTANTS
// =====================================================
// Re-export from src/lib/status-ids.ts for convenience
export {
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
  // Types
  type UserStatusId,
  type MemberStatusId,
  type SubscriptionStatusId,
  type PaymentStatusId,
  type KycStatusId,
  type PayoutStatusId,
  type VerificationStatusId,
  type AdminStatusId,
  type QueueEntryStatusId,
  type BillingScheduleStatusId,
  type DisputeStatusId,
  type TransactionStatusId,
  type AdminAlertStatusId,
  type TaxFormStatusId,
  type PostStatusId,
  type AuditLogStatusId,
  type SignupSessionStatusId,
  type TransactionMonitoringStatusId,
} from '../../src/lib/status-ids'
