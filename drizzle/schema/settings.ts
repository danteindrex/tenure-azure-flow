/**
 * User Settings Schema
 *
 * NOTE: These tables are defined in user_settings_tables.sql but NOT YET APPLIED
 * to the live database. You need to run this migration first:
 * psql $DATABASE_URL < migrations/user_settings_tables.sql
 *
 * Tables:
 * - user_settings: Main settings (deprecated, consolidated into specialized tables)
 * - user_notification_preferences: Notification settings
 * - user_security_settings: Security & 2FA settings
 * - user_payment_settings: Payment preferences
 * - user_privacy_settings: Privacy controls
 * - user_appearance_settings: UI/UX preferences
 */

import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, numeric, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// ============================================================================
// 1. USER SETTINGS: Main Settings Table (TO BE CREATED)
// ============================================================================
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Notification Settings (deprecated - use user_notification_preferences)
  emailNotifications: boolean('email_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(false),
  pushNotifications: boolean('push_notifications').default(true),
  marketingEmails: boolean('marketing_emails').default(false),

  // Security Settings (deprecated - use user_security_settings)
  twoFactorAuth: boolean('two_factor_auth').default(false),
  twoFactorSecret: text('two_factor_secret'),
  loginAlerts: boolean('login_alerts').default(true),
  sessionTimeout: integer('session_timeout').default(30),

  // Privacy Settings (deprecated - use user_privacy_settings)
  profileVisibility: text('profile_visibility').default('private'),
  dataSharing: boolean('data_sharing').default(false),

  // Appearance Settings (deprecated - use user_appearance_settings)
  theme: text('theme').default('light'),
  language: text('language').default('en'),

  // Payment Settings (deprecated - use user_payment_settings)
  autoRenewal: boolean('auto_renewal').default(true),
  paymentMethod: text('payment_method').default('card'),
  billingCycle: text('billing_cycle').default('monthly'),

  // Additional Settings
  timezone: text('timezone').default('UTC'),
  dateFormat: text('date_format').default('MM/DD/YYYY'),
  currency: text('currency').default('USD')
}, (table) => ({
  userIdIdx: index('idx_user_settings_user_id').on(table.userId)
}))

// ============================================================================
// 2. USER NOTIFICATION PREFERENCES (TO BE CREATED)
// ============================================================================
export const userNotificationPreferences = pgTable('user_notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Email Notification Types
  emailPaymentReminders: boolean('email_payment_reminders').default(true),
  emailTenureUpdates: boolean('email_tenure_updates').default(true),
  emailSecurityAlerts: boolean('email_security_alerts').default(true),
  emailSystemUpdates: boolean('email_system_updates').default(false),
  emailNewsletter: boolean('email_newsletter').default(false),

  // SMS Notification Types
  smsPaymentReminders: boolean('sms_payment_reminders').default(false),
  smsSecurityAlerts: boolean('sms_security_alerts').default(true),
  smsUrgentUpdates: boolean('sms_urgent_updates').default(true),

  // Push Notification Types
  pushPaymentReminders: boolean('push_payment_reminders').default(true),
  pushTenureUpdates: boolean('push_tenure_updates').default(true),
  pushSecurityAlerts: boolean('push_security_alerts').default(true),
  pushSystemUpdates: boolean('push_system_updates').default(false),

  // Frequency Settings
  emailFrequency: text('email_frequency').default('immediate'),
  smsFrequency: text('sms_frequency').default('urgent_only'),
  pushFrequency: text('push_frequency').default('immediate')
}, (table) => ({
  userIdIdx: index('idx_user_notification_preferences_user_id').on(table.userId)
}))

// ============================================================================
// 3. USER SECURITY SETTINGS (TO BE CREATED)
// ============================================================================
export const userSecuritySettings = pgTable('user_security_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Two-Factor Authentication
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorBackupCodes: text('two_factor_backup_codes').array(),
  twoFactorLastUsed: timestamp('two_factor_last_used', { withTimezone: true }),

  // Login Security
  loginAlerts: boolean('login_alerts').default(true),
  sessionTimeout: integer('session_timeout').default(30),
  maxConcurrentSessions: integer('max_concurrent_sessions').default(3),

  // Password Security
  passwordLastChanged: timestamp('password_last_changed', { withTimezone: true }),
  passwordStrengthScore: integer('password_strength_score').default(0),
  requirePasswordChange: boolean('require_password_change').default(false),

  // Device Management
  trustedDevices: jsonb('trusted_devices').default([]),
  deviceFingerprintRequired: boolean('device_fingerprint_required').default(false),

  // Security Questions (encrypted)
  securityQuestions: jsonb('security_questions').default([])
}, (table) => ({
  userIdIdx: index('idx_user_security_settings_user_id').on(table.userId)
}))

