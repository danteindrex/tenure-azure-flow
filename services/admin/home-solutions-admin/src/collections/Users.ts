import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'email_verified', 'created_at'],
    description: 'Core user identity and authentication',
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
      name: 'auth_user_id',
      type: 'text',
      label: 'Auth User ID',
      admin: {
        description: 'Supabase auth user ID',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: 'Email Address',
    },
    {
      name: 'email_verified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Email Verified',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'Pending',
      label: 'User Status',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Suspended', value: 'Suspended' },
        { label: 'Pending', value: 'Pending' },
      ],
    },
  ],
  timestamps: true,
}