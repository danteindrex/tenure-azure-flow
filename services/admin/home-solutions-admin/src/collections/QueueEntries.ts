import type { CollectionConfig } from 'payload'

const QueueEntries: CollectionConfig = {
  slug: 'membership_queue',
  admin: {
    useAsTitle: 'user_id',
    defaultColumns: ['user_id', 'queue_position', 'is_eligible'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'user_id',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'User ID in the queue',
      },
    },
    {
      name: 'queue_position',
      type: 'number',
      required: true,
      admin: {
        description: 'Position in the queue (1 = first)',
      },
    },
    {
      name: 'joined_queue_at',
      type: 'date',
      required: true,
      admin: {
        description: 'When the user joined the queue',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'waiting',
      options: [
        { label: 'Waiting', value: 'waiting' },
        { label: 'Eligible', value: 'eligible' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Suspended', value: 'suspended' },
      ],
      admin: {
        description: 'Current status in the queue',
      },
    },
    {
      name: 'is_eligible',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      admin: {
        description: 'Whether the user is eligible for payout',
      },
    },
    // subscription_active removed - determined by joining with user_subscriptions table
    {
      name: 'total_months_subscribed',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Total months the user has been subscribed',
      },
    },
    {
      name: 'last_payment_date',
      type: 'date',
      required: false,
      admin: {
        description: 'Date of last payment',
      },
    },
    {
      name: 'lifetime_payment_total',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Total amount paid by the user',
      },
    },
    {
      name: 'has_received_payout',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      admin: {
        description: 'Whether the user has received a payout',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Additional notes about the queue entry',
      },
    },
  ],
  timestamps: true,
}

export { QueueEntries }
export default QueueEntries