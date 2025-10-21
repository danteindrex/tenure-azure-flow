import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const UserContacts: CollectionConfig = {
  slug: 'user_contacts',
  admin: {
    useAsTitle: 'contact_value',
    defaultColumns: ['user_id', 'contact_type', 'contact_value', 'is_primary'],
    description: 'Contact information for users (phone, email, etc.)',
    group: 'User Management',
  },
  access: {
    create: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    read: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    update: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    delete: ({ req: { user } }: { req: { user: User | null } }) => !!user,
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
      name: 'contact_type',
      type: 'select',
      required: true,
      label: 'Contact Type',
      options: [
        { label: 'Phone', value: 'phone' },
        { label: 'Email', value: 'email' },
        { label: 'Emergency Contact', value: 'emergency' },
      ],
    },
    {
      name: 'contact_value',
      type: 'text',
      required: true,
      maxLength: 255,
      label: 'Contact Value',
      admin: {
        description: 'Phone number, email address, etc.',
      },
    },
    {
      name: 'is_primary',
      type: 'checkbox',
      defaultValue: false,
      label: 'Is Primary',
    },
    {
      name: 'is_verified',
      type: 'checkbox',
      defaultValue: false,
      label: 'Is Verified',
    },
  ],
  timestamps: true,
}