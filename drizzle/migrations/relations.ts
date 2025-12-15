import { relations } from "drizzle-orm/relations";
import { postStatuses, newsfeedposts, users, admin, adminActivityLogs, adminSessions, userAddresses, userProfiles, userContacts, membershipQueue, admin2FaCodes, memberEligibilityStatuses, userMemberships, userSubscriptions, verificationStatuses, systemAuditLogs, paymentStatuses, userPayments, userAgreements, userBillingSchedules, userPaymentMethods, subscriptionStatuses, payoutManagement, payoutStatuses, taxFormStatuses, taxForms, kycStatuses, kycVerification, disputeStatuses, disputes, userAppearanceSettings, userNotificationPreferences, userPaymentSettings, userPrivacySettings, userSecuritySettings, userSettings, passkey, userFunnelStatuses, adminStatuses, adminAccounts, organization, organizationMember, organizationInvitation, session, account, twoFactor, subscriptions, twoFactorAuth, payouts, accessControlRules, featureAccess, protectedRoutes, transactions, transactionStatuses, adminAlertStatuses, adminAlerts, transactionMonitoringStatuses, transactionMonitoring, auditLogs, auditLogStatuses } from "./schema";

export const newsfeedpostsRelations = relations(newsfeedposts, ({one}) => ({
	postStatus: one(postStatuses, {
		fields: [newsfeedposts.postStatusId],
		references: [postStatuses.id]
	}),
	user: one(users, {
		fields: [newsfeedposts.userId],
		references: [users.id]
	}),
}));

export const postStatusesRelations = relations(postStatuses, ({many}) => ({
	newsfeedposts: many(newsfeedposts),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	newsfeedposts: many(newsfeedposts),
	userAddresses: many(userAddresses),
	userProfiles: many(userProfiles),
	userContacts: many(userContacts),
	membershipQueues: many(membershipQueue),
	userMemberships: many(userMemberships),
	systemAuditLogs: many(systemAuditLogs),
	userPayments: many(userPayments),
	userAgreements: many(userAgreements),
	userBillingSchedules: many(userBillingSchedules),
	userPaymentMethods: many(userPaymentMethods),
	userSubscriptions: many(userSubscriptions),
	payoutManagements: many(payoutManagement),
	taxForms: many(taxForms),
	kycVerifications: many(kycVerification),
	disputes: many(disputes),
	userAppearanceSettings: many(userAppearanceSettings),
	userNotificationPreferences: many(userNotificationPreferences),
	userPaymentSettings: many(userPaymentSettings),
	userPrivacySettings: many(userPrivacySettings),
	userSecuritySettings: many(userSecuritySettings),
	userSettings: many(userSettings),
	passkeys: many(passkey),
	userFunnelStatus: one(userFunnelStatuses, {
		fields: [users.userStatusId],
		references: [userFunnelStatuses.id]
	}),
	organizationMembers: many(organizationMember),
	organizationInvitations: many(organizationInvitation),
	sessions: many(session),
	accounts: many(account),
	twoFactors: many(twoFactor),
	subscriptions: many(subscriptions),
	transactions: many(transactions),
	transactionMonitorings: many(transactionMonitoring),
}));

export const adminActivityLogsRelations = relations(adminActivityLogs, ({one}) => ({
	admin: one(admin, {
		fields: [adminActivityLogs.adminId],
		references: [admin.id]
	}),
	adminSession: one(adminSessions, {
		fields: [adminActivityLogs.sessionId],
		references: [adminSessions.id]
	}),
}));

export const adminRelations = relations(admin, ({one, many}) => ({
	adminActivityLogs: many(adminActivityLogs),
	admin2FaCodes: many(admin2FaCodes),
	adminStatus: one(adminStatuses, {
		fields: [admin.adminStatusId],
		references: [adminStatuses.id]
	}),
	adminSessions: many(adminSessions),
	auditLogs: many(auditLogs),
}));

export const adminSessionsRelations = relations(adminSessions, ({one, many}) => ({
	adminActivityLogs: many(adminActivityLogs),
	admin: one(admin, {
		fields: [adminSessions.adminId],
		references: [admin.id]
	}),
}));

