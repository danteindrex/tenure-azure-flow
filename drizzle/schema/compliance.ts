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
import { relations } from 'drizzle-orm'
import { users } from './users'

// ============================================================================
// 1. TAX FORMS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const taxForms = pgTable('tax_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  formType: varchar('form_type', { length: 20 }).notNull(), // '1099', 'W9', 'W8BEN'
  taxYear: integer('tax_year').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'submitted', 'approved', 'rejected'

  // Tax Information
  taxIdType: varchar('tax_id_type', { length: 20 }), // 'ssn', 'ein', 'itin'
  taxIdNumber: varchar('tax_id_number', { length: 50 }), // Encrypted
  legalName: varchar('legal_name', { length: 255 }),
  businessName: varchar('business_name', { length: 255 }),

  // Address Information
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  zipCode: varchar('zip_code', { length: 20 }),
  country: varchar('country', { length: 2 }).default('US'),

  // Form Data
  formData: jsonb('form_data'), // Full form data as JSON
  documentUrl: text('document_url'), // S3/storage URL for signed form

  // Income Information (for 1099)
  totalIncome: decimal('total_income', { precision: 10, scale: 2 }),
  federalTaxWithheld: decimal('federal_tax_withheld', { precision: 10, scale: 2 }),

  // Submission Tracking
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  submittedBy: uuid('submitted_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: integer('approved_by'), // References admin(id)

  // IRS Filing
  filedWithIrs: boolean('filed_with_irs').default(false),
  irsFilingDate: timestamp('irs_filing_date', { withTimezone: true }),
  irsConfirmationNumber: varchar('irs_confirmation_number', { length: 100 }),

  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_tax_forms_user_id').on(table.userId),
  statusIdx: index('idx_tax_forms_status').on(table.status),
  taxYearIdx: index('idx_tax_forms_tax_year').on(table.taxYear),
  formTypeIdx: index('idx_tax_forms_form_type').on(table.formType)
}))

// ============================================================================
// 2. TRANSACTION MONITORING (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const transactionMonitoring = pgTable('transaction_monitoring', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'payment', 'payout', 'refund'
  transactionId: uuid('transaction_id'), // References payment or payout id
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Risk Assessment
  riskScore: integer('risk_score').default(0), // 0-100
  riskLevel: varchar('risk_level', { length: 20 }).default('low'), // 'low', 'medium', 'high', 'critical'
  riskFactors: jsonb('risk_factors').default([]), // Array of risk indicators

  // Flags
  flagged: boolean('flagged').default(false),
  flagReason: text('flag_reason'),
  flaggedAt: timestamp('flagged_at', { withTimezone: true }),
  flaggedBy: integer('flagged_by'), // References admin(id)

  // Review Status
  reviewStatus: varchar('review_status', { length: 20 }).default('pending'), // 'pending', 'in_review', 'cleared', 'blocked'
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: integer('reviewed_by'), // References admin(id)
  reviewNotes: text('review_notes'),

  // AML/KYC Compliance
  amlCheck: boolean('aml_check').default(false),
  amlCheckDate: timestamp('aml_check_date', { withTimezone: true }),
  sanctionScreening: boolean('sanction_screening').default(false),
  sanctionScreeningDate: timestamp('sanction_screening_date', { withTimezone: true }),

  // Metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  location: jsonb('location'), // { country, city, lat, lng }
  deviceFingerprint: text('device_fingerprint'),

  // Transaction Details
  transactionDetails: jsonb('transaction_details'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_transaction_monitoring_user_id').on(table.userId),
  transactionIdIdx: index('idx_transaction_monitoring_transaction_id').on(table.transactionId),
  riskLevelIdx: index('idx_transaction_monitoring_risk_level').on(table.riskLevel),
  flaggedIdx: index('idx_transaction_monitoring_flagged').on(table.flagged),
  reviewStatusIdx: index('idx_transaction_monitoring_review_status').on(table.reviewStatus)
}))

// ============================================================================
// 3. VERIFICATION CODES (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  codeType: varchar('code_type', { length: 20 }).notNull(), // 'email', 'sms', 'totp'
  code: varchar('code', { length: 10 }).notNull(), // 6-digit code (hashed)
  purpose: varchar('purpose', { length: 50 }).notNull(), // 'signup', 'login', 'reset_password', '2fa'

  // Contact Information
  email: varchar('email', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }),

  // Status
  used: boolean('used').default(false),
  usedAt: timestamp('used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  // Attempt Tracking
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),

  // Metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_verification_codes_user_id').on(table.userId),
  codeIdx: index('idx_verification_codes_code').on(table.code),
  emailIdx: index('idx_verification_codes_email').on(table.email),
  expiresAtIdx: index('idx_verification_codes_expires_at').on(table.expiresAt)
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
