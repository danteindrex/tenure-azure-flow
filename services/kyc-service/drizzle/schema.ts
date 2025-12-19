import { pgTable, index, uniqueIndex, serial, timestamp, varchar, numeric, foreignKey, unique, pgPolicy, uuid, boolean, integer, jsonb, text, check, char, date, inet, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const enumAdminRole = pgEnum("enum_admin_role", ['Super Admin', 'Manager', 'Support'])
export const enumAuditlogChangeType = pgEnum("enum_auditlog_change_type", ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'])
export const enumNewsfeedpostPriority = pgEnum("enum_newsfeedpost_priority", ['Low', 'Normal', 'High', 'Urgent'])
export const enumNewsfeedpostStatus = pgEnum("enum_newsfeedpost_status", ['Draft', 'Published', 'Scheduled', 'Archived'])
export const enumUserAddressesAddressType = pgEnum("enum_user_addresses_address_type", ['primary', 'billing', 'shipping'])
export const enumUserAgreementsAgreementType = pgEnum("enum_user_agreements_agreement_type", ['TERMS_CONDITIONS', 'PAYMENT_AUTHORIZATION'])
export const enumUserBillingSchedulesBillingCycle = pgEnum("enum_user_billing_schedules_billing_cycle", ['MONTHLY', 'QUARTERLY', 'YEARLY'])
export const enumUserContactsContactType = pgEnum("enum_user_contacts_contact_type", ['phone', 'email', 'emergency'])
export const enumUserMembershipsVerificationStatus = pgEnum("enum_user_memberships_verification_status", ['PENDING', 'VERIFIED', 'FAILED', 'SKIPPED'])
export const enumUserPaymentMethodsMethodSubtype = pgEnum("enum_user_payment_methods_method_subtype", ['apple_pay', 'google_pay', 'cash_app'])
export const enumUserPaymentMethodsMethodType = pgEnum("enum_user_payment_methods_method_type", ['card', 'bank_account', 'digital_wallet'])
export const enumUserPaymentMethodsProvider = pgEnum("enum_user_payment_methods_provider", ['stripe', 'paypal', 'bank'])
export const enumUserPaymentsPaymentType = pgEnum("enum_user_payments_payment_type", ['initial', 'recurring', 'one_time'])
export const enumUserPaymentsProvider = pgEnum("enum_user_payments_provider", ['stripe', 'paypal', 'bank'])
export const enumUserPaymentsStatus = pgEnum("enum_user_payments_status", ['succeeded', 'pending', 'failed', 'refunded', 'canceled'])
export const enumUserSubscriptionsProvider = pgEnum("enum_user_subscriptions_provider", ['stripe', 'paypal'])
export const enumUserSubscriptionsStatus = pgEnum("enum_user_subscriptions_status", ['active', 'past_due', 'canceled', 'incomplete', 'trialing', 'unpaid'])
export const enumUsersStatus = pgEnum("enum_users_status", ['Active', 'Inactive', 'Suspended', 'Pending'])
export const memberStatus = pgEnum("member_status", ['UNVERIFIED', 'PROSPECT', 'ACTIVE', 'PENDING'])


export const admin = pgTable("admin", {
	id: serial().primaryKey().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: varchar().notNull(),
	resetPasswordToken: varchar("reset_password_token"),
	resetPasswordExpiration: timestamp("reset_password_expiration", { precision: 3, withTimezone: true, mode: 'string' }),
	salt: varchar(),
	hash: varchar(),
	loginAttempts: numeric("login_attempts").default('0'),
	lockUntil: timestamp("lock_until", { precision: 3, withTimezone: true, mode: 'string' }),
	role: enumAdminRole().default('Manager').notNull(),
}, (table) => [
	index("admin_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	uniqueIndex("admin_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("admin_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const verificationCodes = pgTable("verification_codes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 6 }).notNull(),
	linkToken: varchar("link_token", { length: 64 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	used: boolean().default(false),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_verification_codes_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("idx_verification_codes_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_verification_codes_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_verification_codes_link_token").using("btree", table.linkToken.asc().nullsLast().op("text_ops")),
	index("idx_verification_codes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "verification_codes_user_id_fkey"
		}).onDelete("cascade"),
	unique("verification_codes_link_token_key").on(table.linkToken),
	pgPolicy("Users can read their own verification codes", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Service role can manage verification codes", { as: "permissive", for: "all", to: ["public"] }),
]);

export const payloadLockedDocumentsRels = pgTable("payload_locked_documents_rels", {
	id: serial().primaryKey().notNull(),
	order: integer(),
	parentId: integer("parent_id").notNull(),
	path: varchar().notNull(),
	adminId: integer("admin_id"),
	usersId: integer("users_id"),
}, (table) => [
	index("payload_locked_documents_rels_admin_id_idx").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("payload_locked_documents_rels_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
	index("payload_locked_documents_rels_parent_idx").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
	index("payload_locked_documents_rels_path_idx").using("btree", table.path.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admin.id],
			name: "payload_locked_documents_rels_admin_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [payloadLockedDocuments.id],
			name: "payload_locked_documents_rels_parent_fk"
		}).onDelete("cascade"),
]);

export const payloadLockedDocuments = pgTable("payload_locked_documents", {
	id: serial().primaryKey().notNull(),
	globalSlug: varchar("global_slug"),
	updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payload_locked_documents_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("payload_locked_documents_global_slug_idx").using("btree", table.globalSlug.asc().nullsLast().op("text_ops")),
	index("payload_locked_documents_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const payloadMigrations = pgTable("payload_migrations", {
	id: serial().primaryKey().notNull(),
	name: varchar(),
	batch: numeric(),
	updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payload_migrations_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("payload_migrations_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const payloadPreferences = pgTable("payload_preferences", {
	id: serial().primaryKey().notNull(),
	key: varchar(),
	value: jsonb(),
	updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payload_preferences_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("payload_preferences_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
	index("payload_preferences_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const payloadPreferencesRels = pgTable("payload_preferences_rels", {
	id: serial().primaryKey().notNull(),
	order: integer(),
	parentId: integer("parent_id").notNull(),
	path: varchar().notNull(),
	adminId: integer("admin_id"),
}, (table) => [
	index("payload_preferences_rels_admin_id_idx").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("payload_preferences_rels_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
	index("payload_preferences_rels_parent_idx").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
	index("payload_preferences_rels_path_idx").using("btree", table.path.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admin.id],
			name: "payload_preferences_rels_admin_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [payloadPreferences.id],
			name: "payload_preferences_rels_parent_fk"
		}).onDelete("cascade"),
]);

export const adminSessions = pgTable("admin_sessions", {
	order: integer("_order").notNull(),
	parentId: integer("_parent_id").notNull(),
	id: varchar().primaryKey().notNull(),
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { precision: 3, withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("admin_sessions_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
	index("admin_sessions_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [admin.id],
			name: "admin_sessions_parent_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	emailVerified: boolean("email_verified").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	name: text(),
	image: text(),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	profileCompleted: boolean("profile_completed").default(false),
	financialAgreementAccepted: boolean("financial_agreement_accepted").default(false),
	policyAgreementAccepted: boolean("policy_agreement_accepted").default(false),
	financialAgreementAcceptedAt: timestamp("financial_agreement_accepted_at", { withTimezone: true, mode: 'string' }),
	policyAgreementAcceptedAt: timestamp("policy_agreement_accepted_at", { withTimezone: true, mode: 'string' }),
	userStatusId: integer("user_status_id").default(1).notNull(),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_users_email_verified").using("btree", table.emailVerified.asc().nullsLast().op("bool_ops")),
	index("idx_users_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("idx_users_status_id").using("btree", table.userStatusId.asc().nullsLast().op("int4_ops")),
]);

export const signupSessions = pgTable("signup_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 50 }).notNull(),
	token: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 20 }),
	step: integer().default(1),
	status: varchar({ length: 20 }).default('active'),
	userId: uuid("user_id"),
	profileData: jsonb("profile_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_signup_sessions_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_signup_sessions_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_signup_sessions_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_signup_sessions_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_signup_sessions_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("idx_signup_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "signup_sessions_user_id_fkey"
		}).onDelete("cascade"),
	unique("signup_sessions_session_id_key").on(table.sessionId),
	unique("signup_sessions_token_key").on(table.token),
	pgPolicy("Service role can manage signup sessions", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.role() = 'service_role'::text)` }),
	pgPolicy("Users can read their own sessions", { as: "permissive", for: "select", to: ["public"] }),
	check("signup_sessions_status_check", sql`(status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'expired'::character varying])::text[])`),
]);

export const userAddresses = pgTable("user_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	addressType: varchar("address_type", { length: 20 }).default('primary'),
	streetAddress: varchar("street_address", { length: 255 }),
	addressLine2: varchar("address_line_2", { length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 20 }),
	countryCode: char("country_code", { length: 2 }).default('US'),
	isPrimary: boolean("is_primary").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own addresses", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage addresses", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userContacts = pgTable("user_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	contactType: varchar("contact_type", { length: 20 }).notNull(),
	contactValue: varchar("contact_value", { length: 255 }).notNull(),
	isPrimary: boolean("is_primary").default(false),
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own contacts", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage contacts", { as: "permissive", for: "all", to: ["public"] }),
]);

export const newsfeedpost = pgTable("newsfeedpost", {
	id: serial().primaryKey().notNull(),
	title: varchar().notNull(),
	content: jsonb().notNull(),
	adminIDIdId: integer("admin_i_d_id_id").notNull(),
	publishDate: timestamp("publish_date", { precision: 3, withTimezone: true, mode: 'string' }).notNull(),
	status: enumNewsfeedpostStatus().default('Draft').notNull(),
	priority: enumNewsfeedpostPriority().default('Normal'),
	updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
	id: varchar().primaryKey().notNull(),
	userId: uuid("user_id"),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	middleName: varchar("middle_name", { length: 100 }),
	dateOfBirth: date("date_of_birth"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own profile", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Users can update their own profile", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Service can manage profiles", { as: "permissive", for: "all", to: ["public"] }),
]);

export const membershipQueue = pgTable("membership_queue", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	queuePosition: integer("queue_position"),
	joinedQueueAt: timestamp("joined_queue_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	isEligible: boolean("is_eligible").default(true),
	priorityScore: integer("priority_score").default(0),
	subscriptionActive: boolean("subscription_active").default(false),
	totalMonthsSubscribed: integer("total_months_subscribed").default(0),
	lastPaymentDate: timestamp("last_payment_date", { withTimezone: true, mode: 'string' }),
	lifetimePaymentTotal: numeric("lifetime_payment_total", { precision: 10, scale:  2 }).default('0.00'),
	hasReceivedPayout: boolean("has_received_payout").default(false),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own queue status", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage queue", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userMemberships = pgTable("user_memberships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	subscriptionId: uuid("subscription_id").unique(), // One membership per subscription
	joinDate: date("join_date").default(sql`CURRENT_DATE`).notNull(),
	tenure: numeric().default('0'),
	verificationStatusId: integer("verification_status_id").default(1),
	memberStatusId: integer("member_status_id").default(1),
	memberEligibilityStatusId: integer("member_eligibility_status_id").default(1),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_memberships_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_memberships_subscription_id").using("btree", table.subscriptionId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_memberships_join_date").using("btree", table.joinDate.asc().nullsLast().op("date_ops")),
	index("idx_user_memberships_status_id").using("btree", table.memberStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_user_memberships_verification_status_id").using("btree", table.verificationStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_user_memberships_member_eligibility_status_id").using("btree", table.memberEligibilityStatusId.asc().nullsLast().op("int4_ops")),
		foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [userSubscriptions.id],
			name: "user_memberships_subscription_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can view their own memberships", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage memberships", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userBillingSchedules = pgTable("user_billing_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	subscriptionId: uuid("subscription_id"),
	billingCycle: varchar("billing_cycle", { length: 20 }).default('MONTHLY'),
	nextBillingDate: date("next_billing_date"),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: char({ length: 3 }).default('USD'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own billing schedules", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage billing schedules", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userAgreements = pgTable("user_agreements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	agreementType: varchar("agreement_type", { length: 50 }).notNull(),
	versionNumber: varchar("version_number", { length: 20 }).notNull(),
	agreedAt: timestamp("agreed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	documentUrl: text("document_url"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own agreements", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage agreements", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userPayments = pgTable("user_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	subscriptionId: uuid("subscription_id"),
	paymentMethodId: uuid("payment_method_id"),
	provider: varchar({ length: 20 }).default('stripe').notNull(),
	providerPaymentId: varchar("provider_payment_id", { length: 255 }),
	providerInvoiceId: varchar("provider_invoice_id", { length: 255 }),
	providerChargeId: varchar("provider_charge_id", { length: 255 }),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: char({ length: 3 }).default('USD'),
	paymentType: varchar("payment_type", { length: 20 }).notNull(),
	paymentDate: timestamp("payment_date", { withTimezone: true, mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	isFirstPayment: boolean("is_first_payment").default(false),
	failureReason: text("failure_reason"),
	receiptUrl: text("receipt_url"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own payments", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage payments", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userPaymentMethods = pgTable("user_payment_methods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	provider: varchar({ length: 20 }).default('stripe').notNull(),
	methodType: varchar("method_type", { length: 20 }).notNull(),
	methodSubtype: varchar("method_subtype", { length: 20 }),
	providerPaymentMethodId: text("provider_payment_method_id"),
	lastFour: varchar("last_four", { length: 4 }),
	brand: varchar({ length: 20 }),
	expiresMonth: integer("expires_month"),
	expiresYear: integer("expires_year"),
	isDefault: boolean("is_default").default(false),
	isActive: boolean("is_active").default(true),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own payment methods", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage payment methods", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userSubscriptions = pgTable("user_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	provider: varchar({ length: 20 }).default('stripe').notNull(),
	providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }).notNull(),
	providerCustomerId: varchar("provider_customer_id", { length: 255 }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: 'string' }).notNull(),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }).notNull(),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	trialEnd: timestamp("trial_end", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own subscriptions", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage subscriptions", { as: "permissive", for: "all", to: ["public"] }),
]);

export const systemAuditLogs = pgTable("system_audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	adminId: integer("admin_id"),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: uuid("entity_id"),
	action: varchar({ length: 50 }).notNull(),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	success: boolean().notNull(),
	errorMessage: text("error_message"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can view their own audit logs", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
	pgPolicy("Service can manage audit logs", { as: "permissive", for: "all", to: ["public"] }),
]);

export const payoutManagement = pgTable("payout_management", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payoutId: text("payout_id").default(sql`gen_random_uuid()`).notNull(),
	userId: uuid("user_id").notNull(),
	queuePosition: integer("queue_position").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).default('100000.00').notNull(),
	currency: text().default('USD'),
	status: text().default('pending_approval').notNull(),
	eligibilityCheck: jsonb("eligibility_check").default({}),
	approvalWorkflow: jsonb("approval_workflow").default([]),
	scheduledDate: timestamp("scheduled_date", { withTimezone: true, mode: 'string' }),
	paymentMethod: text("payment_method").default('ach').notNull(),
	bankDetails: jsonb("bank_details"),
	taxWithholding: jsonb("tax_withholding"),
	processing: jsonb(),
	receiptUrl: text("receipt_url"),
	internalNotes: jsonb("internal_notes").default([]),
	auditTrail: jsonb("audit_trail").default([]),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payout_management_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_payout_management_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payout_management_user_id_fkey"
		}),
	unique("payout_management_payout_id_key").on(table.payoutId),
	check("payout_management_payment_method_check", sql`payment_method = ANY (ARRAY['ach'::text, 'wire'::text, 'check'::text, 'paypal'::text])`),
	check("payout_management_status_check", sql`status = ANY (ARRAY['pending_approval'::text, 'approved'::text, 'scheduled'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const userAuditLogs = pgTable("user_audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	adminId: integer("admin_id"),
	entityType: varchar("entity_type").notNull(),
	entityId: uuid("entity_id"),
	action: varchar().notNull(),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	success: boolean().notNull(),
	errorMessage: text("error_message"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_user_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_user_audit_logs_entity_type").using("btree", table.entityType.asc().nullsLast().op("text_ops")),
	index("idx_user_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
]);

export const taxForms = pgTable("tax_forms", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	formId: text("form_id").default(sql`gen_random_uuid()`).notNull(),
	userId: uuid("user_id").notNull(),
	formType: text("form_type").notNull(),
	taxYear: integer("tax_year").notNull(),
	status: text().default('pending').notNull(),
	recipientInfo: jsonb("recipient_info").default({}).notNull(),
	payerInfo: jsonb("payer_info").default({}),
	incomeDetails: jsonb("income_details").default({}),
	w9Data: jsonb("w9_data").default({}),
	generation: jsonb().default({}),
	delivery: jsonb().default({}),
	irsFiling: jsonb("irs_filing").default({}),
	corrections: jsonb().default([]),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_tax_forms_tax_year").using("btree", table.taxYear.asc().nullsLast().op("int4_ops")),
	index("idx_tax_forms_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tax_forms_user_id_fkey"
		}),
	unique("tax_forms_form_id_key").on(table.formId),
	check("tax_forms_form_type_check", sql`form_type = ANY (ARRAY['W-9'::text, '1099-MISC'::text, '1099-NEC'::text, '1099-K'::text, 'W-8BEN'::text])`),
	check("tax_forms_status_check", sql`status = ANY (ARRAY['pending'::text, 'generated'::text, 'sent'::text, 'filed_with_irs'::text, 'corrected'::text])`),
]);

export const auditlog = pgTable("auditlog", {
	id: serial().primaryKey().notNull(),
	adminIDIdId: integer("admin_i_d_id_id").notNull(),
	entityChanged: varchar("entity_changed").notNull(),
	entityId: numeric("entity_id"),
	changeType: enumAuditlogChangeType("change_type").notNull(),
	timestamp: timestamp({ precision: 3, withTimezone: true, mode: 'string' }).notNull(),
	changeDetails: jsonb("change_details"),
	updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const kycStatuses = pgTable("kyc_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const kycVerification = pgTable("kyc_verification", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	verificationMethod: text("verification_method"),
	documentType: text("document_type"),
	documentNumber: text("document_number"),
	documentFrontUrl: text("document_front_url"),
	documentBackUrl: text("document_back_url"),
	selfieUrl: text("selfie_url"),
	verificationProvider: text("verification_provider"),
	providerVerificationId: text("provider_verification_id"),
	verificationData: jsonb("verification_data").default({}),
	reviewAnswer: text("review_answer"),
	reviewRejectType: text("review_reject_type"),
	clientComment: text("client_comment"),
	moderationComment: text("moderation_comment"),
	applicantType: text("applicant_type"),
	clientUserId: text("client_user_id"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	dob: date("dob"),
	gender: text("gender"),
	country: text("country"),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	reviewerId: integer("reviewer_id"),
	reviewerNotes: text("reviewer_notes"),
	riskScore: integer("risk_score"),
	riskFactors: jsonb("risk_factors").default([]),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	geolocation: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	kycStatusId: integer("kyc_status_id").default(1).notNull(),
}, (table) => [
	index("idx_kyc_verification_status_id").using("btree", table.kycStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_kyc_verification_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.kycStatusId],
			foreignColumns: [kycStatuses.id],
			name: "kyc_verification_kyc_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "kyc_verification_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const adminAlerts = pgTable("admin_alerts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	alertId: text("alert_id").default(sql`gen_random_uuid()`).notNull(),
	title: text().notNull(),
	message: text().notNull(),
	severity: text().default('info').notNull(),
	category: text().notNull(),
	status: text().default('new').notNull(),
	relatedEntity: jsonb("related_entity"),
	triggerInfo: jsonb("trigger_info"),
	assignedTo: integer("assigned_to"),
	acknowledgedBy: integer("acknowledged_by"),
	acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: 'string' }),
	resolvedBy: integer("resolved_by"),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	resolutionNotes: text("resolution_notes"),
	notificationsSent: jsonb("notifications_sent").default([]),
	escalation: jsonb(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_alerts_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_admin_alerts_severity_status").using("btree", table.severity.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	unique("admin_alerts_alert_id_key").on(table.alertId),
	check("admin_alerts_category_check", sql`category = ANY (ARRAY['system'::text, 'security'::text, 'payment'::text, 'queue'::text, 'compliance'::text])`),
	check("admin_alerts_severity_check", sql`severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])`),
	check("admin_alerts_status_check", sql`status = ANY (ARRAY['new'::text, 'acknowledged'::text, 'investigating'::text, 'resolved'::text])`),
]);

export const reportTemplates = pgTable("report_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	dataSource: text("data_source").notNull(),
	queryConfig: jsonb("query_config").default({}),
	columns: jsonb().default([]).notNull(),
	visualizations: jsonb().default([]),
	schedule: jsonb().default({}),
	delivery: jsonb().default({}),
	isActive: boolean("is_active").default(true),
	isSystemReport: boolean("is_system_report").default(false),
	createdBy: integer("created_by"),
	lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: 'string' }),
	lastRunStatus: text("last_run_status"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("report_templates_category_check", sql`category = ANY (ARRAY['financial'::text, 'compliance'::text, 'operations'::text, 'analytics'::text, 'custom'::text])`),
]);

export const disputes = pgTable("disputes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	disputeId: text("dispute_id").notNull(),
	paymentId: uuid("payment_id"),
	userId: uuid("user_id").notNull(),
	type: text().notNull(),
	status: text().default('needs_response').notNull(),
	reason: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('USD'),
	stripeDisputeId: text("stripe_dispute_id"),
	customerMessage: text("customer_message"),
	respondBy: timestamp("respond_by", { withTimezone: true, mode: 'string' }).notNull(),
	evidence: jsonb().default({}),
	assignedTo: integer("assigned_to"),
	internalNotes: jsonb("internal_notes").default([]),
	resolution: jsonb(),
	impact: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_disputes_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_disputes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "disputes_user_id_fkey"
		}),
	unique("disputes_dispute_id_key").on(table.disputeId),
	check("disputes_status_check", sql`status = ANY (ARRAY['needs_response'::text, 'evidence_submitted'::text, 'under_review'::text, 'won'::text, 'lost'::text, 'warning_closed'::text])`),
	check("disputes_type_check", sql`type = ANY (ARRAY['chargeback'::text, 'refund_request'::text, 'fraud_claim'::text, 'duplicate_charge'::text])`),
]);

export const transactionMonitoring = pgTable("transaction_monitoring", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transactionId: uuid("transaction_id").notNull(),
	userId: uuid("user_id").notNull(),
	transactionType: text("transaction_type").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('USD'),
	riskLevel: text("risk_level").default('low').notNull(),
	riskScore: integer("risk_score"),
	status: text().default('pending_review').notNull(),
	flags: jsonb().default([]),
	amlCheck: jsonb("aml_check").default({}),
	velocityCheck: jsonb("velocity_check").default({}),
	deviceFingerprint: jsonb("device_fingerprint").default({}),
	geographicData: jsonb("geographic_data").default({}),
	reviewerId: integer("reviewer_id"),
	reviewerNotes: text("reviewer_notes"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	actionTaken: text("action_taken"),
	sarFiled: boolean("sar_filed").default(false),
	sarFiledAt: timestamp("sar_filed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_transaction_monitoring_risk_level").using("btree", table.riskLevel.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_transaction_monitoring_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transaction_monitoring_user_id_fkey"
		}),
	check("transaction_monitoring_risk_level_check", sql`risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])`),
	check("transaction_monitoring_risk_score_check", sql`(risk_score >= 0) AND (risk_score <= 100)`),
	check("transaction_monitoring_status_check", sql`status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'flagged'::text, 'blocked'::text, 'escalated'::text])`),
	check("transaction_monitoring_transaction_type_check", sql`transaction_type = ANY (ARRAY['payment'::text, 'payout'::text, 'refund'::text, 'chargeback'::text])`),
]);

export const userSettings = pgTable("user_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	emailNotifications: boolean("email_notifications").default(true),
	smsNotifications: boolean("sms_notifications").default(false),
	pushNotifications: boolean("push_notifications").default(true),
	marketingEmails: boolean("marketing_emails").default(false),
	twoFactorAuth: boolean("two_factor_auth").default(false),
	twoFactorSecret: text("two_factor_secret"),
	loginAlerts: boolean("login_alerts").default(true),
	sessionTimeout: integer("session_timeout").default(30),
	profileVisibility: text("profile_visibility").default('private'),
	dataSharing: boolean("data_sharing").default(false),
	theme: text().default('light'),
	language: text().default('en'),
	autoRenewal: boolean("auto_renewal").default(true),
	paymentMethod: text("payment_method").default('card'),
	billingCycle: text("billing_cycle").default('monthly'),
	timezone: text().default('UTC'),
	dateFormat: text("date_format").default('MM/DD/YYYY'),
	currency: text().default('USD'),
}, (table) => [
	index("idx_user_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_settings_user_id_key").on(table.userId),
	pgPolicy("Users can view their own settings", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own settings", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own settings", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete their own settings", { as: "permissive", for: "delete", to: ["public"] }),
	check("user_settings_billing_cycle_check", sql`billing_cycle = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text])`),
	check("user_settings_currency_check", sql`currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text, 'CAD'::text, 'AUD'::text, 'JPY'::text, 'CNY'::text])`),
	check("user_settings_date_format_check", sql`date_format = ANY (ARRAY['MM/DD/YYYY'::text, 'DD/MM/YYYY'::text, 'YYYY-MM-DD'::text])`),
	check("user_settings_language_check", sql`language = ANY (ARRAY['en'::text, 'es'::text, 'fr'::text, 'de'::text, 'it'::text, 'pt'::text, 'zh'::text, 'ja'::text, 'ko'::text])`),
	check("user_settings_payment_method_check", sql`payment_method = ANY (ARRAY['card'::text, 'bank'::text, 'paypal'::text, 'crypto'::text])`),
	check("user_settings_profile_visibility_check", sql`profile_visibility = ANY (ARRAY['public'::text, 'private'::text, 'friends'::text])`),
	check("user_settings_theme_check", sql`theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])`),
]);

export const userNotificationPreferences = pgTable("user_notification_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	emailPaymentReminders: boolean("email_payment_reminders").default(true),
	emailTenureUpdates: boolean("email_tenure_updates").default(true),
	emailSecurityAlerts: boolean("email_security_alerts").default(true),
	emailSystemUpdates: boolean("email_system_updates").default(false),
	emailNewsletter: boolean("email_newsletter").default(false),
	smsPaymentReminders: boolean("sms_payment_reminders").default(false),
	smsSecurityAlerts: boolean("sms_security_alerts").default(true),
	smsUrgentUpdates: boolean("sms_urgent_updates").default(true),
	pushPaymentReminders: boolean("push_payment_reminders").default(true),
	pushTenureUpdates: boolean("push_tenure_updates").default(true),
	pushSecurityAlerts: boolean("push_security_alerts").default(true),
	pushSystemUpdates: boolean("push_system_updates").default(false),
	emailFrequency: text("email_frequency").default('immediate'),
	smsFrequency: text("sms_frequency").default('urgent_only'),
	pushFrequency: text("push_frequency").default('immediate'),
}, (table) => [
	index("idx_user_notification_preferences_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_notification_preferences_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_notification_preferences_user_id_key").on(table.userId),
	pgPolicy("Users can view their own notification preferences", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own notification preferences", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own notification preferences", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete their own notification preferences", { as: "permissive", for: "delete", to: ["public"] }),
	check("user_notification_preferences_email_frequency_check", sql`email_frequency = ANY (ARRAY['immediate'::text, 'daily'::text, 'weekly'::text, 'monthly'::text])`),
	check("user_notification_preferences_push_frequency_check", sql`push_frequency = ANY (ARRAY['immediate'::text, 'daily'::text, 'weekly'::text, 'never'::text])`),
	check("user_notification_preferences_sms_frequency_check", sql`sms_frequency = ANY (ARRAY['immediate'::text, 'urgent_only'::text, 'never'::text])`),
]);

export const userSecuritySettings = pgTable("user_security_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	twoFactorSecret: text("two_factor_secret"),
	twoFactorBackupCodes: text("two_factor_backup_codes").array(),
	twoFactorLastUsed: timestamp("two_factor_last_used", { withTimezone: true, mode: 'string' }),
	loginAlerts: boolean("login_alerts").default(true),
	sessionTimeout: integer("session_timeout").default(30),
	maxConcurrentSessions: integer("max_concurrent_sessions").default(3),
	passwordLastChanged: timestamp("password_last_changed", { withTimezone: true, mode: 'string' }),
	passwordStrengthScore: integer("password_strength_score").default(0),
	requirePasswordChange: boolean("require_password_change").default(false),
	trustedDevices: jsonb("trusted_devices").default([]),
	deviceFingerprintRequired: boolean("device_fingerprint_required").default(false),
	securityQuestions: jsonb("security_questions").default([]),
}, (table) => [
	index("idx_user_security_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_security_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_security_settings_user_id_key").on(table.userId),
	pgPolicy("Users can view their own security settings", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own security settings", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own security settings", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete their own security settings", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const userPaymentSettings = pgTable("user_payment_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	autoRenewal: boolean("auto_renewal").default(true),
	paymentMethod: text("payment_method").default('card'),
	billingCycle: text("billing_cycle").default('monthly'),
	billingAddress: jsonb("billing_address"),
	taxId: text("tax_id"),
	savedPaymentMethods: jsonb("saved_payment_methods").default([]),
	defaultPaymentMethodId: text("default_payment_method_id"),
	invoiceDelivery: text("invoice_delivery").default('email'),
	paymentReminders: boolean("payment_reminders").default(true),
	paymentReminderDays: integer("payment_reminder_days").default(3),
	currency: text().default('USD'),
	taxRate: numeric("tax_rate", { precision: 5, scale:  4 }).default('0.0000'),
}, (table) => [
	index("idx_user_payment_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_payment_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_payment_settings_user_id_key").on(table.userId),
	pgPolicy("Users can view their own payment settings", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own payment settings", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own payment settings", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete their own payment settings", { as: "permissive", for: "delete", to: ["public"] }),
	check("user_payment_settings_billing_cycle_check", sql`billing_cycle = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text])`),
	check("user_payment_settings_currency_check", sql`currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text, 'CAD'::text, 'AUD'::text, 'JPY'::text, 'CNY'::text, 'BRL'::text, 'MXN'::text])`),
	check("user_payment_settings_invoice_delivery_check", sql`invoice_delivery = ANY (ARRAY['email'::text, 'mail'::text, 'both'::text])`),
	check("user_payment_settings_payment_method_check", sql`payment_method = ANY (ARRAY['card'::text, 'bank'::text, 'paypal'::text, 'crypto'::text, 'apple_pay'::text, 'google_pay'::text])`),
]);

export const userPrivacySettings = pgTable("user_privacy_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	profileVisibility: text("profile_visibility").default('private'),
	showTenureMonths: boolean("show_tenure_months").default(true),
	showJoinDate: boolean("show_join_date").default(true),
	showActivityStatus: boolean("show_activity_status").default(true),
	dataSharing: boolean("data_sharing").default(false),
	analyticsConsent: boolean("analytics_consent").default(false),
	marketingConsent: boolean("marketing_consent").default(false),
	thirdPartySharing: boolean("third_party_sharing").default(false),
	showEmail: boolean("show_email").default(false),
	showPhone: boolean("show_phone").default(false),
	showAddress: boolean("show_address").default(false),
	showLoginActivity: boolean("show_login_activity").default(false),
	showPaymentHistory: boolean("show_payment_history").default(false),
	showTenureProgress: boolean("show_tenure_progress").default(true),
	searchable: boolean().default(true),
	appearInLeaderboards: boolean("appear_in_leaderboards").default(true),
	showInMemberDirectory: boolean("show_in_member_directory").default(false),
	dataRetentionPeriod: integer("data_retention_period").default(365),
	autoDeleteInactive: boolean("auto_delete_inactive").default(false),
	inactivePeriod: integer("inactive_period").default(730),
}, (table) => [
	index("idx_user_privacy_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_privacy_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_privacy_settings_user_id_key").on(table.userId),
	pgPolicy("Users can view their own privacy settings", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own privacy settings", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own privacy settings", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete their own privacy settings", { as: "permissive", for: "delete", to: ["public"] }),
	check("user_privacy_settings_profile_visibility_check", sql`profile_visibility = ANY (ARRAY['public'::text, 'private'::text, 'friends'::text, 'members_only'::text])`),
]);

export const userAppearanceSettings = pgTable("user_appearance_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	theme: text().default('light'),
	accentColor: text("accent_color").default('blue'),
	language: text().default('en'),
	timezone: text().default('UTC'),
	dateFormat: text("date_format").default('MM/DD/YYYY'),
	timeFormat: text("time_format").default('12'),
	fontSize: text("font_size").default('medium'),
	compactMode: boolean("compact_mode").default(false),
	showAnimations: boolean("show_animations").default(true),
	reduceMotion: boolean("reduce_motion").default(false),
	dashboardLayout: text("dashboard_layout").default('default'),
	sidebarCollapsed: boolean("sidebar_collapsed").default(false),
	showTooltips: boolean("show_tooltips").default(true),
	notificationPosition: text("notification_position").default('top-right'),
	notificationDuration: integer("notification_duration").default(5000),
}, (table) => [
	index("idx_user_appearance_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_appearance_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_appearance_settings_user_id_key").on(table.userId),
	pgPolicy("Users can view their own appearance settings", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own appearance settings", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own appearance settings", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete their own appearance settings", { as: "permissive", for: "delete", to: ["public"] }),
	check("user_appearance_settings_accent_color_check", sql`accent_color = ANY (ARRAY['blue'::text, 'green'::text, 'purple'::text, 'red'::text, 'orange'::text, 'pink'::text, 'indigo'::text, 'teal'::text])`),
	check("user_appearance_settings_dashboard_layout_check", sql`dashboard_layout = ANY (ARRAY['default'::text, 'compact'::text, 'detailed'::text])`),
	check("user_appearance_settings_date_format_check", sql`date_format = ANY (ARRAY['MM/DD/YYYY'::text, 'DD/MM/YYYY'::text, 'YYYY-MM-DD'::text])`),
	check("user_appearance_settings_font_size_check", sql`font_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text, 'extra_large'::text])`),
	check("user_appearance_settings_language_check", sql`language = ANY (ARRAY['en'::text, 'es'::text, 'fr'::text, 'de'::text, 'it'::text, 'pt'::text, 'zh'::text, 'ja'::text, 'ko'::text, 'ru'::text, 'ar'::text, 'hi'::text])`),
	check("user_appearance_settings_notification_position_check", sql`notification_position = ANY (ARRAY['top-left'::text, 'top-right'::text, 'bottom-left'::text, 'bottom-right'::text])`),
	check("user_appearance_settings_theme_check", sql`theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])`),
	check("user_appearance_settings_time_format_check", sql`time_format = ANY (ARRAY['12'::text, '24'::text])`),
]);

export const verification = pgTable("verification", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const user = pgTable("user", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().default(false).notNull(),
	password: text(),
	image: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_key").on(table.email),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	token: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	activeOrganizationId: text("active_organization_id"),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "session_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const account = pgTable("account", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	scope: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const passkey = pgTable("passkey", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	name: text(),
	credentialId: text().notNull(),
	publicKey: text().notNull(),
	counter: integer().default(0).notNull(),
	deviceType: text(),
	backedUp: boolean().default(false),
	transports: text().array(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "passkey_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("passkey_credentialId_key").on(table.credentialId),
]);

export const twoFactor = pgTable("two_factor", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	secret: text().notNull(),
	backupCodes: text().array(),
	verified: boolean().default(false).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	verifiedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "two_factor_userId_user_id_fk"
		}).onDelete("cascade"),
	unique("two_factor_userId_key").on(table.userId),
]);

export const organization = pgTable("organization", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logo: text(),
	metadata: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("organization_slug_key").on(table.slug),
]);

export const organizationMember = pgTable("organization_member", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid().notNull(),
	userId: uuid().notNull(),
	role: varchar({ length: 20 }).default('member').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "organization_member_organizationId_organization_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "organization_member_userId_user_id_fk"
		}).onDelete("cascade"),
]);

export const organizationInvitation = pgTable("organization_invitation", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid().notNull(),
	email: text().notNull(),
	role: varchar({ length: 20 }).default('member').notNull(),
	inviterId: uuid().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	token: text().notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.inviterId],
			foreignColumns: [user.id],
			name: "organization_invitation_inviterId_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "organization_invitation_organizationId_organization_id_fk"
		}).onDelete("cascade"),
	unique("organization_invitation_token_key").on(table.token),
]);