export const userAddressesRelations = relations(userAddresses, ({one}) => ({
	user: one(users, {
		fields: [userAddresses.userId],
		references: [users.id]
	}),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
}));

export const userContactsRelations = relations(userContacts, ({one}) => ({
	user: one(users, {
		fields: [userContacts.userId],
		references: [users.id]
	}),
}));

export const membershipQueueRelations = relations(membershipQueue, ({one}) => ({
	user: one(users, {
		fields: [membershipQueue.userId],
		references: [users.id]
	}),
}));

export const admin2FaCodesRelations = relations(admin2FaCodes, ({one}) => ({
	admin: one(admin, {
		fields: [admin2FaCodes.adminId],
		references: [admin.id]
	}),
}));

export const userMembershipsRelations = relations(userMemberships, ({one, many}) => ({
	memberEligibilityStatus_memberStatusId: one(memberEligibilityStatuses, {
		fields: [userMemberships.memberStatusId],
		references: [memberEligibilityStatuses.id],
		relationName: "userMemberships_memberStatusId_memberEligibilityStatuses_id"
	}),
	memberEligibilityStatus_memberEligibilityStatusId: one(memberEligibilityStatuses, {
		fields: [userMemberships.memberEligibilityStatusId],
		references: [memberEligibilityStatuses.id],
		relationName: "userMemberships_memberEligibilityStatusId_memberEligibilityStatuses_id"
	}),
	userSubscription: one(userSubscriptions, {
		fields: [userMemberships.subscriptionId],
		references: [userSubscriptions.id]
	}),
	user: one(users, {
		fields: [userMemberships.userId],
		references: [users.id]
	}),
	verificationStatus: one(verificationStatuses, {
		fields: [userMemberships.verificationStatusId],
		references: [verificationStatuses.id]
	}),
	payoutManagements: many(payoutManagement),
}));

