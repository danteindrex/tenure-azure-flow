import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const UserProfiles: CollectionConfig = {
  slug: 'user_profiles',
  admin: {
    useAsTitle: 'first_name',
    defaultColumns: ['user_id', 'first_name', 'last_name', 'date_of_birth'],
    description: 'Personal profile information for users',
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
      name: 'first_name',
      type: 'text',
      maxLength: 100,
      label: 'First Name',
    },
    {
      name: 'last_name',
      type: 'text',
      maxLength: 100,
      label: 'Last Name',
    },
    {
      name: 'middle_name',
      type: 'text',
      maxLength: 100,
      label: 'Middle Name',
    },
    {
      name: 'date_of_birth',
      type: 'date',
      label: 'Date of Birth',
      admin: {
        description: 'Required for identity verification and compliance',
      },
    },
  ],
  timestamps: true,
}