import type { CollectionConfig } from 'payload'

export const Company: CollectionConfig = {
  slug: 'company',
  admin: {
    useAsTitle: 'name',
    description: 'Company information and settings',
    group: 'System',
  },
  access: {
    create: ({ req: { user } }) => user?.role === 'Super Admin',
    read: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => user?.role === 'Super Admin',
    delete: () => false, // Never delete company records
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Company Name',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
  ],
  timestamps: true,
}
