import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'admin', 'moderator']);
export const adminStatusEnum = pgEnum('admin_status', ['active', 'inactive', 'suspended']);
// Note: Using existing enum name and values from database
export const userStatusEnum = pgEnum('enum_users_status', ['Active', 'Inactive', 'Suspended', 'Pending', 'Onboarded']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'inactive', 'cancelled', 'past_due', 'trialing']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed', 'refunded']);
export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'processing', 'completed', 'failed']);
export const membershipStatusEnum = pgEnum('membership_status', ['Inactive', 'Active', 'Suspended', 'Cancelled', 'Won', 'Paid']);
export const actionTypeEnum = pgEnum('action_type', ['login', 'logout', 'create', 'update', 'delete', 'view', 'export']);

// Admin Accounts Table (using existing 'admin' table)
export const adminAccounts = pgTable('admin', {
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hash: varchar('hash', { length: 255 }),
  salt: varchar('salt', { length: 255 }),
  name: text('name'),
  role: text('role').notNull().default('admin'),
  status: text('status').default('active'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  backupCodes: text('backup_codes').array(),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }),
  resetPasswordExpiration: timestamp('reset_password_expiration'),
  loginAttempts: integer('login_attempts'),
  lockUntil: timestamp('lock_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Admin Sessions Table
export const adminSessions = pgTable('admin_sessions', {
  id: text('id').primaryKey(),
  adminId: integer('admin_id').notNull().references(() => adminAccounts.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastActivity: timestamp('last_activity', { withTimezone: true }).notNull(),
  isActive: boolean('is_active'),
  logoutAt: timestamp('logout_at', { withTimezone: true }),
  logoutReason: varchar('logout_reason', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Two-Factor Authentication Table (using existing admin_2fa_codes)
export const twoFactorAuth = pgTable('admin_2fa_codes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  adminId: integer('admin_id').notNull().references(() => adminAccounts.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  attempts: integer('attempts').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: integer('admin_id').references(() => adminAccounts.id, { onDelete: 'set null' }),
  adminEmail: varchar('admin_email', { length: 255 }),
  action: actionTypeEnum('action').notNull(),
  resource: varchar('resource', { length: 255 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  status: varchar('status', { length: 50 }).notNull().default('success'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User Funnel Status Lookup Table
export const userFunnelStatuses = pgTable('user_funnel_statuses', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  description: text('description'),
});

// Member Eligibility Status Lookup Table
export const memberEligibilityStatuses = pgTable('member_eligibility_statuses', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  description: text('description'),
});

// Users Table (matching existing structure)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  userStatusId: integer('user_status_id').references(() => userFunnelStatuses.id),
  status: text('status'), // Keep for backward compatibility
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  name: text('name'),
  image: text('image'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
});

// Subscriptions Table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  planName: varchar('plan_name', { length: 255 }),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('usd'),
  interval: varchar('interval', { length: 50 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transactions Table
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  status: transactionStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Payouts Table
export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripePayoutId: varchar('stripe_payout_id', { length: 255 }).unique(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  status: payoutStatusEnum('status').notNull().default('pending'),
  arrivalDate: timestamp('arrival_date'),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Membership Queue Table
export const membershipQueue = pgTable('membership_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  status: membershipStatusEnum('status').notNull().default('Inactive'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  notifiedAt: timestamp('notified_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User Memberships Table
export const userMemberships = pgTable('user_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  memberEligibilityStatusId: integer('member_eligibility_status_id').references(() => memberEligibilityStatuses.id),
  joinDate: timestamp('join_date'),
  position: integer('position'),
  subscriptionId: uuid('subscription_id'),
  memberStatusId: integer('member_status_id'),
  verificationStatusId: integer('verification_status_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Billing Schedules Table (using existing user_billing_schedules)
export const billingSchedules = pgTable('user_billing_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id'),
  billingCycle: varchar('billing_cycle', { length: 50 }),
  nextBillingDate: timestamp('next_billing_date'),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin Alerts Table
export const adminAlerts = pgTable('admin_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 50 }).notNull().default('info'),
  read: boolean('read').notNull().default(false),
  readBy: integer('read_by').references(() => adminAccounts.id, { onDelete: 'set null' }),
  readAt: timestamp('read_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User Payments Table
export const userPayments = pgTable('user_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  status: varchar('status', { length: 50 }).notNull(),
  paymentType: varchar('payment_type', { length: 50 }),
  provider: varchar('provider', { length: 50 }),
  paymentDate: timestamp('payment_date', { withTimezone: true }),
  metadata: jsonb('metadata'),
  isFirstPayment: boolean('is_first_payment').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// User Contacts Table
export const userContacts = pgTable('user_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contactType: varchar('contact_type', { length: 50 }),
  contactValue: varchar('contact_value', { length: 255 }),
  isPrimary: boolean('is_primary').default(false),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User Addresses Table
export const userAddresses = pgTable('user_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  streetAddress: varchar('street_address', { length: 255 }).notNull(),
  addressLine2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
  countryCode: varchar('country_code', { length: 10 }),
  addressType: varchar('address_type', { length: 50 }),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Newsfeed Posts Table
export const newsfeedPosts = pgTable('newsfeedposts', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: integer('admin_id').references(() => adminAccounts.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Export types
export type AdminAccount = typeof adminAccounts.$inferSelect;
export type NewAdminAccount = typeof adminAccounts.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;
export type NewTwoFactorAuth = typeof twoFactorAuth.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type UserFunnelStatus = typeof userFunnelStatuses.$inferSelect;
export type NewUserFunnelStatus = typeof userFunnelStatuses.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type MembershipQueue = typeof membershipQueue.$inferSelect;
export type NewMembershipQueue = typeof membershipQueue.$inferInsert;
export type BillingSchedule = typeof billingSchedules.$inferSelect;
export type NewBillingSchedule = typeof billingSchedules.$inferInsert;
export type AdminAlert = typeof adminAlerts.$inferSelect;
export type NewAdminAlert = typeof adminAlerts.$inferInsert;
export type UserPayment = typeof userPayments.$inferSelect;
export type NewUserPayment = typeof userPayments.$inferInsert;
export type UserContact = typeof userContacts.$inferSelect;
export type NewUserContact = typeof userContacts.$inferInsert;
export type UserAddress = typeof userAddresses.$inferSelect;
export type NewUserAddress = typeof userAddresses.$inferInsert;
export type NewsfeedPost = typeof newsfeedPosts.$inferSelect;
export type NewNewsfeedPost = typeof newsfeedPosts.$inferInsert;
