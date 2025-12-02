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

// Note: We now use Better Auth's user table directly instead of a custom users table
// Export the Better Auth user for convenience
export { user } from './auth'

// ============================================================================
// 1. USER PROFILES: Personal Information (EXISTING TABLE - EXACT MAPPING)
// ============================================================================
export const userProfiles = pgTable('user_profiles', {
  id: varchar('id').primaryKey(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  middleName: varchar('middle_name'),
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
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
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
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  addressType: varchar('address_type', { length: 20 }).default('primary'),
  streetAddress: varchar('street_address', { length: 255 }).notNull(),
  addressLine2: varchar('address_line_2', { length: 255 }), // Optional - apartments, suites, etc.
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
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
  userId: uuid('user_id').unique().references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').unique(), // One membership per subscription
  joinDate: date('join_date').notNull().defaultNow(),
  tenure: numeric('tenure').default('0'),
  verificationStatusId: integer('verification_status_id').default(1), // References verification_statuses lookup table
  memberStatusId: integer('member_status_id').default(1), // References member_eligibility_statuses lookup table
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  userIdIdx: index('idx_user_memberships_user_id').on(table.userId),
  subscriptionIdIdx: index('idx_user_memberships_subscription_id').on(table.subscriptionId),
  joinDateIdx: index('idx_user_memberships_join_date').on(table.joinDate),
  memberStatusIdx: index('idx_user_memberships_member_status_id').on(table.memberStatusId)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

// Relations now use Better Auth's user table directly
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(user, {
    fields: [userProfiles.userId],
    references: [user.id]
  })
}))

export const userContactsRelations = relations(userContacts, ({ one }) => ({
  user: one(user, {
    fields: [userContacts.userId],
    references: [user.id]
  })
}))

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(user, {
    fields: [userAddresses.userId],
    references: [user.id]
  })
}))

export const userMembershipsRelations = relations(userMemberships, ({ one }) => ({
  user: one(user, {
    fields: [userMemberships.userId],
    references: [user.id]
  })
}))