// ============================================================================
// 4. USER PAYMENT SETTINGS (TO BE CREATED)
// ============================================================================
export const userPaymentSettings = pgTable('user_payment_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Payment Preferences
  autoRenewal: boolean('auto_renewal').default(true),
  paymentMethod: text('payment_method').default('card'),
  billingCycle: text('billing_cycle').default('monthly'),

  // Billing Information
  billingAddress: jsonb('billing_address'),
  taxId: text('tax_id'),

  // Payment Methods (encrypted)
  savedPaymentMethods: jsonb('saved_payment_methods').default([]),
  defaultPaymentMethodId: text('default_payment_method_id'),

  // Billing Preferences
  invoiceDelivery: text('invoice_delivery').default('email'),
  paymentReminders: boolean('payment_reminders').default(true),
  paymentReminderDays: integer('payment_reminder_days').default(3),

  // Currency and Regional Settings
  currency: text('currency').default('USD'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).default('0.0000')
}, (table) => ({
  userIdIdx: index('idx_user_payment_settings_user_id').on(table.userId)
}))

// ============================================================================
// 5. USER PRIVACY SETTINGS (TO BE CREATED)
// ============================================================================
export const userPrivacySettings = pgTable('user_privacy_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Profile Visibility
  profileVisibility: text('profile_visibility').default('private'),
  showTenureMonths: boolean('show_tenure_months').default(true),
  showJoinDate: boolean('show_join_date').default(true),
  showActivityStatus: boolean('show_activity_status').default(true),

  // Data Sharing
  dataSharing: boolean('data_sharing').default(false),
  analyticsConsent: boolean('analytics_consent').default(false),
  marketingConsent: boolean('marketing_consent').default(false),
  thirdPartySharing: boolean('third_party_sharing').default(false),

  // Contact Information Privacy
  showEmail: boolean('show_email').default(false),
  showPhone: boolean('show_phone').default(false),
  showAddress: boolean('show_address').default(false),

  // Activity Privacy
  showLoginActivity: boolean('show_login_activity').default(false),
  showPaymentHistory: boolean('show_payment_history').default(false),
  showTenureProgress: boolean('show_tenure_progress').default(true),

  // Search and Discovery
  searchable: boolean('searchable').default(true),
  appearInLeaderboards: boolean('appear_in_leaderboards').default(true),
  showInMemberDirectory: boolean('show_in_member_directory').default(false),

  // Data Retention
  dataRetentionPeriod: integer('data_retention_period').default(365),
  autoDeleteInactive: boolean('auto_delete_inactive').default(false),
  inactivePeriod: integer('inactive_period').default(730)
}, (table) => ({
  userIdIdx: index('idx_user_privacy_settings_user_id').on(table.userId)
}))

// ============================================================================
// 6. USER APPEARANCE SETTINGS (TO BE CREATED)
// ============================================================================
export const userAppearanceSettings = pgTable('user_appearance_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Theme Settings
  theme: text('theme').default('light'),
  accentColor: text('accent_color').default('blue'),

  // Language and Localization
  language: text('language').default('en'),
  timezone: text('timezone').default('UTC'),
  dateFormat: text('date_format').default('MM/DD/YYYY'),
  timeFormat: text('time_format').default('12'),

  // Display Preferences
  fontSize: text('font_size').default('medium'),
  compactMode: boolean('compact_mode').default(false),
  showAnimations: boolean('show_animations').default(true),
  reduceMotion: boolean('reduce_motion').default(false),

  // Dashboard Preferences
  dashboardLayout: text('dashboard_layout').default('default'),
  sidebarCollapsed: boolean('sidebar_collapsed').default(false),
  showTooltips: boolean('show_tooltips').default(true),

  // Notifications Display
  notificationPosition: text('notification_position').default('top-right'),
  notificationDuration: integer('notification_duration').default(5000)
}, (table) => ({
  userIdIdx: index('idx_user_appearance_settings_user_id').on(table.userId)
}))

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id]
  })
}))

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationPreferences.userId],
    references: [users.id]
  })
}))

export const userSecuritySettingsRelations = relations(userSecuritySettings, ({ one }) => ({
  user: one(users, {
    fields: [userSecuritySettings.userId],
    references: [users.id]
  })
}))

export const userPaymentSettingsRelations = relations(userPaymentSettings, ({ one }) => ({
  user: one(users, {
    fields: [userPaymentSettings.userId],
    references: [users.id]
  })
}))

export const userPrivacySettingsRelations = relations(userPrivacySettings, ({ one }) => ({
  user: one(users, {
    fields: [userPrivacySettings.userId],
    references: [users.id]
  })
}))

export const userAppearanceSettingsRelations = relations(userAppearanceSettings, ({ one }) => ({
  user: one(users, {
    fields: [userAppearanceSettings.userId],
    references: [users.id]
  })
}))
