import { pgTable, index, unique, uuid, varchar, timestamp, boolean, serial, integer, numeric, jsonb, foreignKey, check, text, date, inet, uniqueIndex, char, pgPolicy, pgView, pgMaterializedView, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const actionType = pgEnum("action_type", ['login', 'logout', 'create', 'update', 'delete', 'view', 'export'])
export const adminRole = pgEnum("admin_role", ['super_admin', 'admin', 'moderator'])
export const betterAuthInvitationStatus = pgEnum("better_auth_invitation_status", ['pending', 'accepted', 'declined', 'expired'])
export const disputeType = pgEnum("dispute_type", ['charge_dispute', 'fraudulent', 'duplicate', 'product_not_received', 'product_unacceptable', 'subscription_canceled', 'unrecognized', 'other'])
export const signupSessionStatus = pgEnum("signup_session_status", ['active', 'completed', 'expired'])
export const transactionRiskLevel = pgEnum("transaction_risk_level", ['low', 'medium', 'high', 'critical'])


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
	unique("verification_codes_link_token_unique").on(table.linkToken),
]);

export const payloadLockedDocumentsRels = pgTable("payload_locked_documents_rels", {
	id: serial().primaryKey().notNull(),
	order: integer(),
	parentId: integer("parent_id").notNull(),
	path: varchar().notNull(),
	adminId: integer("admin_id"),
	usersId: integer("users_id"),
}, (table) => [
	index("idx_payload_locked_documents_rels_admin_id").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("idx_payload_locked_documents_rels_parent_id").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
	index("idx_payload_locked_documents_rels_path").using("btree", table.path.asc().nullsLast().op("text_ops")),
	index("idx_payload_locked_documents_rels_users_id").using("btree", table.usersId.asc().nullsLast().op("int4_ops")),
]);

