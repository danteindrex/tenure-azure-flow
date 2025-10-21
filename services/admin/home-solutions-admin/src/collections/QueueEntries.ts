import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const QueueEntries: CollectionConfig = {
  slug: 'queue_entries',
  admin: {
    useAsTitle: 'queue_position',
    defaultColumns: ['member_id', 'queue_position', 'is_eligible', 'priority_score'],
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
      name: 'member_id',
      type: 'number',
      required: true,
      label: 'Member ID',
      admin: {
        description: 'Reference to member table',
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
  ],
  timestamps: true,
}