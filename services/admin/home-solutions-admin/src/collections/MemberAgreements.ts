import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const MemberAgreements: CollectionConfig = {
  slug: 'user_agreements',
  admin: {
    useAsTitle: 'agreement_type',
    defaultColumns: ['user_id', 'agreement_type', 'version_number', 'agreed_at'],
    description: 'Tracks user agreements to terms and conditions',
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
      name: 'agreement_type',
      type: 'select',
      required: true,
      label: 'Agreement Type',
      options: [
        { label: 'Terms & Conditions', value: 'TERMS_CONDITIONS' },
        { label: 'Payment Authorization', value: 'PAYMENT_AUTHORIZATION' },
      ],
    },
    {
      name: 'version_number',
      type: 'text',
      required: true,
      label: 'Version Number',
      maxLength: 20,
      admin: {
        description: 'Version of the agreement (e.g., 1.0, 2.1)',
      },
    },
    {
      name: 'agreed_at',
      type: 'date',
      label: 'Agreed At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When the user agreed to this version',
      },
    },
    {
      name: 'document_url',
      type: 'text',
      label: 'Document URL',
      admin: {
        description: 'URL to the agreement document',
      },
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Is Active',
    },
    {
      name: 'ip_address',
      type: 'text',
      label: 'IP Address',
      admin: {
        description: 'IP address when agreement was made',
        position: 'sidebar',
      },
    },
    {
      name: 'user_agent',
      type: 'textarea',
      label: 'User Agent',
      admin: {
        description: 'Browser user agent when agreement was made',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}