export const payloadLockedDocuments = pgTable("payload_locked_documents", {
	id: serial().primaryKey().notNull(),
	globalSlug: varchar("global_slug"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payload_locked_documents_global_slug").using("btree", table.globalSlug.asc().nullsLast().op("text_ops")),
]);

export const payloadMigrations = pgTable("payload_migrations", {
	id: serial().primaryKey().notNull(),
	name: varchar(),
	batch: numeric(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const payloadPreferences = pgTable("payload_preferences", {
	id: serial().primaryKey().notNull(),
	key: varchar(),
	value: jsonb(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payload_preferences_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
]);

export const payloadPreferencesRels = pgTable("payload_preferences_rels", {
	id: serial().primaryKey().notNull(),
	order: integer(),
	parentId: integer("parent_id").notNull(),
	path: varchar().notNull(),
	adminId: integer("admin_id"),
}, (table) => [
	index("idx_payload_preferences_rels_admin_id").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("idx_payload_preferences_rels_parent_id").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
	index("idx_payload_preferences_rels_path").using("btree", table.path.asc().nullsLast().op("text_ops")),
]);

export const newsfeedposts = pgTable("newsfeedposts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	publishDate: timestamp("publish_date", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	priority: varchar({ length: 20 }).default('medium'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	postStatusId: integer("post_status_id").default(2).notNull(),
}, (table) => [
	index("idx_newsfeedposts_publish_date").using("btree", table.publishDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_newsfeedposts_status_id").using("btree", table.postStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_newsfeedposts_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.postStatusId],
			foreignColumns: [postStatuses.id],
			name: "newsfeedposts_post_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "newsfeedposts_user_id_fkey"
		}).onDelete("cascade"),
	check("newsfeedposts_priority_check", sql`(priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])`),
]);

export const adminActivityLogs = pgTable("admin_activity_logs", {
	id: serial().primaryKey().notNull(),
	adminId: integer("admin_id"),
	sessionId: text("session_id"),
	action: varchar({ length: 50 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	deviceInfo: jsonb("device_info"),
	locationInfo: jsonb("location_info"),
	success: boolean().default(true),
	errorMessage: text("error_message"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_activity_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_admin_activity_logs_admin_id").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("idx_admin_activity_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_admin_activity_logs_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admin.id],
			name: "admin_activity_logs_admin_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [adminSessions.id],
			name: "admin_activity_logs_session_id_fkey"
		}).onDelete("set null"),
]);

export const userAddresses = pgTable("user_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	addressType: varchar("address_type", { length: 20 }).default('primary'),
	streetAddress: varchar("street_address", { length: 255 }).notNull(),
	addressLine2: varchar("address_line_2", { length: 255 }),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 100 }).notNull(),
	postalCode: varchar("postal_code", { length: 20 }).notNull(),
	countryCode: varchar("country_code", { length: 2 }).default('US'),
	isPrimary: boolean("is_primary").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_addresses_primary").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isPrimary.asc().nullsLast().op("bool_ops")),
	index("idx_user_addresses_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_addresses_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userProfiles = pgTable("user_profiles", {
	id: varchar().primaryKey().notNull(),
	userId: uuid("user_id"),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	middleName: varchar("middle_name"),
	dateOfBirth: date("date_of_birth"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_profiles_name").using("btree", table.firstName.asc().nullsLast().op("text_ops"), table.lastName.asc().nullsLast().op("text_ops")),
	index("idx_user_profiles_names").using("btree", table.firstName.asc().nullsLast().op("text_ops"), table.lastName.asc().nullsLast().op("text_ops")),
	index("idx_user_profiles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userContacts = pgTable("user_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	contactType: varchar("contact_type", { length: 20 }).notNull(),
	contactValue: varchar("contact_value", { length: 255 }).notNull(),
	isPrimary: boolean("is_primary").default(false),
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	countryCode: varchar("country_code", { length: 10 }),
}, (table) => [
	index("idx_user_contacts_primary").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isPrimary.asc().nullsLast().op("bool_ops")),
	index("idx_user_contacts_type").using("btree", table.contactType.asc().nullsLast().op("text_ops")),
	index("idx_user_contacts_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_contacts_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_contacts_user_id_contact_type_contact_value_key").on(table.userId, table.contactType, table.contactValue),
	unique("user_contacts_contact_value_key").on(table.contactValue),
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
	index("idx_membership_queue_eligible").using("btree", table.isEligible.asc().nullsLast().op("bool_ops")),
	index("idx_membership_queue_position").using("btree", table.queuePosition.asc().nullsLast().op("int4_ops")),
	index("idx_membership_queue_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "membership_queue_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("membership_queue_user_id_unique").on(table.userId),
]);

export const admin2FaCodes = pgTable("admin_2fa_codes", {
	id: serial().primaryKey().notNull(),
	adminId: integer("admin_id"),
	code: varchar({ length: 64 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	used: boolean().default(false),
	attempts: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_2fa_codes_admin_id").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("idx_admin_2fa_codes_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("idx_admin_2fa_codes_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admin.id],
			name: "admin_2fa_codes_admin_id_fkey"
		}).onDelete("cascade"),
]);

export const userMemberships = pgTable("user_memberships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	joinDate: date("join_date").defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	subscriptionId: uuid("subscription_id"),
	memberStatusId: integer("member_status_id").default(1).notNull(),
	verificationStatusId: integer("verification_status_id").default(1),
	memberEligibilityStatusId: integer("member_eligibility_status_id").default(1),
}, (table) => [
	index("idx_user_memberships_join_date").using("btree", table.joinDate.asc().nullsLast().op("date_ops")),
	index("idx_user_memberships_status_id").using("btree", table.memberStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_user_memberships_subscription_id").using("btree", table.subscriptionId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_memberships_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_memberships_verification_status_id").using("btree", table.verificationStatusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.memberStatusId],
			foreignColumns: [memberEligibilityStatuses.id],
			name: "user_memberships_member_eligibility_status_id_fkey"
		}),
	foreignKey({
			columns: [table.memberEligibilityStatusId],
			foreignColumns: [memberEligibilityStatuses.id],
			name: "user_memberships_member_eligibility_status_id_fkey1"
		}),
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [userSubscriptions.id],
			name: "user_memberships_subscription_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_memberships_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.verificationStatusId],
			foreignColumns: [verificationStatuses.id],
			name: "user_memberships_verification_status_id_fkey"
		}),
	unique("user_memberships_subscription_id_unique").on(table.subscriptionId),
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
	index("idx_system_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_system_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_system_audit_logs_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("idx_system_audit_logs_success").using("btree", table.success.asc().nullsLast().op("bool_ops")),
	index("idx_system_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "system_audit_logs_user_id_users_id_fk"
		}).onDelete("set null"),
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
	isFirstPayment: boolean("is_first_payment").default(false),
	failureReason: text("failure_reason"),
	receiptUrl: text("receipt_url"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	paymentStatusId: integer("payment_status_id").default(1).notNull(),
	status: varchar({ length: 50 }).default('completed').notNull(),
}, (table) => [
	index("idx_user_payments_date").using("btree", table.paymentDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_user_payments_provider_invoice_id").using("btree", table.providerInvoiceId.asc().nullsLast().op("text_ops")).where(sql`(provider_invoice_id IS NOT NULL)`),
	index("idx_user_payments_provider_payment_id").using("btree", table.providerPaymentId.asc().nullsLast().op("text_ops")).where(sql`(provider_payment_id IS NOT NULL)`),
	index("idx_user_payments_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_user_payments_status_id").using("btree", table.paymentStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_user_payments_subscription_id").using("btree", table.subscriptionId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_payments_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("unique_provider_invoice_id").using("btree", table.providerInvoiceId.asc().nullsLast().op("text_ops")).where(sql`(provider_invoice_id IS NOT NULL)`),
	uniqueIndex("unique_provider_payment_id").using("btree", table.providerPaymentId.asc().nullsLast().op("text_ops")).where(sql`(provider_payment_id IS NOT NULL)`),
	foreignKey({
			columns: [table.paymentStatusId],
			foreignColumns: [paymentStatuses.id],
			name: "user_payments_payment_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_payments_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userAgreements = pgTable("user_agreements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	agreementType: varchar("agreement_type", { length: 50 }).notNull(),
	versionNumber: varchar("version_number", { length: 20 }).notNull(),
	agreedAt: timestamp("agreed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	documentUrl: text("document_url"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_agreements_type").using("btree", table.agreementType.asc().nullsLast().op("text_ops")),
	index("idx_user_agreements_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_agreements_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_agreements_user_id_agreement_type_version_number_key").on(table.userId, table.agreementType, table.versionNumber),
]);

export const userBillingSchedules = pgTable("user_billing_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	subscriptionId: uuid("subscription_id"),
	billingCycle: varchar("billing_cycle", { length: 20 }).default('MONTHLY'),
	nextBillingDate: timestamp("next_billing_date", { mode: 'string' }),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: char({ length: 3 }).default('USD'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_billing_schedules_next_billing").using("btree", table.nextBillingDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_user_billing_schedules_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [userSubscriptions.id],
			name: "user_billing_schedules_subscription_id_user_subscriptions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_billing_schedules_user_id_users_id_fk"
		}).onDelete("cascade"),
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
	index("idx_user_payment_methods_active").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("uuid_ops")),
	index("idx_user_payment_methods_default").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isDefault.asc().nullsLast().op("bool_ops")),
	index("idx_user_payment_methods_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_payment_methods_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_payment_methods_user_id_provider_payment_method_id_key").on(table.userId, table.providerPaymentMethodId),
]);

