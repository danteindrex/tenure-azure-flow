import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Payment: CollectionConfig = {
  slug: 'user_payments',
  admin: {
    useAsTitle: 'payment_type',
    defaultColumns: ['user_id', 'amount', 'payment_type', 'status', 'payment_date'],
    description: 'Tracks all payment transactions and their status',
    group: 'Financial',
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
      name: 'subscription_id',
      type: 'text',
      label: 'Subscription ID',
      admin: {
        description: 'Reference to user_subscriptions table (optional)',
      },
    },
    {
      name: 'payment_method_id',
      type: 'text',
      label: 'Payment Method ID',
      admin: {
        description: 'Reference to user_payment_methods table (optional)',
      },
    },
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'stripe',
      label: 'Payment Provider',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Bank', value: 'bank' },
      ],
    },
    {
      name: 'provider_payment_id',
      type: 'text',
      maxLength: 255,
      label: 'Provider Payment ID',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'provider_invoice_id',
      type: 'text',
      maxLength: 255,
      label: 'Provider Invoice ID',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'provider_charge_id',
      type: 'text',
      maxLength: 255,
      label: 'Provider Charge ID',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Amount',
      admin: {
        description: 'Payment amount (decimal with 2 places)',
        step: 0.01,
      },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
      maxLength: 3,
      label: 'Currency',
      admin: {
        description: '3-letter currency code (e.g., USD, EUR)',
      },
    },
    {
      name: 'payment_type',
      type: 'select',
      required: true,
      label: 'Payment Type',
      options: [
        { label: 'Initial', value: 'initial' },
        { label: 'Recurring', value: 'recurring' },
        { label: 'One Time', value: 'one_time' },
      ],
    },
    {
      name: 'payment_date',
      type: 'date',
      required: true,
      label: 'Payment Date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Payment Status',
      options: [
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Pending', value: 'pending' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Canceled', value: 'canceled' },
      ],
    },
    {
      name: 'is_first_payment',
      type: 'checkbox',
      defaultValue: false,
      label: 'Is First Payment',
    },
    {
      name: 'failure_reason',
      type: 'textarea',
      label: 'Failure Reason',
      admin: {
        description: 'Reason for payment failure (if applicable)',
      },
    },
    {
      name: 'receipt_url',
      type: 'text',
      label: 'Receipt URL',
      admin: {
        description: 'URL to payment receipt',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Metadata',
      admin: {
        description: 'Additional payment metadata (JSON format)',
      },
    },
  ],
  timestamps: true,
}