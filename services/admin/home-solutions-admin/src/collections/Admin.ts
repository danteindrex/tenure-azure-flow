import type { CollectionConfig } from 'payload'

export const Admin: CollectionConfig = {
  slug: 'admin',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'Manager',
      options: [
        { label: 'Super Admin', value: 'Super Admin' },
        { label: 'Manager', value: 'Manager' },
        { label: 'Support', value: 'Support' },
      ],
    },
  ],
}