export const userSubscriptions = pgTable("user_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	provider: varchar({ length: 20 }).default('stripe').notNull(),
	providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }).notNull(),
	providerCustomerId: varchar("provider_customer_id", { length: 255 }).notNull(),
	currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: 'string' }).notNull(),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }).notNull(),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	trialEnd: timestamp("trial_end", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	subscriptionStatusId: integer("subscription_status_id").default(1).notNull(),
}, (table) => [
	index("idx_user_subscriptions_provider_id").using("btree", table.providerSubscriptionId.asc().nullsLast().op("text_ops")),
	index("idx_user_subscriptions_status_id").using("btree", table.subscriptionStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_user_subscriptions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.subscriptionStatusId],
			foreignColumns: [subscriptionStatuses.id],
			name: "user_subscriptions_subscription_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_subscriptions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const payoutManagement = pgTable("payout_management", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	payoutId: text("payout_id").notNull(),
	userId: uuid("user_id").notNull(),
	queuePosition: integer("queue_position").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).default('100000.00').notNull(),
	currency: text().default('USD'),
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
	membershipId: uuid("membership_id"),
	payoutStatusId: integer("payout_status_id").default(1).notNull(),
}, (table) => [
	index("idx_payout_management_membership_id").using("btree", table.membershipId.asc().nullsLast().op("uuid_ops")),
	index("idx_payout_management_status_id").using("btree", table.payoutStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_payout_management_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.membershipId],
			foreignColumns: [userMemberships.id],
			name: "payout_management_membership_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.payoutStatusId],
			foreignColumns: [payoutStatuses.id],
			name: "payout_management_payout_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payout_management_user_id_users_id_fk"
		}),
	unique("payout_management_payout_id_unique").on(table.payoutId),
]);

