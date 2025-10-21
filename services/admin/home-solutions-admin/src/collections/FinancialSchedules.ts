import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const FinancialSchedules: CollectionConfig = {
  slug: 'user_billing_schedules',
  admin: {
    useAsTitle: 'billing_cycle',
    defaultColumns: ['user_id', 'billing_cycle', 'next_billing_date', 'amount', 'is_active'],
    description: 'Manages billing cycles and payment schedules',
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
        description: 'Reference to user_subscriptions table',
      },
    },
    {
      name: 'billing_cycle',
      type: 'select',
      defaultValue: 'MONTHLY',
      label: 'Billing Cycle',
      options: [
        { label: 'Monthly', value: 'MONTHLY' },
        { label: 'Quarterly', value: 'QUARTERLY' },
        { label: 'Yearly', value: 'YEARLY' },
      ],
    },
    {
      name: 'next_billing_date',
      type: 'date',
      label: 'Next Billing Date',
      admin: {
        description: 'Date of the next scheduled billing',
      },
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Amount',
      admin: {
        description: 'Billing amount (decimal with 2 places)',
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
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Is Active',
    },
  ],
  timestamps: true,
}