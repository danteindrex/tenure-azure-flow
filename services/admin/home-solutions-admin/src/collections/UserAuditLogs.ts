import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const UserAuditLogs: CollectionConfig = {
  slug: 'user_audit_logs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['user_id', 'action', 'success', 'created_at'],
    description: 'Tracks user actions and system events for auditing purposes',
    group: 'System',
  },
  access: {
    create: () => false, // Audit logs should be created programmatically only
    read: ({ req: { user } }: { req: { user: User | null } }) => {
      if (!user) return false
      // Super Admin can see all, others can see only their own actions
      return user.role === 'Super Admin' ? true : {
        user_id: {
          equals: user.id,
        },
      }
    },
    update: () => false, // Audit logs should never be updated
    delete: ({ req: { user } }: { req: { user: User | null } }) => {
      // Only Super Admin can delete audit logs
      return user?.role === 'Super Admin'
    },
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'user_id',
      type: 'text',
      label: 'User ID',
      admin: {
        description: 'ID of the user who performed the action',
      },
    },
    {
      name: 'action',
      type: 'text',
      required: true,
      maxLength: 100,
      label: 'Action',
      admin: {
        description: 'Action that was performed',
      },
    },
    {
      name: 'success',
      type: 'checkbox',
      required: true,
      label: 'Success',
      admin: {
        description: 'Whether the action was successful',
      },
    },
    {
      name: 'error_message',
      type: 'textarea',
      label: 'Error Message',
      admin: {
        description: 'Error message if action failed',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Metadata',
      admin: {
        description: 'Additional action metadata (JSON format)',
      },
    },
    {
      name: 'ip_address',
      type: 'text',
      label: 'IP Address',
      admin: {
        description: 'IP address of the user',
        position: 'sidebar',
      },
    },
    {
      name: 'user_agent',
      type: 'textarea',
      label: 'User Agent',
      admin: {
        description: 'Browser user agent string',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}