export const memberEligibilityStatuses = pgTable("member_eligibility_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const kycStatuses = pgTable("kyc_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

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
	index("idx_user_audit_logs_success").using("btree", table.success.asc().nullsLast().op("bool_ops")),
	index("idx_user_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	pgPolicy("Service role can access all audit logs", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const taxForms = pgTable("tax_forms", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	formId: text("form_id").default(sql`gen_random_uuid()`).notNull(),
	userId: uuid("user_id").notNull(),
	formType: text("form_type").notNull(),
	taxYear: integer("tax_year").notNull(),
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
	taxFormStatusId: integer("tax_form_status_id").default(1).notNull(),
}, (table) => [
	index("idx_tax_forms_form_id").using("btree", table.formId.asc().nullsLast().op("text_ops")),
	index("idx_tax_forms_form_type").using("btree", table.formType.asc().nullsLast().op("text_ops")),
	index("idx_tax_forms_status_id").using("btree", table.taxFormStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_tax_forms_tax_year").using("btree", table.taxYear.asc().nullsLast().op("int4_ops")),
	index("idx_tax_forms_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taxFormStatusId],
			foreignColumns: [taxFormStatuses.id],
			name: "tax_forms_tax_form_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tax_forms_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

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

export const disputes = pgTable("disputes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	disputeId: text("dispute_id").notNull(),
	paymentId: uuid("payment_id"),
	userId: uuid("user_id").notNull(),
	type: text().notNull(),
	reason: text().notNull(),
	amount: numeric().notNull(),
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
	disputeStatusId: integer("dispute_status_id").default(1).notNull(),
}, (table) => [
	index("idx_disputes_dispute_id").using("btree", table.disputeId.asc().nullsLast().op("text_ops")),
	index("idx_disputes_status_id").using("btree", table.disputeStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_disputes_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("idx_disputes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.disputeStatusId],
			foreignColumns: [disputeStatuses.id],
			name: "disputes_dispute_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "disputes_user_id_users_id_fk"
		}).onDelete("cascade"),
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
			name: "user_appearance_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_appearance_settings_user_id_unique").on(table.userId),
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
			name: "user_notification_preferences_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_notification_preferences_user_id_unique").on(table.userId),
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
			name: "user_payment_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_payment_settings_user_id_unique").on(table.userId),
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
			name: "user_privacy_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_privacy_settings_user_id_unique").on(table.userId),
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
			name: "user_security_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_security_settings_user_id_unique").on(table.userId),
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
			name: "user_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_settings_user_id_unique").on(table.userId),
]);

