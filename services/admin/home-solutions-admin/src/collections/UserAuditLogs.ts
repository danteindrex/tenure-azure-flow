import { CollectionConfig } from 'payload/types'

const UserAuditLogs: CollectionConfig = {
  slug: 'user_audit_logs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['user_id', 'action', 'success', 'created_at'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user_id',
      type: 'text',
      required: false,
      admin: {
        description: 'User ID associated with this audit log entry',
      },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Login', value: 'login' },
        { label: 'Logout', value: 'logout' },
        { label: 'Profile Update', value: 'profile_update' },
        { label: 'Payment', value: 'payment' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'Queue Update', value: 'queue_update' },
        { label: 'System', value: 'system' },
      ],
      admin: {
        description: 'Type of action performed',
      },
    },
    {
      name: 'success',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      admin: {
        description: 'Whether the action was successful',
      },
    },
    {
      name: 'error_message',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Error message if action failed',
        condition: (data) => !data.success,
      },
    },
    {
      name: 'metadata',
      type: 'json',
      required: false,
      admin: {
        description: 'Additional metadata about the action',
      },
    },
    {
      name: 'ip_address',
      type: 'text',
      required: false,
      admin: {
        description: 'IP address of the user',
      },
    },
    {
      name: 'user_agent',
      type: 'textarea',
      required: false,
      admin: {
        description: 'User agent string',
      },
    },
  ],
  timestamps: true,
}

export { UserAuditLogs }
export default UserAuditLogs