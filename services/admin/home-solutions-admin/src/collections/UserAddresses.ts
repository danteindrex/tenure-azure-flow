import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const UserAddresses: CollectionConfig = {
  slug: 'user_addresses',
  admin: {
    useAsTitle: 'street_address',
    defaultColumns: ['user_id', 'address_type', 'city', 'state', 'is_primary'],
    description: 'Address information for users',
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
      name: 'address_type',
      type: 'select',
      defaultValue: 'primary',
      label: 'Address Type',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Billing', value: 'billing' },
        { label: 'Shipping', value: 'shipping' },
      ],
    },
    {
      name: 'street_address',
      type: 'text',
      maxLength: 255,
      label: 'Street Address',
    },
    {
      name: 'address_line_2',
      type: 'text',
      maxLength: 255,
      label: 'Address Line 2',
      admin: {
        description: 'Apartment, suite, unit, etc. (optional)',
      },
    },
    {
      name: 'city',
      type: 'text',
      maxLength: 100,
      label: 'City',
    },
    {
      name: 'state',
      type: 'text',
      maxLength: 100,
      label: 'State/Province',
    },
    {
      name: 'postal_code',
      type: 'text',
      maxLength: 20,
      label: 'Postal Code',
    },
    {
      name: 'country_code',
      type: 'text',
      maxLength: 2,
      defaultValue: 'US',
      label: 'Country Code',
      admin: {
        description: 'ISO 2-letter country code',
      },
    },
    {
      name: 'is_primary',
      type: 'checkbox',
      defaultValue: true,
      label: 'Is Primary',
    },
  ],
  timestamps: true,
}