export const passkey = pgTable("passkey", {
	id: text().primaryKey().notNull(),
	name: text(),
	publicKey: text("public_key").notNull(),
	userId: uuid("user_id").notNull(),
	counter: integer().notNull(),
	deviceType: text("device_type").notNull(),
	backedUp: boolean("backed_up").notNull(),
	transports: text(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	credentialId: text("credential_id").notNull(),
	aaguid: text(),
}, (table) => [
	index("idx_passkey_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "passkey_user_id_fkey"
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
	index("idx_users_two_factor").using("btree", table.twoFactorEnabled.asc().nullsLast().op("bool_ops")),
	index("idx_users_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userStatusId],
			foreignColumns: [userFunnelStatuses.id],
			name: "users_user_funnel_status_id_fkey"
		}),
	unique("users_email_key").on(table.email),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const adminAccounts = pgTable("admin_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	role: adminRole().default('admin').notNull(),
	twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
	twoFactorMethod: varchar("two_factor_method", { length: 50 }),
	phoneNumber: varchar("phone_number", { length: 50 }),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	adminStatusId: integer("admin_status_id").default(1).notNull(),
}, (table) => [
	index("idx_admin_accounts_status_id").using("btree", table.adminStatusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.adminStatusId],
			foreignColumns: [adminStatuses.id],
			name: "admin_accounts_admin_status_id_fkey"
		}),
	unique("admin_accounts_email_unique").on(table.email),
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
	index("idx_organization_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	unique("organization_slug_unique").on(table.slug),
]);

export const organizationMember = pgTable("organization_member", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid().notNull(),
	userId: uuid().notNull(),
	role: varchar({ length: 20 }).default('member').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_organization_member_org_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_organization_member_role").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("idx_organization_member_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "organization_member_organizationId_organization_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_member_userId_users_id_fk"
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
	index("idx_organization_invitation_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_organization_invitation_org_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_organization_invitation_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_organization_invitation_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.inviterId],
			foreignColumns: [users.id],
			name: "organization_invitation_inviterId_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "organization_invitation_organizationId_organization_id_fk"
		}).onDelete("cascade"),
	unique("organization_invitation_token_unique").on(table.token),
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
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	scope: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	idToken: text("id_token"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	password: text(),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "account_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const twoFactor = pgTable("two_factor", {
	id: text().primaryKey().notNull(),
	secret: text().notNull(),
	backupCodes: text("backup_codes").notNull(),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "two_factor_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	stripePriceId: varchar("stripe_price_id", { length: 255 }),
	planName: varchar("plan_name", { length: 255 }),
	amount: numeric({ precision: 10, scale:  2 }),
	currency: varchar({ length: 3 }).default('usd'),
	interval: varchar({ length: 50 }),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
	canceledAt: timestamp("canceled_at", { mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("subscriptions_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
]);

export const twoFactorAuth = pgTable("two_factor_auth", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminId: uuid("admin_id").notNull(),
	code: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	verified: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [adminAccounts.id],
			name: "two_factor_auth_admin_id_admin_accounts_id_fk"
		}).onDelete("cascade"),
]);

export const subscriptionStatuses = pgTable("subscription_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const admin = pgTable("admin", {
	id: serial().primaryKey().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: varchar().notNull(),
	resetPasswordToken: varchar("reset_password_token"),
	resetPasswordExpiration: timestamp("reset_password_expiration", { withTimezone: true, mode: 'string' }),
	salt: varchar(),
	hash: varchar(),
	loginAttempts: numeric("login_attempts").default('0'),
	lockUntil: timestamp("lock_until", { withTimezone: true, mode: 'string' }),
	role: text().default('Manager').notNull(),
	name: text(),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	twoFactorSecret: text("two_factor_secret"),
	backupCodes: text("backup_codes").array(),
	adminStatusId: integer("admin_status_id").default(1),
	status: text().default('active'),
}, (table) => [
	index("idx_admin_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_admin_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_admin_status_id").using("btree", table.adminStatusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.adminStatusId],
			foreignColumns: [adminStatuses.id],
			name: "admin_admin_status_id_fkey"
		}),
]);

export const adminSessions = pgTable("admin_sessions", {
	id: text().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	adminId: integer("admin_id").notNull(),
	sessionToken: text("session_token").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	lastActivity: timestamp("last_activity", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true),
	logoutAt: timestamp("logout_at", { withTimezone: true, mode: 'string' }),
	logoutReason: varchar("logout_reason", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	token: text(),
}, (table) => [
	index("idx_admin_sessions_admin_id").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("idx_admin_sessions_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_admin_sessions_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_admin_sessions_logout_at").using("btree", table.logoutAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_admin_sessions_session_token").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admin.id],
			name: "admin_sessions_admin_id_fkey"
		}).onDelete("cascade"),
	unique("admin_sessions_session_token_key").on(table.sessionToken),
	unique("admin_sessions_token_key").on(table.token),
]);

export const payouts = pgTable("payouts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stripePayoutId: varchar("stripe_payout_id", { length: 255 }),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: varchar({ length: 3 }).default('usd').notNull(),
	arrivalDate: timestamp("arrival_date", { mode: 'string' }),
	description: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	payoutStatusId: integer("payout_status_id").default(1).notNull(),
}, (table) => [
	index("idx_payouts_status_id").using("btree", table.payoutStatusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.payoutStatusId],
			foreignColumns: [payoutStatuses.id],
			name: "payouts_payout_status_id_fkey"
		}),
	unique("payouts_stripe_payout_id_key").on(table.stripePayoutId),
]);

