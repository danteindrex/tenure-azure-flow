/**
 * Content Schema - News Feed & Announcements
 *
 * This schema defines tables for content management:
 * - newsfeedposts: News posts and announcements for members
 *
 * Created to support the /api/newsfeed/posts endpoint
 */

import { pgTable, uuid, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth'

// Post Status IDs (from post_statuses lookup table)
// 1 = Draft, 2 = Published, 3 = Scheduled, 4 = Archived
export const POST_STATUS = {
  DRAFT: 1,
  PUBLISHED: 2,
  SCHEDULED: 3,
  ARCHIVED: 4,
} as const

// ============================================================================
// NEWSFEED POSTS TABLE
// ============================================================================
export const newsfeedPosts = pgTable('newsfeedposts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  publishDate: timestamp('publish_date', { withTimezone: true }).defaultNow().notNull(),
  // Post status - references post_statuses lookup table
  // 1 = Draft, 2 = Published, 3 = Scheduled, 4 = Archived
  postStatusId: integer('post_status_id').notNull().default(2), // Default to Published
  priority: varchar('priority', { length: 20 }).default('medium').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('idx_newsfeedposts_user_id').on(table.userId),
  publishDateIdx: index('idx_newsfeedposts_publish_date').on(table.publishDate),
  statusIdx: index('idx_newsfeedposts_status_id').on(table.postStatusId)
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
