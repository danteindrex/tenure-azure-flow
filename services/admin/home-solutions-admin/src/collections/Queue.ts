import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Queue: CollectionConfig = {
  slug: 'queue',
  admin: {
    useAsTitle: 'memberid',
    defaultColumns: ['memberid', 'queue_position', 'subscription_active'],
    description: 'Member tenure queue management',
    group: 'Member Management',
  },
  access: {
    create: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    read: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    update: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    delete: ({ req: { user } }: { req: { user: User | null } }) => !!user,
  },
  fields: [
    {
      name: 'memberid',
      type: 'number',
      required: true,
      label: 'Member ID',
    },
    {
      name: 'queue_position',
      type: 'number',
      required: true,
      label: 'Queue Position',
      admin: {
        description: 'Current position in the tenure queue',
      },
    },
    {
      name: 'subscription_active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Subscription Active',
    },
    {
      name: 'joined_at',
      type: 'date',
      label: 'Joined At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'is_eligible',
      type: 'checkbox',
      defaultValue: false,
      label: 'Is Eligible for Payout',
    },
    {
      name: 'total_months_subscribed',
      type: 'number',
      defaultValue: 0,
      label: 'Total Months Subscribed',
    },
    {
      name: 'last_payment_date',
      type: 'date',
      label: 'Last Payment Date',
    },
    {
      name: 'lifetime_payment_total',
      type: 'number',
      label: 'Lifetime Payment Total',
      admin: {
        description: 'Total amount paid over lifetime',
      },
    },
    {
      name: 'has_received_payout',
      type: 'checkbox',
      defaultValue: false,
      label: 'Has Received Payout',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
    },
  ],
  timestamps: true,
}