export const accessControlRules = pgTable("access_control_rules", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	userStatusIds: integer("user_status_ids").array().default([]),
	memberStatusIds: integer("member_status_ids").array().default([]),
	subscriptionStatusIds: integer("subscription_status_ids").array().default([]),
	kycStatusIds: integer("kyc_status_ids").array().default([]),
	requiresEmailVerified: boolean("requires_email_verified").default(false),
	requiresPhoneVerified: boolean("requires_phone_verified").default(false),
	requiresProfileComplete: boolean("requires_profile_complete").default(false),
	requiresActiveSubscription: boolean("requires_active_subscription").default(false),
	conditionLogic: varchar("condition_logic", { length: 10 }).default('all'),
	priority: integer().default(0),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_access_rules_active").using("btree", table.isActive.asc().nullsLast().op("int4_ops"), table.priority.desc().nullsFirst().op("int4_ops")),
]);

export const featureAccess = pgTable("feature_access", {
	id: serial().primaryKey().notNull(),
	featureCode: varchar("feature_code", { length: 100 }).notNull(),
	featureName: varchar("feature_name", { length: 100 }).notNull(),
	description: text(),
	accessRuleId: integer("access_rule_id"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.accessRuleId],
			foreignColumns: [accessControlRules.id],
			name: "feature_access_access_rule_id_fkey"
		}).onDelete("set null"),
	unique("feature_access_feature_code_key").on(table.featureCode),
]);

export const protectedRoutes = pgTable("protected_routes", {
	id: serial().primaryKey().notNull(),
	routePattern: varchar("route_pattern", { length: 255 }).notNull(),
	routeName: varchar("route_name", { length: 100 }),
	accessRuleId: integer("access_rule_id"),
	redirectRoute: varchar("redirect_route", { length: 255 }).default('/login'),
	showErrorMessage: boolean("show_error_message").default(false),
	errorMessage: text("error_message"),
	requiresAuth: boolean("requires_auth").default(true),
	isPublic: boolean("is_public").default(false),
	priority: integer().default(0),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	stepOrder: integer("step_order"),
	stepName: varchar("step_name", { length: 50 }).default(sql`NULL`),
	isOnboardingStep: boolean("is_onboarding_step").default(false),
	checkEmailVerified: boolean("check_email_verified"),
	checkPhoneVerified: boolean("check_phone_verified"),
	checkProfileComplete: boolean("check_profile_complete"),
	checkSubscriptionActive: boolean("check_subscription_active"),
	checkMemberStatusId: integer("check_member_status_id"),
}, (table) => [
	index("idx_protected_routes_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.priority.desc().nullsFirst().op("int4_ops")),
	index("idx_protected_routes_pattern").using("btree", table.routePattern.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.accessRuleId],
			foreignColumns: [accessControlRules.id],
			name: "protected_routes_access_rule_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.checkMemberStatusId],
			foreignColumns: [memberEligibilityStatuses.id],
			name: "protected_routes_check_member_status_id_fkey"
		}),
	unique("protected_routes_route_pattern_key").on(table.routePattern),
]);

