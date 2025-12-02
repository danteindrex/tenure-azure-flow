/**
 * Financial Schema - Subscriptions & Payments
 *
 * These tables map EXACTLY to your existing database structure.
 * All column names, types, and constraints match the live database.
 *
 * Tables:
 * - user_payment_methods: Stored payment methods (Stripe)
 * - user_subscriptions: Active subscriptions
 * - user_payments: Payment history
 * - user_billing_schedules: Billing schedules
 * - user_agreements: Terms & conditions
 */

import { pgTable, uuid, text, varchar, boolean, timestamp, decimal, integer, jsonb, index, unique, char } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { user } from './auth'

// ============================================================================
// 1. USER PAYMENT METHODS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userPaymentMethods = pgTable('user_payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull().default('stripe'),
  methodType: varchar('method_type', { length: 20 }).notNull(), // 'card', 'bank_account', 'paypal'
  methodSubtype: varchar('method_subtype', { length: 20 }), // 'visa', 'mastercard', etc.
  providerPaymentMethodId: text('provider_payment_method_id'),
  lastFour: varchar('last_four', { length: 4 }),
  brand: varchar('brand', { length: 20 }),
  expiresMonth: integer('expires_month'),
  expiresYear: integer('expires_year'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_payment_methods_user_id').on(table.userId),
  defaultIdx: index('idx_user_payment_methods_default').on(table.userId, table.isDefault),
  activeIdx: index('idx_user_payment_methods_active').on(table.userId, table.isActive),
  uniqueProviderMethod: unique('user_payment_methods_user_id_provider_payment_method_id_key').on(
    table.userId,
    table.providerPaymentMethodId
  )
}))

// ============================================================================
// 2. USER SUBSCRIPTIONS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull().default('stripe'),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }).notNull(),
  providerCustomerId: varchar('provider_customer_id', { length: 255 }).notNull(),

  // Subscription status - references subscription_statuses lookup table
  // 1 = Active, 2 = Trialing, 3 = Past Due, 4 = Canceled, 5 = Incomplete, 6 = Unpaid
  subscriptionStatusId: integer('subscription_status_id').notNull(),

  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_subscriptions_user_id').on(table.userId),
  providerIdIdx: index('idx_user_subscriptions_provider_id').on(table.providerSubscriptionId),
  statusIdx: index('idx_user_subscriptions_subscription_status_id').on(table.subscriptionStatusId)
}))

// ============================================================================
// 3. USER PAYMENTS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userPayments = pgTable('user_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id'),
  paymentMethodId: uuid('payment_method_id'),
  provider: varchar('provider', { length: 20 }).notNull().default('stripe'),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }),
  providerInvoiceId: varchar('provider_invoice_id', { length: 255 }),
  providerChargeId: varchar('provider_charge_id', { length: 255 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).default('USD'),
  paymentType: varchar('payment_type', { length: 20 }).notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),

  // Payment status - references payment_statuses lookup table
  // 1 = Pending, 2 = Succeeded, 3 = Failed, 4 = Refunded, 5 = Canceled
  paymentStatusId: integer('payment_status_id').notNull(),

  isFirstPayment: boolean('is_first_payment').default(false),
  failureReason: text('failure_reason'),
  receiptUrl: text('receipt_url'),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_payments_user_id').on(table.userId),
  subscriptionIdIdx: index('idx_user_payments_subscription_id').on(table.subscriptionId),
  dateIdx: index('idx_user_payments_date').on(table.paymentDate),
  statusIdx: index('idx_user_payments_payment_status_id').on(table.paymentStatusId)
}))

// ============================================================================
// 4. USER BILLING SCHEDULES (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userBillingSchedules = pgTable('user_billing_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => userSubscriptions.id, { onDelete: 'cascade' }),
  billingCycle: varchar('billing_cycle', { length: 20 }).default('MONTHLY'), // 'MONTHLY', 'QUARTERLY', 'YEARLY'
  nextBillingDate: timestamp('next_billing_date', { mode: 'date' }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  currency: char('currency', { length: 3 }).default('USD'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_billing_schedules_user_id').on(table.userId),
  nextBillingIdx: index('idx_user_billing_schedules_next_billing').on(table.nextBillingDate)
}))

// ============================================================================
// 5. USER AGREEMENTS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userAgreements = pgTable('user_agreements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  agreementType: varchar('agreement_type', { length: 50 }).notNull(), // 'terms_of_service', 'privacy_policy', etc.
  versionNumber: varchar('version_number', { length: 20 }).notNull(),
  agreedAt: timestamp('agreed_at', { withTimezone: true }).defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  documentUrl: text('document_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_agreements_user_id').on(table.userId),
  typeIdx: index('idx_user_agreements_type').on(table.agreementType),
  uniqueAgreement: unique('user_agreements_user_id_agreement_type_version_number_key').on(
    table.userId,
    table.agreementType,
    table.versionNumber
  )
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const userPaymentMethodsRelations = relations(userPaymentMethods, ({ one, many }) => ({
  user: one(user, {
    fields: [userPaymentMethods.userId],
    references: [user.id]
  }),
  payments: many(userPayments)
}))

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
  user: one(user, {
    fields: [userSubscriptions.userId],
    references: [user.id]
  }),
  payments: many(userPayments),
  billingSchedules: many(userBillingSchedules)
}))

export const userPaymentsRelations = relations(userPayments, ({ one }) => ({
  user: one(user, {
    fields: [userPayments.userId],
    references: [user.id]
  }),
  subscription: one(userSubscriptions, {
    fields: [userPayments.subscriptionId],
    references: [userSubscriptions.id]
  }),
  paymentMethod: one(userPaymentMethods, {
    fields: [userPayments.paymentMethodId],
    references: [userPaymentMethods.id]
  })
}))

export const userBillingSchedulesRelations = relations(userBillingSchedules, ({ one }) => ({
  user: one(user, {
    fields: [userBillingSchedules.userId],
    references: [user.id]
  }),
  subscription: one(userSubscriptions, {
    fields: [userBillingSchedules.subscriptionId],
    references: [userSubscriptions.id]
  })
}))

export const userAgreementsRelations = relations(userAgreements, ({ one }) => ({
  user: one(user, {
    fields: [userAgreements.userId],
    references: [user.id]
  })
}))
