import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const PaymentMethods: CollectionConfig = {
  slug: 'payment_methods',
  admin: {
    useAsTitle: 'method_type',
    defaultColumns: ['member_id', 'method_type', 'is_default', 'is_active'],
    description: 'Stores user payment method preferences and tokens',
    group: 'Financial',
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
      name: 'member_id',
      type: 'number',
      required: true,
      label: 'Member ID',
      admin: {
        description: 'Reference to member table',
      },
    },
    {
      name: 'method_type',
      type: 'select',
      required: true,
      label: 'Payment Method Type',
      options: [
        { label: 'Credit Card', value: 'CREDIT_CARD' },
        { label: 'Mobile Money', value: 'MOBILE_MONEY' },
        { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
      ],
    },
    {
      name: 'source_token',
      type: 'textarea',
      label: 'Source Token',
      admin: {
        description: 'Encrypted payment source token',
        readOnly: true,
      },
    },
    {
      name: 'is_default',
      type: 'checkbox',
      defaultValue: false,
      label: 'Is Default Payment Method',
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Is Active',
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Metadata',
      admin: {
        description: 'Additional payment method metadata (JSON format)',
      },
    },
  ],
  timestamps: true,
}