export const memberEligibilityStatusesRelations = relations(memberEligibilityStatuses, ({many}) => ({
	userMemberships_memberStatusId: many(userMemberships, {
		relationName: "userMemberships_memberStatusId_memberEligibilityStatuses_id"
	}),
	userMemberships_memberEligibilityStatusId: many(userMemberships, {
		relationName: "userMemberships_memberEligibilityStatusId_memberEligibilityStatuses_id"
	}),
	protectedRoutes: many(protectedRoutes),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({one, many}) => ({
	userMemberships: many(userMemberships),
	userBillingSchedules: many(userBillingSchedules),
	subscriptionStatus: one(subscriptionStatuses, {
		fields: [userSubscriptions.subscriptionStatusId],
		references: [subscriptionStatuses.id]
	}),
	user: one(users, {
		fields: [userSubscriptions.userId],
		references: [users.id]
	}),
}));

export const verificationStatusesRelations = relations(verificationStatuses, ({many}) => ({
	userMemberships: many(userMemberships),
}));

export const systemAuditLogsRelations = relations(systemAuditLogs, ({one}) => ({
	user: one(users, {
		fields: [systemAuditLogs.userId],
		references: [users.id]
	}),
}));

export const userPaymentsRelations = relations(userPayments, ({one}) => ({
	paymentStatus: one(paymentStatuses, {
		fields: [userPayments.paymentStatusId],
		references: [paymentStatuses.id]
	}),
	user: one(users, {
		fields: [userPayments.userId],
		references: [users.id]
	}),
}));

export const paymentStatusesRelations = relations(paymentStatuses, ({many}) => ({
	userPayments: many(userPayments),
}));

export const userAgreementsRelations = relations(userAgreements, ({one}) => ({
	user: one(users, {
		fields: [userAgreements.userId],
		references: [users.id]
	}),
}));

export const userBillingSchedulesRelations = relations(userBillingSchedules, ({one}) => ({
	userSubscription: one(userSubscriptions, {
		fields: [userBillingSchedules.subscriptionId],
		references: [userSubscriptions.id]
	}),
	user: one(users, {
		fields: [userBillingSchedules.userId],
		references: [users.id]
	}),
}));

export const userPaymentMethodsRelations = relations(userPaymentMethods, ({one}) => ({
	user: one(users, {
		fields: [userPaymentMethods.userId],
		references: [users.id]
	}),
}));

export const subscriptionStatusesRelations = relations(subscriptionStatuses, ({many}) => ({
	userSubscriptions: many(userSubscriptions),
}));

export const payoutManagementRelations = relations(payoutManagement, ({one}) => ({
	userMembership: one(userMemberships, {
		fields: [payoutManagement.membershipId],
		references: [userMemberships.id]
	}),
	payoutStatus: one(payoutStatuses, {
		fields: [payoutManagement.payoutStatusId],
		references: [payoutStatuses.id]
	}),
	user: one(users, {
		fields: [payoutManagement.userId],
		references: [users.id]
	}),
}));

export const payoutStatusesRelations = relations(payoutStatuses, ({many}) => ({
	payoutManagements: many(payoutManagement),
	payouts: many(payouts),
}));

export const taxFormsRelations = relations(taxForms, ({one}) => ({
	taxFormStatus: one(taxFormStatuses, {
		fields: [taxForms.taxFormStatusId],
		references: [taxFormStatuses.id]
	}),
	user: one(users, {
		fields: [taxForms.userId],
		references: [users.id]
	}),
}));

export const taxFormStatusesRelations = relations(taxFormStatuses, ({many}) => ({
	taxForms: many(taxForms),
}));

export const kycVerificationRelations = relations(kycVerification, ({one}) => ({
	kycStatus: one(kycStatuses, {
		fields: [kycVerification.kycStatusId],
		references: [kycStatuses.id]
	}),
	user: one(users, {
		fields: [kycVerification.userId],
		references: [users.id]
	}),
}));

export const kycStatusesRelations = relations(kycStatuses, ({many}) => ({
	kycVerifications: many(kycVerification),
}));

export const disputesRelations = relations(disputes, ({one}) => ({
	disputeStatus: one(disputeStatuses, {
		fields: [disputes.disputeStatusId],
		references: [disputeStatuses.id]
	}),
	user: one(users, {
		fields: [disputes.userId],
		references: [users.id]
	}),
}));

export const disputeStatusesRelations = relations(disputeStatuses, ({many}) => ({
	disputes: many(disputes),
}));

export const userAppearanceSettingsRelations = relations(userAppearanceSettings, ({one}) => ({
	user: one(users, {
		fields: [userAppearanceSettings.userId],
		references: [users.id]
	}),
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [userNotificationPreferences.userId],
		references: [users.id]
	}),
}));

export const userPaymentSettingsRelations = relations(userPaymentSettings, ({one}) => ({
	user: one(users, {
		fields: [userPaymentSettings.userId],
		references: [users.id]
	}),
}));

export const userPrivacySettingsRelations = relations(userPrivacySettings, ({one}) => ({
	user: one(users, {
		fields: [userPrivacySettings.userId],
		references: [users.id]
	}),
}));

export const userSecuritySettingsRelations = relations(userSecuritySettings, ({one}) => ({
	user: one(users, {
		fields: [userSecuritySettings.userId],
		references: [users.id]
	}),
}));

export const userSettingsRelations = relations(userSettings, ({one}) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id]
	}),
}));

export const passkeyRelations = relations(passkey, ({one}) => ({
	user: one(users, {
		fields: [passkey.userId],
		references: [users.id]
	}),
}));

export const userFunnelStatusesRelations = relations(userFunnelStatuses, ({many}) => ({
	users: many(users),
}));

export const adminAccountsRelations = relations(adminAccounts, ({one, many}) => ({
	adminStatus: one(adminStatuses, {
		fields: [adminAccounts.adminStatusId],
		references: [adminStatuses.id]
	}),
	twoFactorAuths: many(twoFactorAuth),
}));

export const adminStatusesRelations = relations(adminStatuses, ({many}) => ({
	adminAccounts: many(adminAccounts),
	admins: many(admin),
}));