export const payoutStatuses = pgTable("payout_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const paymentStatuses = pgTable("payment_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const disputeStatuses = pgTable("dispute_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const queueEntryStatuses = pgTable("queue_entry_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const adminStatuses = pgTable("admin_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const billingScheduleStatuses = pgTable("billing_schedule_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const transactionStatuses = pgTable("transaction_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const adminAlertStatuses = pgTable("admin_alert_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const signupSessionStatuses = pgTable("signup_session_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const userFunnelStatuses = pgTable("user_funnel_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const verificationStatuses = pgTable("verification_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const taxFormStatuses = pgTable("tax_form_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const postStatuses = pgTable("post_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const transactionMonitoringStatuses = pgTable("transaction_monitoring_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const auditLogStatuses = pgTable("audit_log_statuses", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	color: varchar({ length: 20 }).default('#6B7280'),
});

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	subscriptionId: uuid("subscription_id"),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: varchar({ length: 3 }).default('usd').notNull(),
	description: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	transactionStatusId: integer("transaction_status_id").default(1).notNull(),
}, (table) => [
	index("idx_transactions_status_id").using("btree", table.transactionStatusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [subscriptions.id],
			name: "transactions_subscription_id_subscriptions_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.transactionStatusId],
			foreignColumns: [transactionStatuses.id],
			name: "transactions_transaction_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const adminAlerts = pgTable("admin_alerts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	alertId: text("alert_id").default(sql`gen_random_uuid()`).notNull(),
	title: text().notNull(),
	message: text().notNull(),
	severity: text().default('info').notNull(),
	category: text().notNull(),
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
	alertStatusId: integer("alert_status_id").default(1).notNull(),
}, (table) => [
	index("idx_admin_alerts_alert_id").using("btree", table.alertId.asc().nullsLast().op("text_ops")),
	index("idx_admin_alerts_assigned_to").using("btree", table.assignedTo.asc().nullsLast().op("int4_ops")),
	index("idx_admin_alerts_severity").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	index("idx_admin_alerts_status_id").using("btree", table.alertStatusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.alertStatusId],
			foreignColumns: [adminAlertStatuses.id],
			name: "admin_alerts_alert_status_id_fkey"
		}),
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
	monitoringStatusId: integer("monitoring_status_id").default(1).notNull(),
}, (table) => [
	index("idx_transaction_monitoring_risk_level").using("btree", table.riskLevel.asc().nullsLast().op("text_ops")),
	index("idx_transaction_monitoring_status_id").using("btree", table.monitoringStatusId.asc().nullsLast().op("int4_ops")),
	index("idx_transaction_monitoring_transaction_id").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	index("idx_transaction_monitoring_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.monitoringStatusId],
			foreignColumns: [transactionMonitoringStatuses.id],
			name: "transaction_monitoring_monitoring_status_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transaction_monitoring_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminEmail: varchar("admin_email", { length: 255 }),
	action: actionType().notNull(),
	resource: varchar({ length: 255 }).notNull(),
	resourceId: varchar("resource_id", { length: 255 }),
	details: jsonb(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	adminId: integer("admin_id"),
	auditStatusId: integer("audit_status_id").default(1).notNull(),
	status: varchar({ length: 50 }).default('success').notNull(),
}, (table) => [
	index("idx_audit_logs_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_status_id").using("btree", table.auditStatusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admin.id],
			name: "audit_logs_admin_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.auditStatusId],
			foreignColumns: [auditLogStatuses.id],
			name: "audit_logs_audit_status_id_fkey"
		}),
]);
export const adminSessionHistory = pgView("admin_session_history", {	id: text(),
	adminId: integer("admin_id"),
	email: varchar(),
	name: text(),
	sessionToken: text("session_token"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	loginAt: timestamp("login_at", { withTimezone: true, mode: 'string' }),
	logoutAt: timestamp("logout_at", { withTimezone: true, mode: 'string' }),
	logoutReason: varchar("logout_reason", { length: 50 }),
	lastActivity: timestamp("last_activity", { withTimezone: true, mode: 'string' }),
	sessionDurationMinutes: numeric("session_duration_minutes"),
	sessionStatus: text("session_status"),
}).as(sql`SELECT s.id, s.admin_id, a.email, a.name, s.session_token, s.ip_address, s.user_agent, s.created_at AS login_at, s.logout_at, s.logout_reason, s.last_activity, CASE WHEN s.logout_at IS NOT NULL THEN EXTRACT(epoch FROM s.logout_at - s.created_at) / 60::numeric WHEN s.expires_at < now() THEN EXTRACT(epoch FROM s.expires_at - s.created_at) / 60::numeric ELSE EXTRACT(epoch FROM now() - s.created_at) / 60::numeric END AS session_duration_minutes, CASE WHEN s.logout_at IS NOT NULL THEN 'logged_out'::text WHEN s.expires_at < now() THEN 'expired'::text WHEN s.is_active = false THEN 'terminated'::text ELSE 'active'::text END AS session_status FROM admin_sessions s JOIN admin a ON a.id = s.admin_id ORDER BY s.created_at DESC`);

export const activeAdminSessions = pgView("active_admin_sessions", {	id: text(),
	adminId: integer("admin_id"),
	email: varchar(),
	name: text(),
	sessionToken: text("session_token"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	loginAt: timestamp("login_at", { withTimezone: true, mode: 'string' }),
	lastActivity: timestamp("last_activity", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	minutesInactive: numeric("minutes_inactive"),
	sessionDurationMinutes: numeric("session_duration_minutes"),
}).as(sql`SELECT s.id, s.admin_id, a.email, a.name, s.session_token, s.ip_address, s.user_agent, s.created_at AS login_at, s.last_activity, s.expires_at, EXTRACT(epoch FROM now() - s.last_activity) / 60::numeric AS minutes_inactive, EXTRACT(epoch FROM now() - s.created_at) / 60::numeric AS session_duration_minutes FROM admin_sessions s JOIN admin a ON a.id = s.admin_id WHERE s.is_active = true AND s.logout_at IS NULL AND s.expires_at > now() ORDER BY s.last_activity DESC`);

export const activeMemberQueueView = pgMaterializedView("active_member_queue_view", {	membershipId: uuid("membership_id"),
	userId: uuid("user_id"),
	email: varchar({ length: 255 }),
	userCreatedAt: timestamp("user_created_at", { withTimezone: true, mode: 'string' }),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	middleName: varchar("middle_name"),
	fullName: text("full_name"),
	subscriptionId: uuid("subscription_id"),
	subscriptionStatus: varchar("subscription_status", { length: 100 }),
	providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }),
	joinDate: date("join_date"),
	verificationStatus: varchar("verification_status", { length: 100 }),
	memberStatus: varchar("member_status", { length: 100 }),
	memberStatusId: integer("member_status_id"),
	tenureStartDate: timestamp("tenure_start_date", { withTimezone: true, mode: 'string' }),
	lastPaymentDate: timestamp("last_payment_date", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalSuccessfulPayments: bigint("total_successful_payments", { mode: "number" }),
	lifetimePaymentTotal: numeric("lifetime_payment_total"),
	hasReceivedPayout: boolean("has_received_payout"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	queuePosition: bigint("queue_position", { mode: "number" }),
	isEligible: boolean("is_eligible"),
	meetsTimeRequirement: boolean("meets_time_requirement"),
	calculatedAt: timestamp("calculated_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT um.id AS membership_id, u.id AS user_id, u.email, u.created_at AS user_created_at, up.first_name, up.last_name, up.middle_name, concat_ws(' '::text, up.first_name, up.middle_name, up.last_name) AS full_name, s.id AS subscription_id, ss.name AS subscription_status, s.provider_subscription_id, um.join_date, vs.name AS verification_status, mes.name AS member_status, um.member_status_id, min(p.created_at) AS tenure_start_date, max(p.created_at) AS last_payment_date, count(p.id) FILTER (WHERE p.payment_status_id = 2) AS total_successful_payments, COALESCE(sum(p.amount) FILTER (WHERE p.payment_status_id = 2), 0::numeric) AS lifetime_payment_total, (EXISTS ( SELECT 1 FROM payout_management pm WHERE pm.membership_id = um.id AND pm.payout_status_id = 5)) AS has_received_payout, row_number() OVER (ORDER BY (min(p.created_at)), um.id) AS queue_position, um.member_status_id = 2 AS is_eligible, count(p.id) FILTER (WHERE p.payment_status_id = 2) >= 12 AS meets_time_requirement, now() AS calculated_at FROM user_memberships um JOIN users u ON u.id = um.user_id JOIN user_subscriptions s ON s.id = um.subscription_id JOIN user_payments p ON p.subscription_id = s.id LEFT JOIN user_profiles up ON up.user_id = u.id LEFT JOIN member_eligibility_statuses mes ON mes.id = um.member_status_id LEFT JOIN subscription_statuses ss ON ss.id = s.subscription_status_id LEFT JOIN verification_statuses vs ON vs.id = um.verification_status_id WHERE um.member_status_id = 2 AND p.payment_status_id = 2 AND p.amount > 0::numeric AND NOT (EXISTS ( SELECT 1 FROM payout_management pm WHERE pm.membership_id = um.id AND pm.payout_status_id = 5)) GROUP BY um.id, u.id, u.email, u.created_at, up.first_name, up.last_name, up.middle_name, s.id, ss.name, s.provider_subscription_id, um.join_date, vs.name, mes.name, um.member_status_id ORDER BY (min(p.created_at)), um.id`);