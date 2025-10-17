import type { CollectionConfig } from 'payload'

export const Queue: CollectionConfig = {
  slug: 'queue',
  admin: {
    useAsTitle: 'member_i_d_id',
    defaultColumns: ['member_i_d_id', 'rank', 'status'],
    description: 'Member tenure queue management',
    group: 'Member Management',
  },
  access: {
    create: ({ req: { user } }) => !!user,
    read: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'member_i_d_id',
      type: 'relationship',
      relationTo: 'member',
      required: true,
      label: 'Member',
    },
    {
      name: 'rank',
      type: 'number',
      required: true,
      label: 'Queue Rank',
      admin: {
        description: 'Current position in the tenure queue',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'Active',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Pending', value: 'Pending' },
      ],
    },
  ],
  timestamps: true,
}
