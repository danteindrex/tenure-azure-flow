import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from "@/drizzle/db";
import {
  userSettings,
  userNotificationPreferences,
  userSecuritySettings,
  userPaymentSettings,
  userPrivacySettings,
  userAppearanceSettings
} from "@/drizzle/schema";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      userId,
      settingsType,
      settings
    }: {
      userId: string;
      settingsType: 'general' | 'notifications' | 'security' | 'payment' | 'privacy' | 'appearance';
      settings: any;
    } = req.body;

    if (!userId || !settingsType || !settings) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let tableName: string;
    let table: any;

    // Determine which table to update based on settings type
    switch (settingsType) {
      case 'general':
        table = userSettings;
        tableName = 'user_settings';
        break;
      case 'notifications':
        table = userNotificationPreferences;
        tableName = 'user_notification_preferences';
        break;
      case 'security':
        table = userSecuritySettings;
        tableName = 'user_security_settings';
        break;
      case 'payment':
        table = userPaymentSettings;
        tableName = 'user_payment_settings';
        break;
      case 'privacy':
        table = userPrivacySettings;
        tableName = 'user_privacy_settings';
        break;
      case 'appearance':
        table = userAppearanceSettings;
        tableName = 'user_appearance_settings';
        break;
      default:
        return res.status(400).json({ error: 'Invalid settings type' });
    }

    // Update the settings using Drizzle
    try {
      await db.insert(table)
        .values({
          userId: userId,
          ...settings,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: table.userId,
          set: {
            ...settings,
            updatedAt: new Date()
          }
        });
    } catch (err: any) {
      console.error(`Error updating ${settingsType} settings:`, err);
      return res.status(500).json({ error: `Failed to update ${settingsType} settings` });
    }

    return res.status(200).json({
      success: true,
      message: `${settingsType} settings updated successfully`
    });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
