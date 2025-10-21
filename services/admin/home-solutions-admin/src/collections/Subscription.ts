import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Subscription: CollectionConfig = {
  slug: 'subscription',
  admin: {
    useAsTitle: 'stripe_subscription_id',
    defaultColumns: ['memberid', 'status', 'current_period_start', 'current_period_end'],
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
      name: 'subscriptionid',
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
      name: 'stripe_subscription_id',
      type: 'text',
      required: true,
      label: 'Stripe Subscription ID',
      maxLength: 255,
      admin: {
        description: 'Unique Stripe subscription identifier',
      },
    },
    {
      name: 'stripe_customer_id',
      type: 'text',
      required: true,
      label: 'Stripe Customer ID',
      maxLength: 255,
      admin: {
        description: 'Stripe customer identifier',
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