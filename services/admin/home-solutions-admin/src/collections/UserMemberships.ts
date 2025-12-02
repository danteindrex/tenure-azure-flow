import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const UserMemberships: CollectionConfig = {
  slug: 'user_memberships',
  admin: {
    useAsTitle: 'user_id',
    defaultColumns: ['user_id', 'join_date', 'tenure', 'member_status_id', 'verification_status_id'],
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
      name: 'member_status_id',
      type: 'number',
      defaultValue: 1,
      label: 'Member Eligibility Status',
      admin: {
        description: 'FK to member_eligibility_statuses: 1=Inactive, 2=Active, 3=Suspended, 4=Cancelled, 5=Won, 6=Paid',
      },
    },
    {
      name: 'verification_status_id',
      type: 'number',
      defaultValue: 1,
      label: 'Verification Status',
      admin: {
        description: 'FK to verification_statuses: 1=Pending, 2=Verified, 3=Failed, 4=Skipped',
      },
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