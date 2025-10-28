/**
 * Better Auth Schema - Authentication Tables
 *
 * These tables are managed by Better Auth and provide:
 * - User identity management
 * - Session management
 * - OAuth provider integration
 * - Email/phone verification
 * - Passkey (WebAuthn) support
 * - Two-factor authentication (TOTP + backup codes)
 */

import { pgTable, text, timestamp, boolean, uuid, integer, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// BETTER AUTH: Main User Identity Table
// ============================================================================
export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  password: text('password'), // bcrypt hashed password
  image: text('image'),
  phone: text('phone'), // Added for Better Auth phone support
  phoneVerified: boolean('phoneVerified').notNull().default(false),
  twoFactorEnabled: boolean('twoFactorEnabled').notNull().default(false), // Required by Better Auth 2FA plugin
  onboardingStep: integer('onboardingStep').notNull().default(1),
  onboardingCompleted: boolean('onboardingCompleted').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  emailUnique: unique('user_email_unique').on(table.email),
  phoneUnique: unique('user_phone_unique').on(table.phone)
}))

// ============================================================================
// BETTER AUTH: Session Management
// ============================================================================
export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow()
})

// ============================================================================
// BETTER AUTH: OAuth Provider Accounts
// ============================================================================
export const account = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(), // Provider's user ID
  providerId: text('providerId').notNull(), // 'google', 'github', etc.
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: timestamp('expiresAt', { withTimezone: true }),
  scope: text('scope'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
})

// ============================================================================
// BETTER AUTH: Email/Phone Verification
// ============================================================================
export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(), // email or phone
  value: text('value').notNull(), // verification code
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow()
})

// ============================================================================
// BETTER AUTH: Passkeys (WebAuthn)
// ============================================================================
export const passkey = pgTable('passkey', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name'), // User-friendly name (e.g., "iPhone 15 Pro")
  credentialId: text('credentialId').notNull(), // WebAuthn credential ID
  publicKey: text('publicKey').notNull(), // Public key for verification
  counter: integer('counter').notNull().default(0), // Signature counter
  deviceType: text('deviceType'), // 'platform' or 'cross-platform'
  backedUp: boolean('backedUp').default(false), // Is credential backed up?
  transports: text('transports').array(), // ['internal', 'usb', 'nfc', 'ble']
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('lastUsedAt', { withTimezone: true })
}, (table) => ({
  credentialIdUnique: unique('passkey_credentialId_unique').on(table.credentialId)
}))

// ============================================================================
// BETTER AUTH: Two-Factor Authentication
// ============================================================================
export const twoFactor = pgTable('two_factor', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(), // Encrypted TOTP secret
  backupCodes: text('backupCodes').array(), // Encrypted backup codes
  verified: boolean('verified').notNull().default(false), // Has user verified 2FA setup?
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp('verifiedAt', { withTimezone: true })
}, (table) => ({
  userIdUnique: unique('two_factor_userId_unique').on(table.userId)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
  twoFactor: one(twoFactor, {
    fields: [user.id],
    references: [twoFactor.userId]
  })
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}))

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id]
  })
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id]
  })
}))
