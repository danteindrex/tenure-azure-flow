import { relations } from "drizzle-orm/relations";
import { user, verificationCodes, admin, payloadLockedDocumentsRels, payloadLockedDocuments, payloadPreferencesRels, payloadPreferences, adminSessions, signupSessions, users, payoutManagement, taxForms, kycVerification, disputes, transactionMonitoring, userSettings, userNotificationPreferences, userSecuritySettings, userPaymentSettings, userPrivacySettings, userAppearanceSettings, session, account, twoFactor, organization } from "./schema";

export const verificationCodesRelations = relations(verificationCodes, ({one}) => ({
	user: one(user, {
		fields: [verificationCodes.userId],
		references: [user.id]
	}),
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
	user: one(user, {
		fields: [signupSessions.userId],
		references: [user.id]
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
	user: one(user, {
		fields: [userSettings.userId],
		references: [user.id]
	}),
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({one}) => ({
	user: one(user, {
		fields: [userNotificationPreferences.userId],
		references: [user.id]
	}),
}));

export const userSecuritySettingsRelations = relations(userSecuritySettings, ({one}) => ({
	user: one(user, {
		fields: [userSecuritySettings.userId],
		references: [user.id]
	}),
}));

export const userPaymentSettingsRelations = relations(userPaymentSettings, ({one}) => ({
	user: one(user, {
		fields: [userPaymentSettings.userId],
		references: [user.id]
	}),
}));

export const userPrivacySettingsRelations = relations(userPrivacySettings, ({one}) => ({
	user: one(user, {
		fields: [userPrivacySettings.userId],
		references: [user.id]
	}),
}));

export const userAppearanceSettingsRelations = relations(userAppearanceSettings, ({one}) => ({
	user: one(user, {
		fields: [userAppearanceSettings.userId],
		references: [user.id]
	}),
}));