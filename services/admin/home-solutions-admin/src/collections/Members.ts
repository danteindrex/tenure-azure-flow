import type { CollectionConfig } from 'payload'

export const Members: CollectionConfig = {
  slug: 'member',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'status', 'join_date', 'tenure'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Full Name',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: 'Email Address',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone Number',
    },
    {
      name: 'street_address',
      type: 'text',
      label: 'Street Address',
    },
    {
      name: 'city',
      type: 'text',
      label: 'City',
    },
    {
      name: 'state',
      type: 'text',
      label: 'State',
      admin: {
        description: 'US State code (e.g., CA, NY)',
      },
    },
    {
      name: 'zip_code',
      type: 'text',
      label: 'ZIP Code',
    },
    {
      name: 'join_date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString().split('T')[0],
      label: 'Join Date',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'Pending',
      label: 'Member Status',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Suspended', value: 'Suspended' },
        { label: 'Pending', value: 'Pending' },
      ],
    },
    {
      name: 'tenure',
      type: 'number',
      defaultValue: 0,
      label: 'Tenure (months)',
      admin: {
        description: 'Current tenure duration in months',
      },
    },
    {
      name: 'admin_i_d_id',
      type: 'relationship',
      relationTo: 'admin',
      label: 'Assigned Admin',
      admin: {
        description: 'Administrator managing this member',
      },
    },
    {
      name: 'auth_user_id',
      type: 'text',
      label: 'Auth User ID',
      admin: {
        description: 'Supabase auth user ID (auto-populated on signup)',
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
}
