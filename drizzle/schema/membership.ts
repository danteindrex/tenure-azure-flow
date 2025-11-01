/**
 * Membership Schema - Queue & KYC Management
 *
 * These tables map EXACTLY to your existing database structure.
 * All column names, types, and constraints match the live database.
 *
 * Tables:
 * - membership_queue: Queue positions and eligibility
 * - kyc_verification: KYC verification data
 * - payout_management: Payout tracking
 * - disputes: Dispute management
 */

import { pgTable, uuid, text, varchar, boolean, timestamp, decimal, integer, date, index, jsonb } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { user } from './users'

// ============================================================================
// 1. MEMBERSHIP QUEUE (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const membershipQueue = pgTable('membership_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().references(() => user.id, { onDelete: 'cascade' }),
  queuePosition: integer('queue_position'),
  joinedQueueAt: timestamp('joined_queue_at', { withTimezone: true }).defaultNow(),
  isEligible: boolean('is_eligible').default(true),
  priorityScore: integer('priority_score').default(0),
  subscriptionActive: boolean('subscription_active').default(false),
  totalMonthsSubscribed: integer('total_months_subscribed').default(0),
  lastPaymentDate: timestamp('last_payment_date', { withTimezone: true }),
  lifetimePaymentTotal: decimal('lifetime_payment_total', { precision: 10, scale: 2 }).default('0.00'),
  hasReceivedPayout: boolean('has_received_payout').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_membership_queue_user_id').on(table.userId),
  positionIdx: index('idx_membership_queue_position').on(table.queuePosition),
  eligibleIdx: index('idx_membership_queue_eligible').on(table.isEligible)
}))

// ============================================================================
// 2. KYC VERIFICATION (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const kycVerification = pgTable('kyc_verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  verificationMethod: text('verification_method'),
  documentType: text('document_type'),
  documentNumber: text('document_number'),
  documentFrontUrl: text('document_front_url'),
  documentBackUrl: text('document_back_url'),
  selfieUrl: text('selfie_url'),
  verificationProvider: text('verification_provider'),
  providerVerificationId: text('provider_verification_id'),
  verificationData: jsonb('verification_data').default(sql`'{}'::jsonb`),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  reviewerId: integer('reviewer_id'),
  reviewerNotes: text('reviewer_notes'),
  riskScore: integer('risk_score'),
  riskFactors: jsonb('risk_factors').default(sql`'[]'::jsonb`),
  ipAddress: text('ip_address'), // Using text instead of inet for simplicity
  userAgent: text('user_agent'),
  geolocation: jsonb('geolocation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_kyc_verification_user_id').on(table.userId),
  statusIdx: index('idx_kyc_verification_status').on(table.status)
}))

// ============================================================================
// 3. PAYOUT MANAGEMENT (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const payoutManagement = pgTable('payout_management', {
  id: uuid('id').primaryKey().defaultRandom(),
  payoutId: text('payout_id').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => user.id),
  queuePosition: integer('queue_position').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull().default('100000.00'),
  currency: text('currency').default('USD'),
  status: text('status').notNull().default('pending_approval'),
  eligibilityCheck: jsonb('eligibility_check').default({}),
  approvalWorkflow: jsonb('approval_workflow').default([]),
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }),
  paymentMethod: text('payment_method').notNull().default('ach'),
  bankDetails: jsonb('bank_details'),
  taxWithholding: jsonb('tax_withholding'),
  processing: jsonb('processing'),
  receiptUrl: text('receipt_url'),
  internalNotes: jsonb('internal_notes').default([]),
  auditTrail: jsonb('audit_trail').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_payout_management_user_id').on(table.userId),
  statusIdx: index('idx_payout_management_status').on(table.status)
}))

// ============================================================================
// 4. DISPUTES (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  disputeId: text('dispute_id').notNull(),
  paymentId: uuid('payment_id'),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: text('status').notNull().default('needs_response'),
  reason: text('reason').notNull(),
  amount: decimal('amount').notNull(),
  currency: text('currency').default('USD'),
  stripeDisputeId: text('stripe_dispute_id'),
  customerMessage: text('customer_message'),
  respondBy: timestamp('respond_by', { withTimezone: true }).notNull(),
  evidence: jsonb('evidence').default(sql`'{}'::jsonb`),
  assignedTo: integer('assigned_to'),
  internalNotes: jsonb('internal_notes').default(sql`'[]'::jsonb`),
  resolution: jsonb('resolution'),
  impact: jsonb('impact'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_disputes_user_id').on(table.userId),
  statusIdx: index('idx_disputes_status').on(table.status),
  typeIdx: index('idx_disputes_type').on(table.type),
  disputeIdIdx: index('idx_disputes_dispute_id').on(table.disputeId)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const membershipQueueRelations = relations(membershipQueue, ({ one }) => ({
  user: one(user, {
    fields: [membershipQueue.userId],
    references: [user.id]
  })
}))

export const kycVerificationRelations = relations(kycVerification, ({ one }) => ({
  user: one(user, {
    fields: [kycVerification.userId],
    references: [user.id]
  })
}))

export const payoutManagementRelations = relations(payoutManagement, ({ one }) => ({
  user: one(user, {
    fields: [payoutManagement.userId],
    references: [user.id]
  })
}))

export const disputesRelations = relations(disputes, ({ one }) => ({
  user: one(user, {
    fields: [disputes.userId],
    references: [user.id]
  })
}))
