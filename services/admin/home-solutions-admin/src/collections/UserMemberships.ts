import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const UserMemberships: CollectionConfig = {
  slug: 'user_memberships',
  admin: {
    useAsTitle: 'user_id',
    defaultColumns: ['user_id', 'join_date', 'tenure', 'verification_status'],
    description: 'Membership-specific business data',
    group: 'User Management',
  },
  access: {
    create: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    read: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    update: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    delete: ({ req: { user } }: { req: { user: User | null } }) => user?.role === 'Super Admin',
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
      required: true,
      label: 'User ID',
      admin: {
        description: 'Reference to users table',
      },
    },
    {
      name: 'join_date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString().split('T')[0],
      label: 'Join Date',
    },
    {
      name: 'tenure',
      type: 'number',
      defaultValue: 0,
      label: 'Tenure (months)',
      admin: {
        description: 'Current tenure duration in months',
      },
    },
    {
      name: 'verification_status',
      type: 'select',
      defaultValue: 'PENDING',
      label: 'Verification Status',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Verified', value: 'VERIFIED' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Skipped', value: 'SKIPPED' },
      ],
    },
    {
      name: 'assigned_admin_id',
      type: 'relationship',
      relationTo: 'admin',
      label: 'Assigned Admin',
      admin: {
        description: 'Administrator managing this member',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
    },
  ],
  timestamps: true,
}