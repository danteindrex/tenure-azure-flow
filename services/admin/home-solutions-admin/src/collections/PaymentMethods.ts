import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const PaymentMethods: CollectionConfig = {
  slug: 'user_payment_methods',
  admin: {
    useAsTitle: 'method_type',
    defaultColumns: ['user_id', 'method_type', 'provider', 'is_default', 'is_active'],
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
      name: 'user_id',
      type: 'text',
      required: true,
      label: 'User ID',
      admin: {
        description: 'Reference to users table',
      },
    },
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'stripe',
      label: 'Provider',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Bank', value: 'bank' },
      ],
    },
    {
      name: 'method_type',
      type: 'select',
      required: true,
      label: 'Payment Method Type',
      options: [
        { label: 'Card', value: 'card' },
        { label: 'Bank Account', value: 'bank_account' },
        { label: 'Digital Wallet', value: 'digital_wallet' },
      ],
    },
    {
      name: 'method_subtype',
      type: 'select',
      label: 'Payment Method Subtype',
      options: [
        { label: 'Apple Pay', value: 'apple_pay' },
        { label: 'Google Pay', value: 'google_pay' },
        { label: 'Cash App', value: 'cash_app' },
      ],
    },
    {
      name: 'provider_payment_method_id',
      type: 'text',
      label: 'Provider Payment Method ID',
      admin: {
        description: 'Provider payment method identifier',
        readOnly: true,
      },
    },
    {
      name: 'last_four',
      type: 'text',
      maxLength: 4,
      label: 'Last Four Digits',
    },
    {
      name: 'brand',
      type: 'text',
      label: 'Brand',
      admin: {
        description: 'Card brand (visa, mastercard, etc.)',
      },
    },
    {
      name: 'expires_month',
      type: 'number',
      label: 'Expiry Month',
    },
    {
      name: 'expires_year',
      type: 'number',
      label: 'Expiry Year',
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