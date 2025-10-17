import type { CollectionConfig } from 'payload'

export const AuditLog: CollectionConfig = {
  slug: 'auditlog',
  admin: {
    useAsTitle: 'entity_changed',
    defaultColumns: ['entity_changed', 'change_type', 'admin_i_d_id', 'timestamp'],
    description: 'System audit log tracking all administrative actions',
    group: 'System',
  },
  access: {
    // Only admins can view audit logs
    create: () => false, // Audit logs should be created programmatically only
    read: ({ req: { user } }) => {
      if (!user) return false
      // Super Admin can see all, others can see only their own actions
      return user.role === 'Super Admin' ? true : {
        admin_i_d_id: {
          equals: user.id,
        },
      }
    },
    update: () => false, // Audit logs should never be updated
    delete: ({ req: { user } }) => {
      // Only Super Admin can delete audit logs
      return user?.role === 'Super Admin'
    },
  },
  fields: [
    {
      name: 'admin_i_d_id',
      type: 'relationship',
      relationTo: 'admin',
      label: 'Admin User',
      required: true,
      admin: {
        description: 'Admin user who performed this action',
        position: 'sidebar',
      },
    },
    {
      name: 'entity_changed',
      type: 'text',
      required: true,
      label: 'Entity Changed',
      maxLength: 100,
      admin: {
        description: 'Type of entity that was changed (e.g., Member, Payment, NewsFeedPost)',
      },
    },
    {
      name: 'entity_id',
      type: 'number',
      label: 'Entity ID',
      admin: {
        description: 'ID of the entity that was changed',
        position: 'sidebar',
      },
    },
    {
      name: 'change_type',
      type: 'select',
      required: true,
      label: 'Change Type',
      options: [
        { label: 'Create', value: 'INSERT' },
        { label: 'Update', value: 'UPDATE' },
        { label: 'Delete', value: 'DELETE' },
        { label: 'Login', value: 'LOGIN' },
        { label: 'Logout', value: 'LOGOUT' },
        { label: 'View', value: 'VIEW' },
        { label: 'Export', value: 'EXPORT' },
      ],
      admin: {
        description: 'Type of action performed',
      },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Timestamp',
      admin: {
        description: 'When this action occurred',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        readOnly: true,
      },
    },
    {
      name: 'change_details',
      type: 'json',
      label: 'Change Details',
      admin: {
        description: 'Detailed information about the change (JSON format)',
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
