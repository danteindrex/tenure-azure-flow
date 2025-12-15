/**
 * Activity Logger Utility
 * Tracks all admin actions across the system
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface ActivityLogData {
  adminId: number;
  sessionId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log admin activity
 */
export async function logActivity(data: ActivityLogData) {
  try {
    const { error } = await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_id: data.adminId,
        session_id: data.sessionId,
        action: data.action,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        success: data.success ?? true,
        error_message: data.errorMessage,
        metadata: {
          entity_type: data.entityType,
          entity_id: data.entityId,
          ...data.metadata,
        },
      });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Activity logging error:', error);
  }
}

/**
 * Activity action types
 */
export const ActivityActions = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_SUSPENDED: 'user_suspended',
  USER_ACTIVATED: 'user_activated',
  
  // Admin Management
  ADMIN_CREATED: 'admin_created',
  ADMIN_UPDATED: 'admin_updated',
  ADMIN_DELETED: 'admin_deleted',
  ADMIN_ROLE_CHANGED: 'admin_role_changed',
  
  // Subscription Management
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_PAUSED: 'subscription_paused',
  SUBSCRIPTION_RESUMED: 'subscription_resumed',
  
  // Transaction Management
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_UPDATED: 'transaction_updated',
  TRANSACTION_REFUNDED: 'transaction_refunded',
  
  // Payout Management
  PAYOUT_CREATED: 'payout_created',
  PAYOUT_APPROVED: 'payout_approved',
  PAYOUT_REJECTED: 'payout_rejected',
  PAYOUT_PROCESSED: 'payout_processed',
  
  // Content Management
  CONTENT_CREATED: 'content_created',
  CONTENT_UPDATED: 'content_updated',
  CONTENT_DELETED: 'content_deleted',
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_UNPUBLISHED: 'content_unpublished',
  
  // Settings
  SETTINGS_UPDATED: 'settings_updated',
  INTEGRATION_CONFIGURED: 'integration_configured',
  
  // Security
  SESSION_INVALIDATED: 'session_invalidated',
  PASSWORD_CHANGED: 'password_changed',
  TWO_FA_ENABLED: '2fa_enabled',
  TWO_FA_DISABLED: '2fa_disabled',
  
  // System
  EXPORT_GENERATED: 'export_generated',
  BULK_ACTION: 'bulk_action',
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REVOKED: 'api_key_revoked',
} as const;

/**
 * Get activity description
 */
export function getActivityDescription(action: string, metadata?: any): string {
  const descriptions: Record<string, string> = {
    login: 'Logged in',
    logout: 'Logged out',
    session_expired: 'Session expired',
    user_created: 'Created user',
    user_updated: 'Updated user',
    user_deleted: 'Deleted user',
    user_suspended: 'Suspended user',
    user_activated: 'Activated user',
    admin_created: 'Created admin',
    admin_updated: 'Updated admin',
    admin_deleted: 'Deleted admin',
    admin_role_changed: 'Changed admin role',
    subscription_created: 'Created subscription',
    subscription_updated: 'Updated subscription',
    subscription_cancelled: 'Cancelled subscription',
    subscription_paused: 'Paused subscription',
    subscription_resumed: 'Resumed subscription',
    transaction_created: 'Created transaction',
    transaction_updated: 'Updated transaction',
    transaction_refunded: 'Refunded transaction',
    payout_created: 'Created payout',
    payout_approved: 'Approved payout',
    payout_rejected: 'Rejected payout',
    payout_processed: 'Processed payout',
    content_created: 'Created content',
    content_updated: 'Updated content',
    content_deleted: 'Deleted content',
    content_published: 'Published content',
    content_unpublished: 'Unpublished content',
    settings_updated: 'Updated settings',
    integration_configured: 'Configured integration',
    session_invalidated: 'Invalidated session',
    password_changed: 'Changed password',
    '2fa_enabled': 'Enabled 2FA',
    '2fa_disabled': 'Disabled 2FA',
    export_generated: 'Generated export',
    bulk_action: 'Performed bulk action',
    api_key_created: 'Created API key',
    api_key_revoked: 'Revoked API key',
  };

  let description = descriptions[action] || action;
  
  if (metadata?.entity_id) {
    description += ` (ID: ${metadata.entity_id})`;
  }
  
  return description;
}
