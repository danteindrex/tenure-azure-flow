/**
 * Compliance Schema - Tax Forms & Transaction Monitoring
 *
 * These tables map EXACTLY to your existing database structure.
 * All column names, types, and constraints match the live database.
 *
 * Tables:
 * - tax_forms: Tax documentation (1099s, W-9s, etc.)
 * - transaction_monitoring: Transaction monitoring for compliance
 * - verification_codes: Email/SMS verification codes
 */

import { pgTable, uuid, text, varchar, boolean, timestamp, decimal, integer, jsonb, index } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'

// ============================================================================
// 1. TAX FORMS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const taxForms = pgTable('tax_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: text('form_id').notNull().default(sql`(gen_random_uuid())::text`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  formType: text('form_type').notNull(),
  taxYear: integer('tax_year').notNull(),
  status: text('status').notNull().default('pending'),
  recipientInfo: jsonb('recipient_info').notNull().default(sql`'{}'::jsonb`),
  payerInfo: jsonb('payer_info').default(sql`'{}'::jsonb`),
  incomeDetails: jsonb('income_details').default(sql`'{}'::jsonb`),
  w9Data: jsonb('w9_data').default(sql`'{}'::jsonb`),
  generation: jsonb('generation').default(sql`'{}'::jsonb`),
  delivery: jsonb('delivery').default(sql`'{}'::jsonb`),
  irsFiling: jsonb('irs_filing').default(sql`'{}'::jsonb`),
  corrections: jsonb('corrections').default(sql`'[]'::jsonb`),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_tax_forms_user_id').on(table.userId),
  statusIdx: index('idx_tax_forms_status').on(table.status),
  taxYearIdx: index('idx_tax_forms_tax_year').on(table.taxYear),
  formTypeIdx: index('idx_tax_forms_form_type').on(table.formType),
  formIdIdx: index('idx_tax_forms_form_id').on(table.formId)
}))

// ============================================================================
// 2. TRANSACTION MONITORING (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const transactionMonitoring = pgTable('transaction_monitoring', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionType: text('transaction_type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  riskLevel: text('risk_level').notNull().default('low'),
  riskScore: integer('risk_score'),
  status: text('status').notNull().default('pending_review'),
  flags: jsonb('flags').default(sql`'[]'::jsonb`),
  amlCheck: jsonb('aml_check').default(sql`'{}'::jsonb`),
  velocityCheck: jsonb('velocity_check').default(sql`'{}'::jsonb`),
  deviceFingerprint: jsonb('device_fingerprint').default(sql`'{}'::jsonb`),
  geographicData: jsonb('geographic_data').default(sql`'{}'::jsonb`),
  reviewerId: integer('reviewer_id'),
  reviewerNotes: text('reviewer_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  actionTaken: text('action_taken'),
  sarFiled: boolean('sar_filed').default(false),
  sarFiledAt: timestamp('sar_filed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_transaction_monitoring_user_id').on(table.userId),
  transactionIdIdx: index('idx_transaction_monitoring_transaction_id').on(table.transactionId),
  riskLevelIdx: index('idx_transaction_monitoring_risk_level').on(table.riskLevel),
  statusIdx: index('idx_transaction_monitoring_status').on(table.status)
}))

// ============================================================================
// 3. VERIFICATION CODES (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  linkToken: varchar('link_token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false),
  userId: uuid('user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  codeIdx: index('idx_verification_codes_code').on(table.code),
  emailIdx: index('idx_verification_codes_email').on(table.email),
  expiresAtIdx: index('idx_verification_codes_expires_at').on(table.expiresAt),
  linkTokenIdx: index('idx_verification_codes_link_token').on(table.linkToken),
  userIdIdx: index('idx_verification_codes_user_id').on(table.userId)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const taxFormsRelations = relations(taxForms, ({ one }) => ({
  user: one(users, {
    fields: [taxForms.userId],
    references: [users.id]
  })
}))

export const transactionMonitoringRelations = relations(transactionMonitoring, ({ one }) => ({
  user: one(users, {
    fields: [transactionMonitoring.userId],
    references: [users.id]
  })
}))

export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [verificationCodes.userId],
    references: [users.id]
  })
}))
