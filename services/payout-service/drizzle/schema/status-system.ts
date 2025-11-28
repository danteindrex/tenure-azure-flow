/**
 * Status Lookup System Schema
 *
 * This schema defines the unified status lookup tables that replace
 * hardcoded ENUMs with admin-configurable statuses.
 *
 * Architecture:
 * - status_categories: Groups of related statuses (e.g., 'user_funnel', 'member_eligibility')
 * - status_values: Individual status options within each category
 * - status_transitions: Valid state transitions between statuses
 * - access_control_rules: Conditions for accessing routes/features
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
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// =====================================================
// STATUS CATEGORIES
// =====================================================

export const statusCategories = pgTable('status_categories', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  tableName: varchar('table_name', { length: 100 }),
  columnName: varchar('column_name', { length: 100 }),
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex('idx_status_categories_code').on(table.code),
}))

export const statusCategoriesRelations = relations(statusCategories, ({ many }) => ({
  values: many(statusValues),
  transitions: many(statusTransitions),
}))

// =====================================================
// STATUS VALUES
// =====================================================

export const statusValues = pgTable('status_values', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => statusCategories.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 20 }).default('#6B7280'),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
  isDefault: boolean('is_default').default(false),
  isTerminal: boolean('is_terminal').default(false),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  categoryCodeIdx: uniqueIndex('idx_status_values_category_code').on(table.categoryId, table.code),
  categoryIdx: index('idx_status_values_category').on(table.categoryId),
  codeIdx: index('idx_status_values_code').on(table.code),
  activeIdx: index('idx_status_values_active').on(table.isActive),
}))

export const statusValuesRelations = relations(statusValues, ({ one, many }) => ({
  category: one(statusCategories, {
    fields: [statusValues.categoryId],
    references: [statusCategories.id],
  }),
  transitionsFrom: many(statusTransitions, { relationName: 'fromStatus' }),
  transitionsTo: many(statusTransitions, { relationName: 'toStatus' }),
}))

// =====================================================
// STATUS TRANSITIONS
// =====================================================

export const statusTransitions = pgTable('status_transitions', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => statusCategories.id, { onDelete: 'cascade' }),
  fromStatusId: integer('from_status_id').references(() => statusValues.id, { onDelete: 'cascade' }),
  toStatusId: integer('to_status_id').notNull().references(() => statusValues.id, { onDelete: 'cascade' }),
  requiresAdmin: boolean('requires_admin').default(false),
  requiresReason: boolean('requires_reason').default(false),
  autoTrigger: varchar('auto_trigger', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  categoryIdx: index('idx_status_transitions_category').on(table.categoryId),
  fromIdx: index('idx_status_transitions_from').on(table.fromStatusId),
  toIdx: index('idx_status_transitions_to').on(table.toStatusId),
  uniqueTransition: uniqueIndex('idx_status_transitions_unique').on(
    table.categoryId,
    table.fromStatusId,
    table.toStatusId
  ),
}))

export const statusTransitionsRelations = relations(statusTransitions, ({ one }) => ({
  category: one(statusCategories, {
    fields: [statusTransitions.categoryId],
    references: [statusCategories.id],
  }),
  fromStatus: one(statusValues, {
    fields: [statusTransitions.fromStatusId],
    references: [statusValues.id],
    relationName: 'fromStatus',
  }),
  toStatus: one(statusValues, {
    fields: [statusTransitions.toStatusId],
    references: [statusValues.id],
    relationName: 'toStatus',
  }),
}))

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
  routePattern: varchar('route_pattern', { length: 255 }).notNull(),
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

  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  patternIdx: index('idx_protected_routes_pattern').on(table.routePattern),
  activeIdx: index('idx_protected_routes_active').on(table.isActive, table.priority),
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

export type StatusCategory = typeof statusCategories.$inferSelect
export type NewStatusCategory = typeof statusCategories.$inferInsert

export type StatusValue = typeof statusValues.$inferSelect
export type NewStatusValue = typeof statusValues.$inferInsert

export type StatusTransition = typeof statusTransitions.$inferSelect
export type NewStatusTransition = typeof statusTransitions.$inferInsert

export type AccessControlRule = typeof accessControlRules.$inferSelect
export type NewAccessControlRule = typeof accessControlRules.$inferInsert

export type ProtectedRoute = typeof protectedRoutes.$inferSelect
export type NewProtectedRoute = typeof protectedRoutes.$inferInsert

export type FeatureAccess = typeof featureAccess.$inferSelect
export type NewFeatureAccess = typeof featureAccess.$inferInsert

// =====================================================
// STATUS CATEGORY CODES (for type safety)
// =====================================================

export const STATUS_CATEGORIES = {
  USER_FUNNEL: 'user_funnel',
  MEMBER_ELIGIBILITY: 'member_eligibility',
  KYC_STATUS: 'kyc_status',
  VERIFICATION_STATUS: 'verification_status',
  SUBSCRIPTION_STATUS: 'subscription_status',
  PAYMENT_STATUS: 'payment_status',
  PAYOUT_STATUS: 'payout_status',
  ADMIN_STATUS: 'admin_status',
  ADMIN_ROLE: 'admin_role',
} as const

export type StatusCategoryCode = typeof STATUS_CATEGORIES[keyof typeof STATUS_CATEGORIES]

// =====================================================
// STATUS CODES (for type safety in code)
// =====================================================

export const USER_FUNNEL_STATUS = {
  PENDING: 'pending',
  ONBOARDED: 'onboarded',
  SUSPENDED: 'suspended',
} as const

export const MEMBER_ELIGIBILITY_STATUS = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  WON: 'won',
  PAID: 'paid',
} as const

export const KYC_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  UNPAID: 'unpaid',
} as const

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELED: 'canceled',
} as const

export const PAYOUT_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  SCHEDULED: 'scheduled',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const
