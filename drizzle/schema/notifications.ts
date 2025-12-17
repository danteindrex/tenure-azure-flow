/**
 * Notifications Schema
 *
 * Tables for user notifications system.
 */

import { pgTable, uuid, text, varchar, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  priority: varchar('priority', { length: 20 }).default('medium'),
  actionUrl: text('action_url'),
  actionText: varchar('action_text', { length: 100 }),
  metadata: jsonb('metadata').default({}),
  isRead: boolean('is_read').default(false),
  isArchived: boolean('is_archived').default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})