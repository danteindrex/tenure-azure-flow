import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const QueueEntries: CollectionConfig = {
  slug: 'membership_queue',
  admin: {
    useAsTitle: 'queue_position',
    defaultColumns: ['user_id', 'queue_position', 'is_eligible', 'subscription_active'],
    description: 'Manages membership queue positions and eligibility',
    group: 'Member Management',
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
      name: 'queue_position',
      type: 'number',
      label: 'Queue Position',
      admin: {
        description: 'Current position in the queue',
      },
    },
    {
      name: 'joined_queue_at',
      type: 'date',
      label: 'Joined Queue At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When the member joined the queue',
      },
    },
    {
      name: 'is_eligible',
      type: 'checkbox',
      defaultValue: true,
      label: 'Is Eligible',
      admin: {
        description: 'Whether the member is eligible for queue benefits',
      },
    },
    {
      name: 'priority_score',
      type: 'number',
      defaultValue: 0,
      label: 'Priority Score',
      admin: {
        description: 'Priority score for queue ordering',
      },
    },
    {
      name: 'subscription_active',
      type: 'checkbox',
      defaultValue: false,
      label: 'Subscription Active',
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
        step: 0.01,
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