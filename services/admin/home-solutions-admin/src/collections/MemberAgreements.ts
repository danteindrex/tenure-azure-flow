import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const MemberAgreements: CollectionConfig = {
  slug: 'member_agreements',
  admin: {
    useAsTitle: 'agreement_type',
    defaultColumns: ['member_id', 'agreement_type', 'version_number', 'agreed_at_ts'],
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
      name: 'member_id',
      type: 'number',
      required: true,
      label: 'Member ID',
      admin: {
        description: 'Reference to member table',
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
      name: 'agreed_at_ts',
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