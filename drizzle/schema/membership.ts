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
import { relations } from 'drizzle-orm'
import { users } from './users'

// ============================================================================
// 1. MEMBERSHIP QUEUE (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const membershipQueue = pgTable('membership_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
  queuePosition: integer('queue_position'),
  joinedQueueAt: timestamp('joined_queue_at', { withTimezone: true }).defaultNow(),
  isEligible: boolean('is_eligible').default(true),
  priorityScore: integer('priority_score').default(0),
  subscriptionActive: boolean('subscription_active').default(false),
  totalMonthsSubscribed: integer('total_months_subscribed').default(0),
  lastPaymentDate: timestamp('last_payment_date', { withTimezone: true }),
  lifetimePaymentTotal: decimal('lifetime_payment_total', { precision: 10, scale: 2 }).default('0.00'),
  hasReceivedPayout: boolean('has_received_payout').default(false),
  status: varchar('status', { length: 20 }).default('pending'), // Added from recent migration
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
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'in_review', 'approved', 'rejected'
  verificationType: varchar('verification_type', { length: 50 }), // 'identity', 'address', 'financial'
  documentType: varchar('document_type', { length: 50 }), // 'passport', 'drivers_license', 'national_id'
  documentNumber: varchar('document_number', { length: 100 }),
  documentFrontUrl: text('document_front_url'),
  documentBackUrl: text('document_back_url'),
  selfieUrl: text('selfie_url'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: integer('reviewed_by'), // References admin(id)
  rejectionReason: text('rejection_reason'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  notes: text('notes'),
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
  userId: uuid('user_id').notNull().references(() => users.id),
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
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  disputeType: varchar('dispute_type', { length: 50 }).notNull(), // 'payment', 'payout', 'membership', 'other'
  disputeStatus: varchar('dispute_status', { length: 20 }).notNull().default('open'), // 'open', 'in_review', 'resolved', 'closed'
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  relatedEntityType: varchar('related_entity_type', { length: 50 }), // 'payment', 'payout', 'subscription'
  relatedEntityId: uuid('related_entity_id'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
  assignedTo: integer('assigned_to'), // References admin(id)
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolution: text('resolution'),
  internalNotes: text('internal_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_disputes_user_id').on(table.userId),
  statusIdx: index('idx_disputes_status').on(table.disputeStatus),
  typeIdx: index('idx_disputes_type').on(table.disputeType)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const membershipQueueRelations = relations(membershipQueue, ({ one }) => ({
  user: one(users, {
    fields: [membershipQueue.userId],
    references: [users.id]
  })
}))

export const kycVerificationRelations = relations(kycVerification, ({ one }) => ({
  user: one(users, {
    fields: [kycVerification.userId],
    references: [users.id]
  })
}))

export const payoutManagementRelations = relations(payoutManagement, ({ one }) => ({
  user: one(users, {
    fields: [payoutManagement.userId],
    references: [users.id]
  })
}))

export const disputesRelations = relations(disputes, ({ one }) => ({
  user: one(users, {
    fields: [disputes.userId],
    references: [users.id]
  })
}))