export const organizationMemberRelations = relations(organizationMember, ({one}) => ({
	organization: one(organization, {
		fields: [organizationMember.organizationId],
		references: [organization.id]
	}),
	user: one(users, {
		fields: [organizationMember.userId],
		references: [users.id]
	}),
}));

export const organizationRelations = relations(organization, ({many}) => ({
	organizationMembers: many(organizationMember),
	organizationInvitations: many(organizationInvitation),
}));

export const organizationInvitationRelations = relations(organizationInvitation, ({one}) => ({
	user: one(users, {
		fields: [organizationInvitation.inviterId],
		references: [users.id]
	}),
	organization: one(organization, {
		fields: [organizationInvitation.organizationId],
		references: [organization.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(users, {
		fields: [session.userId],
		references: [users.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(users, {
		fields: [account.userId],
		references: [users.id]
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({one}) => ({
	user: one(users, {
		fields: [twoFactor.userId],
		references: [users.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one, many}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
	transactions: many(transactions),
}));

export const twoFactorAuthRelations = relations(twoFactorAuth, ({one}) => ({
	adminAccount: one(adminAccounts, {
		fields: [twoFactorAuth.adminId],
		references: [adminAccounts.id]
	}),
}));

export const payoutsRelations = relations(payouts, ({one}) => ({
	payoutStatus: one(payoutStatuses, {
		fields: [payouts.payoutStatusId],
		references: [payoutStatuses.id]
	}),
}));

export const featureAccessRelations = relations(featureAccess, ({one}) => ({
	accessControlRule: one(accessControlRules, {
		fields: [featureAccess.accessRuleId],
		references: [accessControlRules.id]
	}),
}));

export const accessControlRulesRelations = relations(accessControlRules, ({many}) => ({
	featureAccesses: many(featureAccess),
	protectedRoutes: many(protectedRoutes),
}));

export const protectedRoutesRelations = relations(protectedRoutes, ({one}) => ({
	accessControlRule: one(accessControlRules, {
		fields: [protectedRoutes.accessRuleId],
		references: [accessControlRules.id]
	}),
	memberEligibilityStatus: one(memberEligibilityStatuses, {
		fields: [protectedRoutes.checkMemberStatusId],
		references: [memberEligibilityStatuses.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	subscription: one(subscriptions, {
		fields: [transactions.subscriptionId],
		references: [subscriptions.id]
	}),
	transactionStatus: one(transactionStatuses, {
		fields: [transactions.transactionStatusId],
		references: [transactionStatuses.id]
	}),
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
}));

export const transactionStatusesRelations = relations(transactionStatuses, ({many}) => ({
	transactions: many(transactions),
}));

export const adminAlertsRelations = relations(adminAlerts, ({one}) => ({
	adminAlertStatus: one(adminAlertStatuses, {
		fields: [adminAlerts.alertStatusId],
		references: [adminAlertStatuses.id]
	}),
}));

export const adminAlertStatusesRelations = relations(adminAlertStatuses, ({many}) => ({
	adminAlerts: many(adminAlerts),
}));

export const transactionMonitoringRelations = relations(transactionMonitoring, ({one}) => ({
	transactionMonitoringStatus: one(transactionMonitoringStatuses, {
		fields: [transactionMonitoring.monitoringStatusId],
		references: [transactionMonitoringStatuses.id]
	}),
	user: one(users, {
		fields: [transactionMonitoring.userId],
		references: [users.id]
	}),
}));

export const transactionMonitoringStatusesRelations = relations(transactionMonitoringStatuses, ({many}) => ({
	transactionMonitorings: many(transactionMonitoring),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	admin: one(admin, {
		fields: [auditLogs.adminId],
		references: [admin.id]
	}),
	auditLogStatus: one(auditLogStatuses, {
		fields: [auditLogs.auditStatusId],
		references: [auditLogStatuses.id]
	}),
}));

export const auditLogStatusesRelations = relations(auditLogStatuses, ({many}) => ({
	auditLogs: many(auditLogs),
}));