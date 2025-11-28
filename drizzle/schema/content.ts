/**
 * Content Schema - News Feed & Announcements
 *
 * This schema defines tables for content management:
 * - newsfeedposts: News posts and announcements for members
 *
 * Created to support the /api/newsfeed/posts endpoint
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth'

// ============================================================================
// NEWSFEED POSTS TABLE
// ============================================================================
export const newsfeedPosts = pgTable('newsfeedposts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  publishDate: timestamp('publish_date', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('Published').notNull(),
  priority: varchar('priority', { length: 20 }).default('medium').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('idx_newsfeedposts_user_id').on(table.userId),
  publishDateIdx: index('idx_newsfeedposts_publish_date').on(table.publishDate),
  statusIdx: index('idx_newsfeedposts_status').on(table.status),
  statusPublishIdx: index('idx_newsfeedposts_status_publish').on(table.status, table.publishDate)
}))

// Relations
export const newsfeedPostsRelations = relations(newsfeedPosts, ({ one }) => ({
  author: one(user, {
    fields: [newsfeedPosts.userId],
    references: [user.id]
  })
}))

// TypeScript types for use in application
export type NewsfeedPost = typeof newsfeedPosts.$inferSelect
export type NewsfeedPostInsert = typeof newsfeedPosts.$inferInsert
