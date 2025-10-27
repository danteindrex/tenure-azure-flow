/**
 * Organizations Schema - Better Auth Organization Plugin
 *
 * These are NEW tables that will be created by Better Auth's organization plugin.
 * They enable team/organization management features.
 *
 * Features:
 * - Multi-tenant organization support
 * - Role-based access control (owner, admin, member)
 * - Organization invitations
 * - Member management
 */

import { pgTable, uuid, text, varchar, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth'

// ============================================================================
// 1. ORGANIZATION (NEW TABLE - BETTER AUTH)
// ============================================================================
export const organization = pgTable('organization', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // URL-friendly identifier
  logo: text('logo'),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  slugIdx: index('idx_organization_slug').on(table.slug)
}))

// ============================================================================
// 2. ORGANIZATION MEMBER (NEW TABLE - BETTER AUTH)
// ============================================================================
export const organizationMember = pgTable('organization_member', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('member'), // 'owner', 'admin', 'member'
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  orgIdIdx: index('idx_organization_member_org_id').on(table.organizationId),
  userIdIdx: index('idx_organization_member_user_id').on(table.userId),
  roleIdx: index('idx_organization_member_role').on(table.role)
}))

// ============================================================================
// 3. ORGANIZATION INVITATION (NEW TABLE - BETTER AUTH)
// ============================================================================
export const organizationInvitation = pgTable('organization_invitation', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'), // 'admin', 'member'
  inviterId: uuid('inviterId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'accepted', 'declined', 'expired'
  token: text('token').notNull().unique(), // Invitation token
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  orgIdIdx: index('idx_organization_invitation_org_id').on(table.organizationId),
  emailIdx: index('idx_organization_invitation_email').on(table.email),
  tokenIdx: index('idx_organization_invitation_token').on(table.token),
  statusIdx: index('idx_organization_invitation_status').on(table.status)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(organizationMember),
  invitations: many(organizationInvitation)
}))

export const organizationMemberRelations = relations(organizationMember, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationMember.organizationId],
    references: [organization.id]
  }),
  user: one(user, {
    fields: [organizationMember.userId],
    references: [user.id]
  })
}))

export const organizationInvitationRelations = relations(organizationInvitation, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationInvitation.organizationId],
    references: [organization.id]
  }),
  inviter: one(user, {
    fields: [organizationInvitation.inviterId],
    references: [user.id]
  })
}))
