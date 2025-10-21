import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Payment: CollectionConfig = {
  slug: 'payment',
  admin: {
    useAsTitle: 'payment_type',
    defaultColumns: ['memberid', 'amount', 'payment_type', 'status', 'payment_date'],
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
      name: 'paymentid',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'memberid',
      type: 'number',
      required: true,
      label: 'Member ID',
      admin: {
        description: 'Reference to member table',
      },
    },
    {
      name: 'subscriptionid',
      type: 'number',
      label: 'Subscription ID',
      admin: {
        description: 'Reference to subscription table (optional)',
      },
    },
    {
      name: 'stripe_payment_intent_id',
      type: 'text',
      maxLength: 255,
      label: 'Stripe Payment Intent ID',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stripe_invoice_id',
      type: 'text',
      maxLength: 255,
      label: 'Stripe Invoice ID',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stripe_charge_id',
      type: 'text',
      maxLength: 255,
      label: 'Stripe Charge ID',
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
  ],
  timestamps: true,
}