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
import { users } from './users'

// ============================================================================
// 1. SYSTEM AUDIT LOGS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const systemAuditLogs = pgTable('system_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
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
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Event Information
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'login', 'logout', 'profile_update', 'password_change'
  eventCategory: varchar('event_category', { length: 50 }), // 'authentication', 'profile', 'security', 'payment'
  eventDescription: text('event_description'),

  // Event Data
  eventData: jsonb('event_data'), // Additional event-specific data

  // Request Context
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  deviceType: varchar('device_type', { length: 20 }), // 'desktop', 'mobile', 'tablet'
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),

  // Location
  location: jsonb('location'), // { country, city, lat, lng }

  // Status
  success: boolean('success').default(true),
  failureReason: text('failure_reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_audit_logs_user_id').on(table.userId),
  eventTypeIdx: index('idx_user_audit_logs_event_type').on(table.eventType),
  eventCategoryIdx: index('idx_user_audit_logs_event_category').on(table.eventCategory),
  createdAtIdx: index('idx_user_audit_logs_created_at').on(table.createdAt)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const systemAuditLogsRelations = relations(systemAuditLogs, ({ one }) => ({
  user: one(users, {
    fields: [systemAuditLogs.userId],
    references: [users.id]
  })
}))

export const userAuditLogsRelations = relations(userAuditLogs, ({ one }) => ({
  user: one(users, {
    fields: [userAuditLogs.userId],
    references: [users.id]
  })
}))
