"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionMonitoring = exports.disputes = exports.reportTemplates = exports.adminAlerts = exports.kycVerification = exports.auditlog = exports.taxForms = exports.userAuditLogs = exports.payoutManagement = exports.systemAuditLogs = exports.userSubscriptions = exports.userPaymentMethods = exports.userPayments = exports.userAgreements = exports.userBillingSchedules = exports.userMemberships = exports.membershipQueue = exports.userProfiles = exports.newsfeedpost = exports.userContacts = exports.userAddresses = exports.signupSessions = exports.users = exports.adminSessions = exports.payloadPreferencesRels = exports.payloadPreferences = exports.payloadMigrations = exports.payloadLockedDocuments = exports.payloadLockedDocumentsRels = exports.verificationCodes = exports.admin = exports.memberStatus = exports.enumUsersStatus = exports.enumUserSubscriptionsStatus = exports.enumUserSubscriptionsProvider = exports.enumUserPaymentsStatus = exports.enumUserPaymentsProvider = exports.enumUserPaymentsPaymentType = exports.enumUserPaymentMethodsProvider = exports.enumUserPaymentMethodsMethodType = exports.enumUserPaymentMethodsMethodSubtype = exports.enumUserMembershipsVerificationStatus = exports.enumUserContactsContactType = exports.enumUserBillingSchedulesBillingCycle = exports.enumUserAgreementsAgreementType = exports.enumUserAddressesAddressType = exports.enumNewsfeedpostStatus = exports.enumNewsfeedpostPriority = exports.enumAuditlogChangeType = exports.enumAdminRole = void 0;
exports.organizationInvitation = exports.organizationMember = exports.organization = exports.twoFactor = exports.passkey = exports.account = exports.session = exports.user = exports.verification = exports.userAppearanceSettings = exports.userPrivacySettings = exports.userPaymentSettings = exports.userSecuritySettings = exports.userNotificationPreferences = exports.userSettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.enumAdminRole = (0, pg_core_1.pgEnum)("enum_admin_role", ['Super Admin', 'Manager', 'Support']);
exports.enumAuditlogChangeType = (0, pg_core_1.pgEnum)("enum_auditlog_change_type", ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT']);
exports.enumNewsfeedpostPriority = (0, pg_core_1.pgEnum)("enum_newsfeedpost_priority", ['Low', 'Normal', 'High', 'Urgent']);
exports.enumNewsfeedpostStatus = (0, pg_core_1.pgEnum)("enum_newsfeedpost_status", ['Draft', 'Published', 'Scheduled', 'Archived']);
exports.enumUserAddressesAddressType = (0, pg_core_1.pgEnum)("enum_user_addresses_address_type", ['primary', 'billing', 'shipping']);
exports.enumUserAgreementsAgreementType = (0, pg_core_1.pgEnum)("enum_user_agreements_agreement_type", ['TERMS_CONDITIONS', 'PAYMENT_AUTHORIZATION']);
exports.enumUserBillingSchedulesBillingCycle = (0, pg_core_1.pgEnum)("enum_user_billing_schedules_billing_cycle", ['MONTHLY', 'QUARTERLY', 'YEARLY']);
exports.enumUserContactsContactType = (0, pg_core_1.pgEnum)("enum_user_contacts_contact_type", ['phone', 'email', 'emergency']);
exports.enumUserMembershipsVerificationStatus = (0, pg_core_1.pgEnum)("enum_user_memberships_verification_status", ['PENDING', 'VERIFIED', 'FAILED', 'SKIPPED']);
exports.enumUserPaymentMethodsMethodSubtype = (0, pg_core_1.pgEnum)("enum_user_payment_methods_method_subtype", ['apple_pay', 'google_pay', 'cash_app']);
exports.enumUserPaymentMethodsMethodType = (0, pg_core_1.pgEnum)("enum_user_payment_methods_method_type", ['card', 'bank_account', 'digital_wallet']);
exports.enumUserPaymentMethodsProvider = (0, pg_core_1.pgEnum)("enum_user_payment_methods_provider", ['stripe', 'paypal', 'bank']);
exports.enumUserPaymentsPaymentType = (0, pg_core_1.pgEnum)("enum_user_payments_payment_type", ['initial', 'recurring', 'one_time']);
exports.enumUserPaymentsProvider = (0, pg_core_1.pgEnum)("enum_user_payments_provider", ['stripe', 'paypal', 'bank']);
exports.enumUserPaymentsStatus = (0, pg_core_1.pgEnum)("enum_user_payments_status", ['succeeded', 'pending', 'failed', 'refunded', 'canceled']);
exports.enumUserSubscriptionsProvider = (0, pg_core_1.pgEnum)("enum_user_subscriptions_provider", ['stripe', 'paypal']);
exports.enumUserSubscriptionsStatus = (0, pg_core_1.pgEnum)("enum_user_subscriptions_status", ['active', 'past_due', 'canceled', 'incomplete', 'trialing', 'unpaid']);
exports.enumUsersStatus = (0, pg_core_1.pgEnum)("enum_users_status", ['Active', 'Inactive', 'Suspended', 'Pending']);
exports.memberStatus = (0, pg_core_1.pgEnum)("member_status", ['UNVERIFIED', 'PROSPECT', 'ACTIVE', 'PENDING']);
exports.admin = (0, pg_core_1.pgTable)("admin", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    email: (0, pg_core_1.varchar)().notNull(),
    resetPasswordToken: (0, pg_core_1.varchar)("reset_password_token"),
    resetPasswordExpiration: (0, pg_core_1.timestamp)("reset_password_expiration", { precision: 3, withTimezone: true, mode: 'string' }),
    salt: (0, pg_core_1.varchar)(),
    hash: (0, pg_core_1.varchar)(),
    loginAttempts: (0, pg_core_1.numeric)("login_attempts").default('0'),
    lockUntil: (0, pg_core_1.timestamp)("lock_until", { precision: 3, withTimezone: true, mode: 'string' }),
    role: (0, exports.enumAdminRole)().default('Manager').notNull(),
}, (table) => [
    (0, pg_core_1.index)("admin_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.uniqueIndex)("admin_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("admin_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);
exports.verificationCodes = (0, pg_core_1.pgTable)("verification_codes", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    email: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)({ length: 6 }).notNull(),
    linkToken: (0, pg_core_1.varchar)("link_token", { length: 64 }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
    used: (0, pg_core_1.boolean)().default(false),
    userId: (0, pg_core_1.uuid)("user_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_verification_codes_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_verification_codes_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_verification_codes_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.index)("idx_verification_codes_link_token").using("btree", table.linkToken.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_verification_codes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "verification_codes_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("verification_codes_link_token_key").on(table.linkToken),
    (0, pg_core_1.pgPolicy)("Users can read their own verification codes", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.uid() = user_id)` }),
    (0, pg_core_1.pgPolicy)("Service role can manage verification codes", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.payloadLockedDocumentsRels = (0, pg_core_1.pgTable)("payload_locked_documents_rels", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    order: (0, pg_core_1.integer)(),
    parentId: (0, pg_core_1.integer)("parent_id").notNull(),
    path: (0, pg_core_1.varchar)().notNull(),
    adminId: (0, pg_core_1.integer)("admin_id"),
    usersId: (0, pg_core_1.integer)("users_id"),
}, (table) => [
    (0, pg_core_1.index)("payload_locked_documents_rels_admin_id_idx").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("payload_locked_documents_rels_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("payload_locked_documents_rels_parent_idx").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("payload_locked_documents_rels_path_idx").using("btree", table.path.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.adminId],
        foreignColumns: [exports.admin.id],
        name: "payload_locked_documents_rels_admin_fk"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.parentId],
        foreignColumns: [exports.payloadLockedDocuments.id],
        name: "payload_locked_documents_rels_parent_fk"
    }).onDelete("cascade"),
]);
exports.payloadLockedDocuments = (0, pg_core_1.pgTable)("payload_locked_documents", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    globalSlug: (0, pg_core_1.varchar)("global_slug"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("payload_locked_documents_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.index)("payload_locked_documents_global_slug_idx").using("btree", table.globalSlug.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("payload_locked_documents_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);
exports.payloadMigrations = (0, pg_core_1.pgTable)("payload_migrations", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    name: (0, pg_core_1.varchar)(),
    batch: (0, pg_core_1.numeric)(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("payload_migrations_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.index)("payload_migrations_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);
exports.payloadPreferences = (0, pg_core_1.pgTable)("payload_preferences", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    key: (0, pg_core_1.varchar)(),
    value: (0, pg_core_1.jsonb)(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("payload_preferences_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.index)("payload_preferences_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("payload_preferences_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);
exports.payloadPreferencesRels = (0, pg_core_1.pgTable)("payload_preferences_rels", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    order: (0, pg_core_1.integer)(),
    parentId: (0, pg_core_1.integer)("parent_id").notNull(),
    path: (0, pg_core_1.varchar)().notNull(),
    adminId: (0, pg_core_1.integer)("admin_id"),
}, (table) => [
    (0, pg_core_1.index)("payload_preferences_rels_admin_id_idx").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("payload_preferences_rels_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("payload_preferences_rels_parent_idx").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("payload_preferences_rels_path_idx").using("btree", table.path.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.adminId],
        foreignColumns: [exports.admin.id],
        name: "payload_preferences_rels_admin_fk"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.parentId],
        foreignColumns: [exports.payloadPreferences.id],
        name: "payload_preferences_rels_parent_fk"
    }).onDelete("cascade"),
]);
exports.adminSessions = (0, pg_core_1.pgTable)("admin_sessions", {
    order: (0, pg_core_1.integer)("_order").notNull(),
    parentId: (0, pg_core_1.integer)("_parent_id").notNull(),
    id: (0, pg_core_1.varchar)().primaryKey().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { precision: 3, withTimezone: true, mode: 'string' }),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { precision: 3, withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
    (0, pg_core_1.index)("admin_sessions_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("admin_sessions_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.parentId],
        foreignColumns: [exports.admin.id],
        name: "admin_sessions_parent_id_fk"
    }).onDelete("cascade"),
]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    authUserId: (0, pg_core_1.text)("auth_user_id"),
    email: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    emailVerified: (0, pg_core_1.boolean)("email_verified").default(false),
    status: (0, exports.enumUsersStatus)().default('Pending').notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own data", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth_user_id = (auth.uid())::text)` }),
    (0, pg_core_1.pgPolicy)("Service can manage users", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.signupSessions = (0, pg_core_1.pgTable)("signup_sessions", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    sessionId: (0, pg_core_1.varchar)("session_id", { length: 50 }).notNull(),
    token: (0, pg_core_1.varchar)({ length: 50 }).notNull(),
    email: (0, pg_core_1.varchar)({ length: 255 }),
    phone: (0, pg_core_1.varchar)({ length: 20 }),
    step: (0, pg_core_1.integer)().default(1),
    status: (0, pg_core_1.varchar)({ length: 20 }).default('active'),
    userId: (0, pg_core_1.uuid)("user_id"),
    profileData: (0, pg_core_1.jsonb)("profile_data"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
    (0, pg_core_1.index)("idx_signup_sessions_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_signup_sessions_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.index)("idx_signup_sessions_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_signup_sessions_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_signup_sessions_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_signup_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "signup_sessions_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("signup_sessions_session_id_key").on(table.sessionId),
    (0, pg_core_1.unique)("signup_sessions_token_key").on(table.token),
    (0, pg_core_1.pgPolicy)("Service role can manage signup sessions", { as: "permissive", for: "all", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.role() = 'service_role'::text)` }),
    (0, pg_core_1.pgPolicy)("Users can read their own sessions", { as: "permissive", for: "select", to: ["public"] }),
    (0, pg_core_1.check)("signup_sessions_status_check", (0, drizzle_orm_1.sql) `(status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'expired'::character varying])::text[])`),
]);
exports.userAddresses = (0, pg_core_1.pgTable)("user_addresses", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    addressType: (0, pg_core_1.varchar)("address_type", { length: 20 }).default('primary'),
    streetAddress: (0, pg_core_1.varchar)("street_address", { length: 255 }),
    addressLine2: (0, pg_core_1.varchar)("address_line_2", { length: 255 }),
    city: (0, pg_core_1.varchar)({ length: 100 }),
    state: (0, pg_core_1.varchar)({ length: 100 }),
    postalCode: (0, pg_core_1.varchar)("postal_code", { length: 20 }),
    countryCode: (0, pg_core_1.char)("country_code", { length: 2 }).default('US'),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own addresses", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage addresses", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.userContacts = (0, pg_core_1.pgTable)("user_contacts", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    contactType: (0, pg_core_1.varchar)("contact_type", { length: 20 }).notNull(),
    contactValue: (0, pg_core_1.varchar)("contact_value", { length: 255 }).notNull(),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own contacts", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage contacts", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.newsfeedpost = (0, pg_core_1.pgTable)("newsfeedpost", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    title: (0, pg_core_1.varchar)().notNull(),
    content: (0, pg_core_1.jsonb)().notNull(),
    adminIDIdId: (0, pg_core_1.integer)("admin_i_d_id_id").notNull(),
    publishDate: (0, pg_core_1.timestamp)("publish_date", { precision: 3, withTimezone: true, mode: 'string' }).notNull(),
    status: (0, exports.enumNewsfeedpostStatus)().default('Draft').notNull(),
    priority: (0, exports.enumNewsfeedpostPriority)().default('Normal'),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
exports.userProfiles = (0, pg_core_1.pgTable)("user_profiles", {
    id: (0, pg_core_1.varchar)().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }),
    middleName: (0, pg_core_1.varchar)("middle_name", { length: 100 }),
    dateOfBirth: (0, pg_core_1.date)("date_of_birth"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own profile", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Users can update their own profile", { as: "permissive", for: "update", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Service can manage profiles", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.membershipQueue = (0, pg_core_1.pgTable)("membership_queue", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    queuePosition: (0, pg_core_1.integer)("queue_position"),
    joinedQueueAt: (0, pg_core_1.timestamp)("joined_queue_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    isEligible: (0, pg_core_1.boolean)("is_eligible").default(true),
    priorityScore: (0, pg_core_1.integer)("priority_score").default(0),
    subscriptionActive: (0, pg_core_1.boolean)("subscription_active").default(false),
    totalMonthsSubscribed: (0, pg_core_1.integer)("total_months_subscribed").default(0),
    lastPaymentDate: (0, pg_core_1.timestamp)("last_payment_date", { withTimezone: true, mode: 'string' }),
    lifetimePaymentTotal: (0, pg_core_1.numeric)("lifetime_payment_total", { precision: 10, scale: 2 }).default('0.00'),
    hasReceivedPayout: (0, pg_core_1.boolean)("has_received_payout").default(false),
    notes: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own queue status", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage queue", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.userMemberships = (0, pg_core_1.pgTable)("user_memberships", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    joinDate: (0, pg_core_1.date)("join_date").default((0, drizzle_orm_1.sql) `CURRENT_DATE`).notNull(),
    tenure: (0, pg_core_1.numeric)().default('0'),
    verificationStatus: (0, pg_core_1.varchar)("verification_status", { length: 20 }).default('PENDING'),
    assignedAdminIdId: (0, pg_core_1.integer)("assigned_admin_id_id"),
    notes: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own memberships", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage memberships", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.userBillingSchedules = (0, pg_core_1.pgTable)("user_billing_schedules", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    subscriptionId: (0, pg_core_1.uuid)("subscription_id"),
    billingCycle: (0, pg_core_1.varchar)("billing_cycle", { length: 20 }).default('MONTHLY'),
    nextBillingDate: (0, pg_core_1.date)("next_billing_date"),
    amount: (0, pg_core_1.numeric)({ precision: 10, scale: 2 }),
    currency: (0, pg_core_1.char)({ length: 3 }).default('USD'),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own billing schedules", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage billing schedules", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.userAgreements = (0, pg_core_1.pgTable)("user_agreements", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    agreementType: (0, pg_core_1.varchar)("agreement_type", { length: 50 }).notNull(),
    versionNumber: (0, pg_core_1.varchar)("version_number", { length: 20 }).notNull(),
    agreedAt: (0, pg_core_1.timestamp)("agreed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    documentUrl: (0, pg_core_1.text)("document_url"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own agreements", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage agreements", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.userPayments = (0, pg_core_1.pgTable)("user_payments", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    subscriptionId: (0, pg_core_1.uuid)("subscription_id"),
    paymentMethodId: (0, pg_core_1.uuid)("payment_method_id"),
    provider: (0, pg_core_1.varchar)({ length: 20 }).default('stripe').notNull(),
    providerPaymentId: (0, pg_core_1.varchar)("provider_payment_id", { length: 255 }),
    providerInvoiceId: (0, pg_core_1.varchar)("provider_invoice_id", { length: 255 }),
    providerChargeId: (0, pg_core_1.varchar)("provider_charge_id", { length: 255 }),
    amount: (0, pg_core_1.numeric)({ precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.char)({ length: 3 }).default('USD'),
    paymentType: (0, pg_core_1.varchar)("payment_type", { length: 20 }).notNull(),
    paymentDate: (0, pg_core_1.timestamp)("payment_date", { withTimezone: true, mode: 'string' }).notNull(),
    status: (0, pg_core_1.varchar)({ length: 20 }).notNull(),
    isFirstPayment: (0, pg_core_1.boolean)("is_first_payment").default(false),
    failureReason: (0, pg_core_1.text)("failure_reason"),
    receiptUrl: (0, pg_core_1.text)("receipt_url"),
    metadata: (0, pg_core_1.jsonb)().default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own payments", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage payments", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.userPaymentMethods = (0, pg_core_1.pgTable)("user_payment_methods", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    provider: (0, pg_core_1.varchar)({ length: 20 }).default('stripe').notNull(),
    methodType: (0, pg_core_1.varchar)("method_type", { length: 20 }).notNull(),
    methodSubtype: (0, pg_core_1.varchar)("method_subtype", { length: 20 }),
    providerPaymentMethodId: (0, pg_core_1.text)("provider_payment_method_id"),
    lastFour: (0, pg_core_1.varchar)("last_four", { length: 4 }),
    brand: (0, pg_core_1.varchar)({ length: 20 }),
    expiresMonth: (0, pg_core_1.integer)("expires_month"),
    expiresYear: (0, pg_core_1.integer)("expires_year"),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    metadata: (0, pg_core_1.jsonb)().default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own payment methods", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage payment methods", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.userSubscriptions = (0, pg_core_1.pgTable)("user_subscriptions", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    provider: (0, pg_core_1.varchar)({ length: 20 }).default('stripe').notNull(),
    providerSubscriptionId: (0, pg_core_1.varchar)("provider_subscription_id", { length: 255 }).notNull(),
    providerCustomerId: (0, pg_core_1.varchar)("provider_customer_id", { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)({ length: 20 }).notNull(),
    currentPeriodStart: (0, pg_core_1.timestamp)("current_period_start", { withTimezone: true, mode: 'string' }).notNull(),
    currentPeriodEnd: (0, pg_core_1.timestamp)("current_period_end", { withTimezone: true, mode: 'string' }).notNull(),
    cancelAtPeriodEnd: (0, pg_core_1.boolean)("cancel_at_period_end").default(false),
    canceledAt: (0, pg_core_1.timestamp)("canceled_at", { withTimezone: true, mode: 'string' }),
    trialEnd: (0, pg_core_1.timestamp)("trial_end", { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own subscriptions", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage subscriptions", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.systemAuditLogs = (0, pg_core_1.pgTable)("system_audit_logs", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    adminId: (0, pg_core_1.integer)("admin_id"),
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }).notNull(),
    entityId: (0, pg_core_1.uuid)("entity_id"),
    action: (0, pg_core_1.varchar)({ length: 50 }).notNull(),
    oldValues: (0, pg_core_1.jsonb)("old_values"),
    newValues: (0, pg_core_1.jsonb)("new_values"),
    success: (0, pg_core_1.boolean)().notNull(),
    errorMessage: (0, pg_core_1.text)("error_message"),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    metadata: (0, pg_core_1.jsonb)().default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.pgPolicy)("Users can view their own audit logs", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = (auth.uid())::text)))` }),
    (0, pg_core_1.pgPolicy)("Service can manage audit logs", { as: "permissive", for: "all", to: ["public"] }),
]);
exports.payoutManagement = (0, pg_core_1.pgTable)("payout_management", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    payoutId: (0, pg_core_1.text)("payout_id").default((0, drizzle_orm_1.sql) `gen_random_uuid()`).notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    queuePosition: (0, pg_core_1.integer)("queue_position").notNull(),
    amount: (0, pg_core_1.numeric)({ precision: 12, scale: 2 }).default('100000.00').notNull(),
    currency: (0, pg_core_1.text)().default('USD'),
    status: (0, pg_core_1.text)().default('pending_approval').notNull(),
    eligibilityCheck: (0, pg_core_1.jsonb)("eligibility_check").default({}),
    approvalWorkflow: (0, pg_core_1.jsonb)("approval_workflow").default([]),
    scheduledDate: (0, pg_core_1.timestamp)("scheduled_date", { withTimezone: true, mode: 'string' }),
    paymentMethod: (0, pg_core_1.text)("payment_method").default('ach').notNull(),
    bankDetails: (0, pg_core_1.jsonb)("bank_details"),
    taxWithholding: (0, pg_core_1.jsonb)("tax_withholding"),
    processing: (0, pg_core_1.jsonb)(),
    receiptUrl: (0, pg_core_1.text)("receipt_url"),
    internalNotes: (0, pg_core_1.jsonb)("internal_notes").default([]),
    auditTrail: (0, pg_core_1.jsonb)("audit_trail").default([]),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_payout_management_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_payout_management_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "payout_management_user_id_fkey"
    }),
    (0, pg_core_1.unique)("payout_management_payout_id_key").on(table.payoutId),
    (0, pg_core_1.check)("payout_management_payment_method_check", (0, drizzle_orm_1.sql) `payment_method = ANY (ARRAY['ach'::text, 'wire'::text, 'check'::text, 'paypal'::text])`),
    (0, pg_core_1.check)("payout_management_status_check", (0, drizzle_orm_1.sql) `status = ANY (ARRAY['pending_approval'::text, 'approved'::text, 'scheduled'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])`),
]);
exports.userAuditLogs = (0, pg_core_1.pgTable)("user_audit_logs", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id"),
    adminId: (0, pg_core_1.integer)("admin_id"),
    entityType: (0, pg_core_1.varchar)("entity_type").notNull(),
    entityId: (0, pg_core_1.uuid)("entity_id"),
    action: (0, pg_core_1.varchar)().notNull(),
    oldValues: (0, pg_core_1.jsonb)("old_values"),
    newValues: (0, pg_core_1.jsonb)("new_values"),
    success: (0, pg_core_1.boolean)().notNull(),
    errorMessage: (0, pg_core_1.text)("error_message"),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    metadata: (0, pg_core_1.jsonb)().default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_user_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_user_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
    (0, pg_core_1.index)("idx_user_audit_logs_entity_type").using("btree", table.entityType.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_user_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
]);
exports.taxForms = (0, pg_core_1.pgTable)("tax_forms", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    formId: (0, pg_core_1.text)("form_id").default((0, drizzle_orm_1.sql) `gen_random_uuid()`).notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    formType: (0, pg_core_1.text)("form_type").notNull(),
    taxYear: (0, pg_core_1.integer)("tax_year").notNull(),
    status: (0, pg_core_1.text)().default('pending').notNull(),
    recipientInfo: (0, pg_core_1.jsonb)("recipient_info").default({}).notNull(),
    payerInfo: (0, pg_core_1.jsonb)("payer_info").default({}),
    incomeDetails: (0, pg_core_1.jsonb)("income_details").default({}),
    w9Data: (0, pg_core_1.jsonb)("w9_data").default({}),
    generation: (0, pg_core_1.jsonb)().default({}),
    delivery: (0, pg_core_1.jsonb)().default({}),
    irsFiling: (0, pg_core_1.jsonb)("irs_filing").default({}),
    corrections: (0, pg_core_1.jsonb)().default([]),
    notes: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_tax_forms_tax_year").using("btree", table.taxYear.asc().nullsLast().op("int4_ops")),
    (0, pg_core_1.index)("idx_tax_forms_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "tax_forms_user_id_fkey"
    }),
    (0, pg_core_1.unique)("tax_forms_form_id_key").on(table.formId),
    (0, pg_core_1.check)("tax_forms_form_type_check", (0, drizzle_orm_1.sql) `form_type = ANY (ARRAY['W-9'::text, '1099-MISC'::text, '1099-NEC'::text, '1099-K'::text, 'W-8BEN'::text])`),
    (0, pg_core_1.check)("tax_forms_status_check", (0, drizzle_orm_1.sql) `status = ANY (ARRAY['pending'::text, 'generated'::text, 'sent'::text, 'filed_with_irs'::text, 'corrected'::text])`),
]);
exports.auditlog = (0, pg_core_1.pgTable)("auditlog", {
    id: (0, pg_core_1.serial)().primaryKey().notNull(),
    adminIDIdId: (0, pg_core_1.integer)("admin_i_d_id_id").notNull(),
    entityChanged: (0, pg_core_1.varchar)("entity_changed").notNull(),
    entityId: (0, pg_core_1.numeric)("entity_id"),
    changeType: (0, exports.enumAuditlogChangeType)("change_type").notNull(),
    timestamp: (0, pg_core_1.timestamp)({ precision: 3, withTimezone: true, mode: 'string' }).notNull(),
    changeDetails: (0, pg_core_1.jsonb)("change_details"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { precision: 3, withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
exports.kycVerification = (0, pg_core_1.pgTable)("kyc_verification", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    status: (0, pg_core_1.text)().default('pending').notNull(),
    verificationMethod: (0, pg_core_1.text)("verification_method"),
    documentType: (0, pg_core_1.text)("document_type"),
    documentNumber: (0, pg_core_1.text)("document_number"),
    documentFrontUrl: (0, pg_core_1.text)("document_front_url"),
    documentBackUrl: (0, pg_core_1.text)("document_back_url"),
    selfieUrl: (0, pg_core_1.text)("selfie_url"),
    verificationProvider: (0, pg_core_1.text)("verification_provider"),
    providerVerificationId: (0, pg_core_1.text)("provider_verification_id"),
    verificationData: (0, pg_core_1.jsonb)("verification_data").default({}),
    verifiedAt: (0, pg_core_1.timestamp)("verified_at", { withTimezone: true, mode: 'string' }),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true, mode: 'string' }),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    reviewerId: (0, pg_core_1.integer)("reviewer_id"),
    reviewerNotes: (0, pg_core_1.text)("reviewer_notes"),
    riskScore: (0, pg_core_1.integer)("risk_score"),
    riskFactors: (0, pg_core_1.jsonb)("risk_factors").default([]),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    geolocation: (0, pg_core_1.jsonb)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_kyc_verification_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_kyc_verification_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "kyc_verification_user_id_fkey"
    }),
    (0, pg_core_1.check)("kyc_verification_document_type_check", (0, drizzle_orm_1.sql) `document_type = ANY (ARRAY['passport'::text, 'drivers_license'::text, 'national_id'::text, 'ssn'::text])`),
    (0, pg_core_1.check)("kyc_verification_risk_score_check", (0, drizzle_orm_1.sql) `(risk_score >= 0) AND (risk_score <= 100)`),
    (0, pg_core_1.check)("kyc_verification_status_check", (0, drizzle_orm_1.sql) `status = ANY (ARRAY['pending'::text, 'in_review'::text, 'verified'::text, 'rejected'::text, 'expired'::text])`),
    (0, pg_core_1.check)("kyc_verification_verification_method_check", (0, drizzle_orm_1.sql) `verification_method = ANY (ARRAY['manual'::text, 'stripe_identity'::text, 'plaid'::text, 'persona'::text, 'onfido'::text])`),
]);
exports.adminAlerts = (0, pg_core_1.pgTable)("admin_alerts", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    alertId: (0, pg_core_1.text)("alert_id").default((0, drizzle_orm_1.sql) `gen_random_uuid()`).notNull(),
    title: (0, pg_core_1.text)().notNull(),
    message: (0, pg_core_1.text)().notNull(),
    severity: (0, pg_core_1.text)().default('info').notNull(),
    category: (0, pg_core_1.text)().notNull(),
    status: (0, pg_core_1.text)().default('new').notNull(),
    relatedEntity: (0, pg_core_1.jsonb)("related_entity"),
    triggerInfo: (0, pg_core_1.jsonb)("trigger_info"),
    assignedTo: (0, pg_core_1.integer)("assigned_to"),
    acknowledgedBy: (0, pg_core_1.integer)("acknowledged_by"),
    acknowledgedAt: (0, pg_core_1.timestamp)("acknowledged_at", { withTimezone: true, mode: 'string' }),
    resolvedBy: (0, pg_core_1.integer)("resolved_by"),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at", { withTimezone: true, mode: 'string' }),
    resolutionNotes: (0, pg_core_1.text)("resolution_notes"),
    notificationsSent: (0, pg_core_1.jsonb)("notifications_sent").default([]),
    escalation: (0, pg_core_1.jsonb)(),
    metadata: (0, pg_core_1.jsonb)().default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_admin_alerts_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_admin_alerts_severity_status").using("btree", table.severity.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.unique)("admin_alerts_alert_id_key").on(table.alertId),
    (0, pg_core_1.check)("admin_alerts_category_check", (0, drizzle_orm_1.sql) `category = ANY (ARRAY['system'::text, 'security'::text, 'payment'::text, 'queue'::text, 'compliance'::text])`),
    (0, pg_core_1.check)("admin_alerts_severity_check", (0, drizzle_orm_1.sql) `severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])`),
    (0, pg_core_1.check)("admin_alerts_status_check", (0, drizzle_orm_1.sql) `status = ANY (ARRAY['new'::text, 'acknowledged'::text, 'investigating'::text, 'resolved'::text])`),
]);
exports.reportTemplates = (0, pg_core_1.pgTable)("report_templates", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)(),
    category: (0, pg_core_1.text)().notNull(),
    dataSource: (0, pg_core_1.text)("data_source").notNull(),
    queryConfig: (0, pg_core_1.jsonb)("query_config").default({}),
    columns: (0, pg_core_1.jsonb)().default([]).notNull(),
    visualizations: (0, pg_core_1.jsonb)().default([]),
    schedule: (0, pg_core_1.jsonb)().default({}),
    delivery: (0, pg_core_1.jsonb)().default({}),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    isSystemReport: (0, pg_core_1.boolean)("is_system_report").default(false),
    createdBy: (0, pg_core_1.integer)("created_by"),
    lastRunAt: (0, pg_core_1.timestamp)("last_run_at", { withTimezone: true, mode: 'string' }),
    lastRunStatus: (0, pg_core_1.text)("last_run_status"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.check)("report_templates_category_check", (0, drizzle_orm_1.sql) `category = ANY (ARRAY['financial'::text, 'compliance'::text, 'operations'::text, 'analytics'::text, 'custom'::text])`),
]);
exports.disputes = (0, pg_core_1.pgTable)("disputes", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    disputeId: (0, pg_core_1.text)("dispute_id").notNull(),
    paymentId: (0, pg_core_1.uuid)("payment_id"),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    type: (0, pg_core_1.text)().notNull(),
    status: (0, pg_core_1.text)().default('needs_response').notNull(),
    reason: (0, pg_core_1.text)().notNull(),
    amount: (0, pg_core_1.numeric)({ precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)().default('USD'),
    stripeDisputeId: (0, pg_core_1.text)("stripe_dispute_id"),
    customerMessage: (0, pg_core_1.text)("customer_message"),
    respondBy: (0, pg_core_1.timestamp)("respond_by", { withTimezone: true, mode: 'string' }).notNull(),
    evidence: (0, pg_core_1.jsonb)().default({}),
    assignedTo: (0, pg_core_1.integer)("assigned_to"),
    internalNotes: (0, pg_core_1.jsonb)("internal_notes").default([]),
    resolution: (0, pg_core_1.jsonb)(),
    impact: (0, pg_core_1.jsonb)(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_disputes_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_disputes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "disputes_user_id_fkey"
    }),
    (0, pg_core_1.unique)("disputes_dispute_id_key").on(table.disputeId),
    (0, pg_core_1.check)("disputes_status_check", (0, drizzle_orm_1.sql) `status = ANY (ARRAY['needs_response'::text, 'evidence_submitted'::text, 'under_review'::text, 'won'::text, 'lost'::text, 'warning_closed'::text])`),
    (0, pg_core_1.check)("disputes_type_check", (0, drizzle_orm_1.sql) `type = ANY (ARRAY['chargeback'::text, 'refund_request'::text, 'fraud_claim'::text, 'duplicate_charge'::text])`),
]);
exports.transactionMonitoring = (0, pg_core_1.pgTable)("transaction_monitoring", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    transactionId: (0, pg_core_1.uuid)("transaction_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    transactionType: (0, pg_core_1.text)("transaction_type").notNull(),
    amount: (0, pg_core_1.numeric)({ precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)().default('USD'),
    riskLevel: (0, pg_core_1.text)("risk_level").default('low').notNull(),
    riskScore: (0, pg_core_1.integer)("risk_score"),
    status: (0, pg_core_1.text)().default('pending_review').notNull(),
    flags: (0, pg_core_1.jsonb)().default([]),
    amlCheck: (0, pg_core_1.jsonb)("aml_check").default({}),
    velocityCheck: (0, pg_core_1.jsonb)("velocity_check").default({}),
    deviceFingerprint: (0, pg_core_1.jsonb)("device_fingerprint").default({}),
    geographicData: (0, pg_core_1.jsonb)("geographic_data").default({}),
    reviewerId: (0, pg_core_1.integer)("reviewer_id"),
    reviewerNotes: (0, pg_core_1.text)("reviewer_notes"),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at", { withTimezone: true, mode: 'string' }),
    actionTaken: (0, pg_core_1.text)("action_taken"),
    sarFiled: (0, pg_core_1.boolean)("sar_filed").default(false),
    sarFiledAt: (0, pg_core_1.timestamp)("sar_filed_at", { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_transaction_monitoring_risk_level").using("btree", table.riskLevel.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
    (0, pg_core_1.index)("idx_transaction_monitoring_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "transaction_monitoring_user_id_fkey"
    }),
    (0, pg_core_1.check)("transaction_monitoring_risk_level_check", (0, drizzle_orm_1.sql) `risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])`),
    (0, pg_core_1.check)("transaction_monitoring_risk_score_check", (0, drizzle_orm_1.sql) `(risk_score >= 0) AND (risk_score <= 100)`),
    (0, pg_core_1.check)("transaction_monitoring_status_check", (0, drizzle_orm_1.sql) `status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'flagged'::text, 'blocked'::text, 'escalated'::text])`),
    (0, pg_core_1.check)("transaction_monitoring_transaction_type_check", (0, drizzle_orm_1.sql) `transaction_type = ANY (ARRAY['payment'::text, 'payout'::text, 'refund'::text, 'chargeback'::text])`),
]);
exports.userSettings = (0, pg_core_1.pgTable)("user_settings", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    emailNotifications: (0, pg_core_1.boolean)("email_notifications").default(true),
    smsNotifications: (0, pg_core_1.boolean)("sms_notifications").default(false),
    pushNotifications: (0, pg_core_1.boolean)("push_notifications").default(true),
    marketingEmails: (0, pg_core_1.boolean)("marketing_emails").default(false),
    twoFactorAuth: (0, pg_core_1.boolean)("two_factor_auth").default(false),
    twoFactorSecret: (0, pg_core_1.text)("two_factor_secret"),
    loginAlerts: (0, pg_core_1.boolean)("login_alerts").default(true),
    sessionTimeout: (0, pg_core_1.integer)("session_timeout").default(30),
    profileVisibility: (0, pg_core_1.text)("profile_visibility").default('private'),
    dataSharing: (0, pg_core_1.boolean)("data_sharing").default(false),
    theme: (0, pg_core_1.text)().default('light'),
    language: (0, pg_core_1.text)().default('en'),
    autoRenewal: (0, pg_core_1.boolean)("auto_renewal").default(true),
    paymentMethod: (0, pg_core_1.text)("payment_method").default('card'),
    billingCycle: (0, pg_core_1.text)("billing_cycle").default('monthly'),
    timezone: (0, pg_core_1.text)().default('UTC'),
    dateFormat: (0, pg_core_1.text)("date_format").default('MM/DD/YYYY'),
    currency: (0, pg_core_1.text)().default('USD'),
}, (table) => [
    (0, pg_core_1.index)("idx_user_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "user_settings_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("user_settings_user_id_key").on(table.userId),
    (0, pg_core_1.pgPolicy)("Users can view their own settings", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.uid() = user_id)` }),
    (0, pg_core_1.pgPolicy)("Users can insert their own settings", { as: "permissive", for: "insert", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can update their own settings", { as: "permissive", for: "update", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can delete their own settings", { as: "permissive", for: "delete", to: ["public"] }),
    (0, pg_core_1.check)("user_settings_billing_cycle_check", (0, drizzle_orm_1.sql) `billing_cycle = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text])`),
    (0, pg_core_1.check)("user_settings_currency_check", (0, drizzle_orm_1.sql) `currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text, 'CAD'::text, 'AUD'::text, 'JPY'::text, 'CNY'::text])`),
    (0, pg_core_1.check)("user_settings_date_format_check", (0, drizzle_orm_1.sql) `date_format = ANY (ARRAY['MM/DD/YYYY'::text, 'DD/MM/YYYY'::text, 'YYYY-MM-DD'::text])`),
    (0, pg_core_1.check)("user_settings_language_check", (0, drizzle_orm_1.sql) `language = ANY (ARRAY['en'::text, 'es'::text, 'fr'::text, 'de'::text, 'it'::text, 'pt'::text, 'zh'::text, 'ja'::text, 'ko'::text])`),
    (0, pg_core_1.check)("user_settings_payment_method_check", (0, drizzle_orm_1.sql) `payment_method = ANY (ARRAY['card'::text, 'bank'::text, 'paypal'::text, 'crypto'::text])`),
    (0, pg_core_1.check)("user_settings_profile_visibility_check", (0, drizzle_orm_1.sql) `profile_visibility = ANY (ARRAY['public'::text, 'private'::text, 'friends'::text])`),
    (0, pg_core_1.check)("user_settings_theme_check", (0, drizzle_orm_1.sql) `theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])`),
]);
exports.userNotificationPreferences = (0, pg_core_1.pgTable)("user_notification_preferences", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    emailPaymentReminders: (0, pg_core_1.boolean)("email_payment_reminders").default(true),
    emailTenureUpdates: (0, pg_core_1.boolean)("email_tenure_updates").default(true),
    emailSecurityAlerts: (0, pg_core_1.boolean)("email_security_alerts").default(true),
    emailSystemUpdates: (0, pg_core_1.boolean)("email_system_updates").default(false),
    emailNewsletter: (0, pg_core_1.boolean)("email_newsletter").default(false),
    smsPaymentReminders: (0, pg_core_1.boolean)("sms_payment_reminders").default(false),
    smsSecurityAlerts: (0, pg_core_1.boolean)("sms_security_alerts").default(true),
    smsUrgentUpdates: (0, pg_core_1.boolean)("sms_urgent_updates").default(true),
    pushPaymentReminders: (0, pg_core_1.boolean)("push_payment_reminders").default(true),
    pushTenureUpdates: (0, pg_core_1.boolean)("push_tenure_updates").default(true),
    pushSecurityAlerts: (0, pg_core_1.boolean)("push_security_alerts").default(true),
    pushSystemUpdates: (0, pg_core_1.boolean)("push_system_updates").default(false),
    emailFrequency: (0, pg_core_1.text)("email_frequency").default('immediate'),
    smsFrequency: (0, pg_core_1.text)("sms_frequency").default('urgent_only'),
    pushFrequency: (0, pg_core_1.text)("push_frequency").default('immediate'),
}, (table) => [
    (0, pg_core_1.index)("idx_user_notification_preferences_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "user_notification_preferences_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("user_notification_preferences_user_id_key").on(table.userId),
    (0, pg_core_1.pgPolicy)("Users can view their own notification preferences", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.uid() = user_id)` }),
    (0, pg_core_1.pgPolicy)("Users can insert their own notification preferences", { as: "permissive", for: "insert", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can update their own notification preferences", { as: "permissive", for: "update", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can delete their own notification preferences", { as: "permissive", for: "delete", to: ["public"] }),
    (0, pg_core_1.check)("user_notification_preferences_email_frequency_check", (0, drizzle_orm_1.sql) `email_frequency = ANY (ARRAY['immediate'::text, 'daily'::text, 'weekly'::text, 'monthly'::text])`),
    (0, pg_core_1.check)("user_notification_preferences_push_frequency_check", (0, drizzle_orm_1.sql) `push_frequency = ANY (ARRAY['immediate'::text, 'daily'::text, 'weekly'::text, 'never'::text])`),
    (0, pg_core_1.check)("user_notification_preferences_sms_frequency_check", (0, drizzle_orm_1.sql) `sms_frequency = ANY (ARRAY['immediate'::text, 'urgent_only'::text, 'never'::text])`),
]);
exports.userSecuritySettings = (0, pg_core_1.pgTable)("user_security_settings", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    twoFactorEnabled: (0, pg_core_1.boolean)("two_factor_enabled").default(false),
    twoFactorSecret: (0, pg_core_1.text)("two_factor_secret"),
    twoFactorBackupCodes: (0, pg_core_1.text)("two_factor_backup_codes").array(),
    twoFactorLastUsed: (0, pg_core_1.timestamp)("two_factor_last_used", { withTimezone: true, mode: 'string' }),
    loginAlerts: (0, pg_core_1.boolean)("login_alerts").default(true),
    sessionTimeout: (0, pg_core_1.integer)("session_timeout").default(30),
    maxConcurrentSessions: (0, pg_core_1.integer)("max_concurrent_sessions").default(3),
    passwordLastChanged: (0, pg_core_1.timestamp)("password_last_changed", { withTimezone: true, mode: 'string' }),
    passwordStrengthScore: (0, pg_core_1.integer)("password_strength_score").default(0),
    requirePasswordChange: (0, pg_core_1.boolean)("require_password_change").default(false),
    trustedDevices: (0, pg_core_1.jsonb)("trusted_devices").default([]),
    deviceFingerprintRequired: (0, pg_core_1.boolean)("device_fingerprint_required").default(false),
    securityQuestions: (0, pg_core_1.jsonb)("security_questions").default([]),
}, (table) => [
    (0, pg_core_1.index)("idx_user_security_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "user_security_settings_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("user_security_settings_user_id_key").on(table.userId),
    (0, pg_core_1.pgPolicy)("Users can view their own security settings", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.uid() = user_id)` }),
    (0, pg_core_1.pgPolicy)("Users can insert their own security settings", { as: "permissive", for: "insert", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can update their own security settings", { as: "permissive", for: "update", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can delete their own security settings", { as: "permissive", for: "delete", to: ["public"] }),
]);
exports.userPaymentSettings = (0, pg_core_1.pgTable)("user_payment_settings", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    autoRenewal: (0, pg_core_1.boolean)("auto_renewal").default(true),
    paymentMethod: (0, pg_core_1.text)("payment_method").default('card'),
    billingCycle: (0, pg_core_1.text)("billing_cycle").default('monthly'),
    billingAddress: (0, pg_core_1.jsonb)("billing_address"),
    taxId: (0, pg_core_1.text)("tax_id"),
    savedPaymentMethods: (0, pg_core_1.jsonb)("saved_payment_methods").default([]),
    defaultPaymentMethodId: (0, pg_core_1.text)("default_payment_method_id"),
    invoiceDelivery: (0, pg_core_1.text)("invoice_delivery").default('email'),
    paymentReminders: (0, pg_core_1.boolean)("payment_reminders").default(true),
    paymentReminderDays: (0, pg_core_1.integer)("payment_reminder_days").default(3),
    currency: (0, pg_core_1.text)().default('USD'),
    taxRate: (0, pg_core_1.numeric)("tax_rate", { precision: 5, scale: 4 }).default('0.0000'),
}, (table) => [
    (0, pg_core_1.index)("idx_user_payment_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "user_payment_settings_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("user_payment_settings_user_id_key").on(table.userId),
    (0, pg_core_1.pgPolicy)("Users can view their own payment settings", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.uid() = user_id)` }),
    (0, pg_core_1.pgPolicy)("Users can insert their own payment settings", { as: "permissive", for: "insert", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can update their own payment settings", { as: "permissive", for: "update", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can delete their own payment settings", { as: "permissive", for: "delete", to: ["public"] }),
    (0, pg_core_1.check)("user_payment_settings_billing_cycle_check", (0, drizzle_orm_1.sql) `billing_cycle = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text])`),
    (0, pg_core_1.check)("user_payment_settings_currency_check", (0, drizzle_orm_1.sql) `currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text, 'CAD'::text, 'AUD'::text, 'JPY'::text, 'CNY'::text, 'BRL'::text, 'MXN'::text])`),
    (0, pg_core_1.check)("user_payment_settings_invoice_delivery_check", (0, drizzle_orm_1.sql) `invoice_delivery = ANY (ARRAY['email'::text, 'mail'::text, 'both'::text])`),
    (0, pg_core_1.check)("user_payment_settings_payment_method_check", (0, drizzle_orm_1.sql) `payment_method = ANY (ARRAY['card'::text, 'bank'::text, 'paypal'::text, 'crypto'::text, 'apple_pay'::text, 'google_pay'::text])`),
]);
exports.userPrivacySettings = (0, pg_core_1.pgTable)("user_privacy_settings", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    profileVisibility: (0, pg_core_1.text)("profile_visibility").default('private'),
    showTenureMonths: (0, pg_core_1.boolean)("show_tenure_months").default(true),
    showJoinDate: (0, pg_core_1.boolean)("show_join_date").default(true),
    showActivityStatus: (0, pg_core_1.boolean)("show_activity_status").default(true),
    dataSharing: (0, pg_core_1.boolean)("data_sharing").default(false),
    analyticsConsent: (0, pg_core_1.boolean)("analytics_consent").default(false),
    marketingConsent: (0, pg_core_1.boolean)("marketing_consent").default(false),
    thirdPartySharing: (0, pg_core_1.boolean)("third_party_sharing").default(false),
    showEmail: (0, pg_core_1.boolean)("show_email").default(false),
    showPhone: (0, pg_core_1.boolean)("show_phone").default(false),
    showAddress: (0, pg_core_1.boolean)("show_address").default(false),
    showLoginActivity: (0, pg_core_1.boolean)("show_login_activity").default(false),
    showPaymentHistory: (0, pg_core_1.boolean)("show_payment_history").default(false),
    showTenureProgress: (0, pg_core_1.boolean)("show_tenure_progress").default(true),
    searchable: (0, pg_core_1.boolean)().default(true),
    appearInLeaderboards: (0, pg_core_1.boolean)("appear_in_leaderboards").default(true),
    showInMemberDirectory: (0, pg_core_1.boolean)("show_in_member_directory").default(false),
    dataRetentionPeriod: (0, pg_core_1.integer)("data_retention_period").default(365),
    autoDeleteInactive: (0, pg_core_1.boolean)("auto_delete_inactive").default(false),
    inactivePeriod: (0, pg_core_1.integer)("inactive_period").default(730),
}, (table) => [
    (0, pg_core_1.index)("idx_user_privacy_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "user_privacy_settings_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("user_privacy_settings_user_id_key").on(table.userId),
    (0, pg_core_1.pgPolicy)("Users can view their own privacy settings", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.uid() = user_id)` }),
    (0, pg_core_1.pgPolicy)("Users can insert their own privacy settings", { as: "permissive", for: "insert", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can update their own privacy settings", { as: "permissive", for: "update", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can delete their own privacy settings", { as: "permissive", for: "delete", to: ["public"] }),
    (0, pg_core_1.check)("user_privacy_settings_profile_visibility_check", (0, drizzle_orm_1.sql) `profile_visibility = ANY (ARRAY['public'::text, 'private'::text, 'friends'::text, 'members_only'::text])`),
]);
exports.userAppearanceSettings = (0, pg_core_1.pgTable)("user_appearance_settings", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    theme: (0, pg_core_1.text)().default('light'),
    accentColor: (0, pg_core_1.text)("accent_color").default('blue'),
    language: (0, pg_core_1.text)().default('en'),
    timezone: (0, pg_core_1.text)().default('UTC'),
    dateFormat: (0, pg_core_1.text)("date_format").default('MM/DD/YYYY'),
    timeFormat: (0, pg_core_1.text)("time_format").default('12'),
    fontSize: (0, pg_core_1.text)("font_size").default('medium'),
    compactMode: (0, pg_core_1.boolean)("compact_mode").default(false),
    showAnimations: (0, pg_core_1.boolean)("show_animations").default(true),
    reduceMotion: (0, pg_core_1.boolean)("reduce_motion").default(false),
    dashboardLayout: (0, pg_core_1.text)("dashboard_layout").default('default'),
    sidebarCollapsed: (0, pg_core_1.boolean)("sidebar_collapsed").default(false),
    showTooltips: (0, pg_core_1.boolean)("show_tooltips").default(true),
    notificationPosition: (0, pg_core_1.text)("notification_position").default('top-right'),
    notificationDuration: (0, pg_core_1.integer)("notification_duration").default(5000),
}, (table) => [
    (0, pg_core_1.index)("idx_user_appearance_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.id],
        name: "user_appearance_settings_user_id_fkey"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("user_appearance_settings_user_id_key").on(table.userId),
    (0, pg_core_1.pgPolicy)("Users can view their own appearance settings", { as: "permissive", for: "select", to: ["public"], using: (0, drizzle_orm_1.sql) `(auth.uid() = user_id)` }),
    (0, pg_core_1.pgPolicy)("Users can insert their own appearance settings", { as: "permissive", for: "insert", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can update their own appearance settings", { as: "permissive", for: "update", to: ["public"] }),
    (0, pg_core_1.pgPolicy)("Users can delete their own appearance settings", { as: "permissive", for: "delete", to: ["public"] }),
    (0, pg_core_1.check)("user_appearance_settings_accent_color_check", (0, drizzle_orm_1.sql) `accent_color = ANY (ARRAY['blue'::text, 'green'::text, 'purple'::text, 'red'::text, 'orange'::text, 'pink'::text, 'indigo'::text, 'teal'::text])`),
    (0, pg_core_1.check)("user_appearance_settings_dashboard_layout_check", (0, drizzle_orm_1.sql) `dashboard_layout = ANY (ARRAY['default'::text, 'compact'::text, 'detailed'::text])`),
    (0, pg_core_1.check)("user_appearance_settings_date_format_check", (0, drizzle_orm_1.sql) `date_format = ANY (ARRAY['MM/DD/YYYY'::text, 'DD/MM/YYYY'::text, 'YYYY-MM-DD'::text])`),
    (0, pg_core_1.check)("user_appearance_settings_font_size_check", (0, drizzle_orm_1.sql) `font_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text, 'extra_large'::text])`),
    (0, pg_core_1.check)("user_appearance_settings_language_check", (0, drizzle_orm_1.sql) `language = ANY (ARRAY['en'::text, 'es'::text, 'fr'::text, 'de'::text, 'it'::text, 'pt'::text, 'zh'::text, 'ja'::text, 'ko'::text, 'ru'::text, 'ar'::text, 'hi'::text])`),
    (0, pg_core_1.check)("user_appearance_settings_notification_position_check", (0, drizzle_orm_1.sql) `notification_position = ANY (ARRAY['top-left'::text, 'top-right'::text, 'bottom-left'::text, 'bottom-right'::text])`),
    (0, pg_core_1.check)("user_appearance_settings_theme_check", (0, drizzle_orm_1.sql) `theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])`),
    (0, pg_core_1.check)("user_appearance_settings_time_format_check", (0, drizzle_orm_1.sql) `time_format = ANY (ARRAY['12'::text, '24'::text])`),
]);
exports.verification = (0, pg_core_1.pgTable)("verification", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    identifier: (0, pg_core_1.text)().notNull(),
    value: (0, pg_core_1.text)().notNull(),
    expiresAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
exports.user = (0, pg_core_1.pgTable)("user", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)().notNull(),
    emailVerified: (0, pg_core_1.boolean)().default(false).notNull(),
    password: (0, pg_core_1.text)(),
    image: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("user_email_key").on(table.email),
]);
exports.session = (0, pg_core_1.pgTable)("session", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)().notNull(),
    expiresAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).notNull(),
    ipAddress: (0, pg_core_1.text)(),
    userAgent: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.user.id],
        name: "session_userId_user_id_fk"
    }).onDelete("cascade"),
]);
exports.account = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)().notNull(),
    accountId: (0, pg_core_1.text)().notNull(),
    providerId: (0, pg_core_1.text)().notNull(),
    accessToken: (0, pg_core_1.text)(),
    refreshToken: (0, pg_core_1.text)(),
    expiresAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }),
    scope: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.user.id],
        name: "account_userId_user_id_fk"
    }).onDelete("cascade"),
]);
exports.passkey = (0, pg_core_1.pgTable)("passkey", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)().notNull(),
    name: (0, pg_core_1.text)(),
    credentialId: (0, pg_core_1.text)().notNull(),
    publicKey: (0, pg_core_1.text)().notNull(),
    counter: (0, pg_core_1.integer)().default(0).notNull(),
    deviceType: (0, pg_core_1.text)(),
    backedUp: (0, pg_core_1.boolean)().default(false),
    transports: (0, pg_core_1.text)().array(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    lastUsedAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.user.id],
        name: "passkey_userId_user_id_fk"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("passkey_credentialId_key").on(table.credentialId),
]);
exports.twoFactor = (0, pg_core_1.pgTable)("two_factor", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)().notNull(),
    secret: (0, pg_core_1.text)().notNull(),
    backupCodes: (0, pg_core_1.text)().array(),
    verified: (0, pg_core_1.boolean)().default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    verifiedAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.user.id],
        name: "two_factor_userId_user_id_fk"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("two_factor_userId_key").on(table.userId),
]);
exports.organization = (0, pg_core_1.pgTable)("organization", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    slug: (0, pg_core_1.text)().notNull(),
    logo: (0, pg_core_1.text)(),
    metadata: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("organization_slug_key").on(table.slug),
]);
exports.organizationMember = (0, pg_core_1.pgTable)("organization_member", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)().notNull(),
    userId: (0, pg_core_1.uuid)().notNull(),
    role: (0, pg_core_1.varchar)({ length: 20 }).default('member').notNull(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.organizationId],
        foreignColumns: [exports.organization.id],
        name: "organization_member_organizationId_organization_id_fk"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.user.id],
        name: "organization_member_userId_user_id_fk"
    }).onDelete("cascade"),
]);
exports.organizationInvitation = (0, pg_core_1.pgTable)("organization_invitation", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    organizationId: (0, pg_core_1.uuid)().notNull(),
    email: (0, pg_core_1.text)().notNull(),
    role: (0, pg_core_1.varchar)({ length: 20 }).default('member').notNull(),
    inviterId: (0, pg_core_1.uuid)().notNull(),
    status: (0, pg_core_1.varchar)({ length: 20 }).default('pending').notNull(),
    token: (0, pg_core_1.text)().notNull(),
    expiresAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.inviterId],
        foreignColumns: [exports.user.id],
        name: "organization_invitation_inviterId_user_id_fk"
    }).onDelete("cascade"),
    (0, pg_core_1.foreignKey)({
        columns: [table.organizationId],
        foreignColumns: [exports.organization.id],
        name: "organization_invitation_organizationId_organization_id_fk"
    }).onDelete("cascade"),
    (0, pg_core_1.unique)("organization_invitation_token_key").on(table.token),
]);
//# sourceMappingURL=schema.js.map