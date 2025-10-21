import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Subscription: CollectionConfig = {
  slug: 'user_subscriptions',
  admin: {
    useAsTitle: 'provider_subscription_id',
    defaultColumns: ['user_id', 'status', 'current_period_start', 'current_period_end'],
    description: 'Stores Stripe subscription information for members',
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
      name: 'provider',
      type: 'select',
      defaultValue: 'stripe',
      label: 'Provider',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'PayPal', value: 'paypal' },
      ],
    },
    {
      name: 'provider_subscription_id',
      type: 'text',
      required: true,
      label: 'Provider Subscription ID',
      maxLength: 255,
      admin: {
        description: 'Unique provider subscription identifier',
      },
    },
    {
      name: 'provider_customer_id',
      type: 'text',
      required: true,
      label: 'Provider Customer ID',
      maxLength: 255,
      admin: {
        description: 'Provider customer identifier',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Subscription Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Canceled', value: 'canceled' },
        { label: 'Incomplete', value: 'incomplete' },
        { label: 'Trialing', value: 'trialing' },
        { label: 'Unpaid', value: 'unpaid' },
      ],
    },
    {
      name: 'current_period_start',
      type: 'date',
      required: true,
      label: 'Current Period Start',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'current_period_end',
      type: 'date',
      required: true,
      label: 'Current Period End',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'cancel_at_period_end',
      type: 'checkbox',
      defaultValue: false,
      label: 'Cancel at Period End',
    },
    {
      name: 'canceled_at',
      type: 'date',
      label: 'Canceled At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'trial_end',
      type: 'date',
      label: 'Trial End',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  timestamps: true,
}