import type { CollectionConfig } from 'payload'

export const Members: CollectionConfig = {
  slug: 'member',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'status', 'join_date', 'tenure'],
    description: 'Program members who sign up via the frontend',
    group: 'Member Management',
  },
  fields: [
    // Legacy full name field (kept for backward compatibility)
    {
      name: 'name',
      type: 'text',
      label: 'Full Name (Legacy)',
      admin: {
        description: 'Legacy field - use first_name/last_name for new records',
        position: 'sidebar',
      },
    },
    // New separate name fields
    {
      name: 'first_name',
      type: 'text',
      required: true,
      label: 'First Name',
    },
    {
      name: 'last_name',
      type: 'text',
      required: true,
      label: 'Last Name',
    },
    {
      name: 'middle_name',
      type: 'text',
      label: 'Middle Name',
      admin: {
        description: 'Optional middle name',
      },
    },
    {
      name: 'date_of_birth',
      type: 'date',
      label: 'Date of Birth',
      admin: {
        description: 'Required for identity verification and compliance',
      },
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
    // Enhanced address fields
    {
      name: 'street_address',
      type: 'text',
      label: 'Street Address',
    },
    {
      name: 'address_line_2',
      type: 'text',
      label: 'Address Line 2',
      admin: {
        description: 'Apartment, suite, unit, etc. (optional)',
      },
    },
    {
      name: 'city',
      type: 'text',
      label: 'City',
    },
    {
      name: 'state',
      type: 'text',
      label: 'State/Province',
      admin: {
        description: 'Administrative area (e.g., CA, NY, Ontario)',
      },
    },
    {
      name: 'zip_code',
      type: 'text',
      label: 'ZIP/Postal Code',
    },
    {
      name: 'country_code',
      type: 'text',
      label: 'Country Code',
      defaultValue: 'US',
      admin: {
        description: 'ISO 2-letter country code (e.g., US, CA, GB)',
      },
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
      name: 'verification_status',
      type: 'select',
      defaultValue: 'PENDING',
      label: 'Verification Status',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Verified', value: 'VERIFIED' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Skipped', value: 'SKIPPED' },
      ],
      admin: {
        description: 'Identity verification status (for future use)',
      },
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
