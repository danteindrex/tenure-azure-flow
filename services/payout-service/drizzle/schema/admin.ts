/**
 * Admin Schema - Admin Users & Payload CMS Tables
 *
 * These tables map EXACTLY to your existing database structure.
 * All column names, types, and constraints match the live database.
 *
 * Tables:
 * - admin: Admin users table
 * - admin_sessions: Admin session management
 * - admin_alerts: Admin alert system
 * - payload_migrations: Payload CMS migrations
 * - payload_preferences: Payload CMS preferences
 * - payload_preferences_rels: Payload CMS preference relations
 */

import { pgTable, uuid, text, varchar, boolean, timestamp, decimal, integer, jsonb, index, serial } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ============================================================================
// 1. ADMIN (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const admin = pgTable('admin', {
  id: serial('id').primaryKey(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  email: varchar('email').notNull(),
  resetPasswordToken: varchar('reset_password_token'),
  resetPasswordExpiration: timestamp('reset_password_expiration', { withTimezone: true }),
  salt: varchar('salt'),
  hash: varchar('hash'),
  loginAttempts: decimal('login_attempts').default('0'),
  lockUntil: timestamp('lock_until', { withTimezone: true }),
  role: text('role').notNull().default('Manager') // This is enum_admin_role in DB
}, (table) => ({
  emailIdx: index('idx_admin_email').on(table.email)
}))

// ============================================================================
// 2. ADMIN SESSIONS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const adminSessions = pgTable('admin_sessions', {
  order: integer('_order').notNull(),
  parentId: integer('_parent_id').notNull(),
  id: varchar('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
}, (table) => ({
  parentIdIdx: index('idx_admin_sessions_parent_id').on(table.parentId)
}))

// ============================================================================
// 3. ADMIN ALERTS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const adminAlerts = pgTable('admin_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: text('alert_id').notNull().default(sql`(gen_random_uuid())::text`),
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull().default('info'),
  category: text('category').notNull(),
  status: text('status').notNull().default('new'),
  relatedEntity: jsonb('related_entity'),
  triggerInfo: jsonb('trigger_info'),
  assignedTo: integer('assigned_to'),
  acknowledgedBy: integer('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  resolvedBy: integer('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
  notificationsSent: jsonb('notifications_sent').default(sql`'[]'::jsonb`),
  escalation: jsonb('escalation'),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  alertIdIdx: index('idx_admin_alerts_alert_id').on(table.alertId),
  statusIdx: index('idx_admin_alerts_status').on(table.status),
  severityIdx: index('idx_admin_alerts_severity').on(table.severity),
  assignedToIdx: index('idx_admin_alerts_assigned_to').on(table.assignedTo)
}))

// ============================================================================
// 4. PAYLOAD MIGRATIONS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const payloadMigrations = pgTable('payload_migrations', {
  id: serial('id').primaryKey(),
  name: varchar('name'),
  batch: decimal('batch'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// ============================================================================
// 5. PAYLOAD PREFERENCES (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const payloadPreferences = pgTable('payload_preferences', {
  id: serial('id').primaryKey(),
  key: varchar('key'),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  keyIdx: index('idx_payload_preferences_key').on(table.key)
}))

// ============================================================================
// 6. PAYLOAD PREFERENCES RELS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const payloadPreferencesRels = pgTable('payload_preferences_rels', {
  id: serial('id').primaryKey(),
  order: integer('order'),
  parentId: integer('parent_id').notNull(),
  path: varchar('path').notNull(),
  adminId: integer('admin_id')
}, (table) => ({
  parentIdIdx: index('idx_payload_preferences_rels_parent_id').on(table.parentId),
  pathIdx: index('idx_payload_preferences_rels_path').on(table.path),
  adminIdIdx: index('idx_payload_preferences_rels_admin_id').on(table.adminId)
}))

// ============================================================================
// 7. PAYLOAD LOCKED DOCUMENTS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const payloadLockedDocuments = pgTable('payload_locked_documents', {
  id: serial('id').primaryKey(),
  globalSlug: varchar('global_slug'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  globalSlugIdx: index('idx_payload_locked_documents_global_slug').on(table.globalSlug)
}))

// ============================================================================
// 8. PAYLOAD LOCKED DOCUMENTS RELS (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const payloadLockedDocumentsRels = pgTable('payload_locked_documents_rels', {
  id: serial('id').primaryKey(),
  order: integer('order'),
  parentId: integer('parent_id').notNull(),
  path: varchar('path').notNull(),
  adminId: integer('admin_id'),
  usersId: integer('users_id')
}, (table) => ({
  parentIdIdx: index('idx_payload_locked_documents_rels_parent_id').on(table.parentId),
  pathIdx: index('idx_payload_locked_documents_rels_path').on(table.path),
  adminIdIdx: index('idx_payload_locked_documents_rels_admin_id').on(table.adminId),
  usersIdIdx: index('idx_payload_locked_documents_rels_users_id').on(table.usersId)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const adminRelations = relations(admin, ({ many }) => ({
  sessions: many(adminSessions),
  alerts: many(adminAlerts),
  preferencesRels: many(payloadPreferencesRels)
}))

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(admin, {
    fields: [adminSessions.parentId],
    references: [admin.id]
  })
}))

export const adminAlertsRelations = relations(adminAlerts, ({ one }) => ({
  assignedAdmin: one(admin, {
    fields: [adminAlerts.assignedTo],
    references: [admin.id]
  }),
  acknowledgedByAdmin: one(admin, {
    fields: [adminAlerts.acknowledgedBy],
    references: [admin.id]
  }),
  resolvedByAdmin: one(admin, {
    fields: [adminAlerts.resolvedBy],
    references: [admin.id]
  })
}))

export const payloadPreferencesRelsRelations = relations(payloadPreferencesRels, ({ one }) => ({
  preference: one(payloadPreferences, {
    fields: [payloadPreferencesRels.parentId],
    references: [payloadPreferences.id]
  }),
  admin: one(admin, {
    fields: [payloadPreferencesRels.adminId],
    references: [admin.id]
  })
}))

export const payloadPreferencesRelations = relations(payloadPreferences, ({ many }) => ({
  rels: many(payloadPreferencesRels)
}))

export const payloadLockedDocumentsRelations = relations(payloadLockedDocuments, ({ many }) => ({
  rels: many(payloadLockedDocumentsRels)
}))

export const payloadLockedDocumentsRelsRelations = relations(payloadLockedDocumentsRels, ({ one }) => ({
  document: one(payloadLockedDocuments, {
    fields: [payloadLockedDocumentsRels.parentId],
    references: [payloadLockedDocuments.id]
  }),
  admin: one(admin, {
    fields: [payloadLockedDocumentsRels.adminId],
    references: [admin.id]
  })
}))