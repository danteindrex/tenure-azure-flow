/**
 * Audit Schema - System & User Audit Logs
 *
 * These tables map EXACTLY to your existing database structure.
 * All column names, types, and constraints match the live database.
 *
 * Tables:
 * - system_audit_logs: System-wide audit trail (1,950 rows in production!)
 * - user_audit_logs: User-specific audit events
 */

import { pgTable, uuid, text, varchar, boolean, timestamp, jsonb, integer, inet, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './users'

// ============================================================================
// 1. SYSTEM AUDIT LOGS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const systemAuditLogs = pgTable('system_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  adminId: integer('admin_id'), // References admin(id)

  // Entity Information
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'user', 'payment', 'subscription', etc.
  entityId: uuid('entity_id'),

  // Action Details
  action: varchar('action', { length: 50 }).notNull(), // 'create', 'update', 'delete', 'login', 'logout'
  oldValues: jsonb('old_values'), // Previous state
  newValues: jsonb('new_values'), // New state

  // Status
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),

  // Request Context
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),

  // Additional Metadata
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_system_audit_logs_user_id').on(table.userId),
  entityIdx: index('idx_system_audit_logs_entity').on(table.entityType, table.entityId),
  createdAtIdx: index('idx_system_audit_logs_created_at').on(table.createdAt),
  actionIdx: index('idx_system_audit_logs_action').on(table.action),
  successIdx: index('idx_system_audit_logs_success').on(table.success)
}))

// ============================================================================
// 2. USER AUDIT LOGS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userAuditLogs = pgTable('user_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  adminId: integer('admin_id'),
  entityType: varchar('entity_type').notNull(),
  entityId: uuid('entity_id'),
  action: varchar('action').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_audit_logs_user_id').on(table.userId),
  actionIdx: index('idx_user_audit_logs_action').on(table.action),
  createdAtIdx: index('idx_user_audit_logs_created_at').on(table.createdAt),
  entityTypeIdx: index('idx_user_audit_logs_entity_type').on(table.entityType)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const systemAuditLogsRelations = relations(systemAuditLogs, ({ one }) => ({
  user: one(user, {
    fields: [systemAuditLogs.userId],
    references: [user.id]
  })
}))

export const userAuditLogsRelations = relations(userAuditLogs, ({ one }) => ({
  user: one(user, {
    fields: [userAuditLogs.userId],
    references: [user.id]
  })
}))
