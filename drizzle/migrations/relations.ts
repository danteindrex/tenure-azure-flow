import { relations } from "drizzle-orm/relations";
import { usersInAuth, verificationCodes, admin, payloadLockedDocumentsRels, payloadLockedDocuments, payloadPreferencesRels, payloadPreferences, adminSessions, signupSessions, users, payoutManagement, taxForms, kycVerification, disputes, transactionMonitoring, userSettings, userNotificationPreferences, userSecuritySettings, userPaymentSettings, userPrivacySettings, userAppearanceSettings, user, session, account, passkey, twoFactor, organization, organizationMember, organizationInvitation } from "./schema";

export const verificationCodesRelations = relations(verificationCodes, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [verificationCodes.userId],
		references: [usersInAuth.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	verificationCodes: many(verificationCodes),
	signupSessions: many(signupSessions),
	userSettings: many(userSettings),
	userNotificationPreferences: many(userNotificationPreferences),
	userSecuritySettings: many(userSecuritySettings),
	userPaymentSettings: many(userPaymentSettings),
	userPrivacySettings: many(userPrivacySettings),
	userAppearanceSettings: many(userAppearanceSettings),
}));

export const payloadLockedDocumentsRelsRelations = relations(payloadLockedDocumentsRels, ({one}) => ({
	admin: one(admin, {
		fields: [payloadLockedDocumentsRels.adminId],
		references: [admin.id]
	}),
	payloadLockedDocument: one(payloadLockedDocuments, {
		fields: [payloadLockedDocumentsRels.parentId],
		references: [payloadLockedDocuments.id]
	}),
}));

export const adminRelations = relations(admin, ({many}) => ({
	payloadLockedDocumentsRels: many(payloadLockedDocumentsRels),
	payloadPreferencesRels: many(payloadPreferencesRels),
	adminSessions: many(adminSessions),
}));

export const payloadLockedDocumentsRelations = relations(payloadLockedDocuments, ({many}) => ({
	payloadLockedDocumentsRels: many(payloadLockedDocumentsRels),
}));

export const payloadPreferencesRelsRelations = relations(payloadPreferencesRels, ({one}) => ({
	admin: one(admin, {
		fields: [payloadPreferencesRels.adminId],
		references: [admin.id]
	}),
	payloadPreference: one(payloadPreferences, {
		fields: [payloadPreferencesRels.parentId],
		references: [payloadPreferences.id]
	}),
}));

export const payloadPreferencesRelations = relations(payloadPreferences, ({many}) => ({
	payloadPreferencesRels: many(payloadPreferencesRels),
}));

export const adminSessionsRelations = relations(adminSessions, ({one}) => ({
	admin: one(admin, {
		fields: [adminSessions.parentId],
		references: [admin.id]
	}),
}));

export const signupSessionsRelations = relations(signupSessions, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [signupSessions.userId],
		references: [usersInAuth.id]
	}),
}));

export const payoutManagementRelations = relations(payoutManagement, ({one}) => ({
	user: one(users, {
		fields: [payoutManagement.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	payoutManagements: many(payoutManagement),
	taxForms: many(taxForms),
	kycVerifications: many(kycVerification),
	disputes: many(disputes),
	transactionMonitorings: many(transactionMonitoring),
}));

export const taxFormsRelations = relations(taxForms, ({one}) => ({
	user: one(users, {
		fields: [taxForms.userId],
		references: [users.id]
	}),
}));

export const kycVerificationRelations = relations(kycVerification, ({one}) => ({
	user: one(users, {
		fields: [kycVerification.userId],
		references: [users.id]
	}),
}));

export const disputesRelations = relations(disputes, ({one}) => ({
	user: one(users, {
		fields: [disputes.userId],
		references: [users.id]
	}),
}));

export const transactionMonitoringRelations = relations(transactionMonitoring, ({one}) => ({
	user: one(users, {
		fields: [transactionMonitoring.userId],
		references: [users.id]
	}),
}));

export const userSettingsRelations = relations(userSettings, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userSettings.userId],
		references: [usersInAuth.id]
	}),
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userNotificationPreferences.userId],
		references: [usersInAuth.id]
	}),
}));

export const userSecuritySettingsRelations = relations(userSecuritySettings, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userSecuritySettings.userId],
		references: [usersInAuth.id]
	}),
}));

export const userPaymentSettingsRelations = relations(userPaymentSettings, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userPaymentSettings.userId],
		references: [usersInAuth.id]
	}),
}));

export const userPrivacySettingsRelations = relations(userPrivacySettings, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userPrivacySettings.userId],
		references: [usersInAuth.id]
	}),
}));

export const userAppearanceSettingsRelations = relations(userAppearanceSettings, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userAppearanceSettings.userId],
		references: [usersInAuth.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
	passkeys: many(passkey),
	twoFactors: many(twoFactor),
	organizationMembers: many(organizationMember),
	organizationInvitations: many(organizationInvitation),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const passkeyRelations = relations(passkey, ({one}) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id]
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({one}) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id]
	}),
}));

export const organizationMemberRelations = relations(organizationMember, ({one}) => ({
	organization: one(organization, {
		fields: [organizationMember.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [organizationMember.userId],
		references: [user.id]
	}),
}));

export const organizationRelations = relations(organization, ({many}) => ({
	organizationMembers: many(organizationMember),
	organizationInvitations: many(organizationInvitation),
}));

export const organizationInvitationRelations = relations(organizationInvitation, ({one}) => ({
	user: one(user, {
		fields: [organizationInvitation.inviterId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [organizationInvitation.organizationId],
		references: [organization.id]
	}),
}));