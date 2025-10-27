/**
 * User Schema - Core User Tables
 *
 * These tables map EXACTLY to your existing database structure.
 * All column names, types, and constraints match the live database.
 *
 * Tables:
 * - users: Core identity table (links to Better Auth)
 * - user_profiles: Personal information
 * - user_contacts: Contact information (phone, email)
 * - user_addresses: Physical addresses
 * - user_memberships: Membership data
 */

import { pgTable, uuid, text, varchar, boolean, timestamp, date, numeric, integer, index, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth'

// ============================================================================
// 1. USERS: Core Identity Table (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: text('auth_user_id').unique(), // OLD: Links to auth.users (Supabase)
  userId: uuid('user_id').references(() => user.id), // NEW: Links to Better Auth user
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: boolean('email_verified').default(false),
  status: text('status').notNull().default('Pending'), // enum_member_status
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  authUserIdIdx: index('idx_users_auth_user_id').on(table.authUserId),
  statusIdx: index('idx_users_status').on(table.status),
  createdAtIdx: index('idx_users_created_at').on(table.createdAt)
}))

// ============================================================================
// 2. USER PROFILES: Personal Information (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  middleName: varchar('middle_name', { length: 100 }),
  dateOfBirth: date('date_of_birth'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_profiles_user_id').on(table.userId),
  nameIdx: index('idx_user_profiles_name').on(table.firstName, table.lastName)
}))

// ============================================================================
// 3. USER CONTACTS: Contact Information (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userContacts = pgTable('user_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  contactType: varchar('contact_type', { length: 20 }).notNull(), // 'phone', 'email', 'emergency'
  contactValue: varchar('contact_value', { length: 255 }).notNull(),
  isPrimary: boolean('is_primary').default(false),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_contacts_user_id').on(table.userId),
  typeIdx: index('idx_user_contacts_type').on(table.contactType),
  primaryIdx: index('idx_user_contacts_primary').on(table.userId, table.isPrimary),
  uniqueContact: unique('user_contacts_user_id_contact_type_contact_value_key').on(
    table.userId,
    table.contactType,
    table.contactValue
  )
}))

// ============================================================================
// 4. USER ADDRESSES: Physical Addresses (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userAddresses = pgTable('user_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  addressType: varchar('address_type', { length: 20 }).default('primary'),
  streetAddress: varchar('street_address', { length: 255 }),
  addressLine2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  countryCode: varchar('country_code', { length: 2 }).default('US'),
  isPrimary: boolean('is_primary').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_addresses_user_id').on(table.userId),
  primaryIdx: index('idx_user_addresses_primary').on(table.userId, table.isPrimary)
}))

// ============================================================================
// 5. USER MEMBERSHIPS: Membership Data (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userMemberships = pgTable('user_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
  joinDate: date('join_date').notNull().defaultNow(),
  tenure: numeric('tenure').default('0'),
  verificationStatus: varchar('verification_status', { length: 20 }).default('PENDING'),
  assignedAdminId: integer('assigned_admin_id'), // References admin(id)
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_memberships_user_id').on(table.userId),
  joinDateIdx: index('idx_user_memberships_join_date').on(table.joinDate)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  // Link to Better Auth user
  betterAuthUser: one(user, {
    fields: [users.userId],
    references: [user.id]
  }),
  // One-to-one relationships
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  }),
  membership: one(userMemberships, {
    fields: [users.id],
    references: [userMemberships.userId]
  }),
  // One-to-many relationships
  contacts: many(userContacts),
  addresses: many(userAddresses)
}))

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id]
  })
}))

export const userContactsRelations = relations(userContacts, ({ one }) => ({
  user: one(users, {
    fields: [userContacts.userId],
    references: [users.id]
  })
}))

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id]
  })
}))

export const userMembershipsRelations = relations(userMemberships, ({ one }) => ({
  user: one(users, {
    fields: [userMemberships.userId],
    references: [users.id]
  })
}))
