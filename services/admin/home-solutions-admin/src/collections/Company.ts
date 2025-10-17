import type { CollectionConfig } from 'payload'

interface User {
  id: string | number
  role?: string
}

export const Company: CollectionConfig = {
  slug: 'company',
  admin: {
    useAsTitle: 'company_name',
    description: 'Company information and settings',
    group: 'System',
  },
  access: {
    create: ({ req: { user } }: { req: { user: User | null } }) => user?.role === 'Super Admin',
    read: ({ req: { user } }: { req: { user: User | null } }) => !!user,
    update: ({ req: { user } }: { req: { user: User | null } }) => user?.role === 'Super Admin',
    delete: () => false,
  },
  fields: [
    {
      name: 'company_name',
      type: 'text',
      required: true,
      label: 'Company Name',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes/Description',
    },
    {
      name: 'production_date',
      type: 'date',
      label: 'Production Date',
      admin: {
        description: 'When the company went into production',
      },
    },
    {
      name: 'current_revenue',
      type: 'number',
      label: 'Current Revenue',
      admin: {
        description: 'Current total revenue',
      },
    },
    {
      name: 'revenue_threshold',
      type: 'number',
      label: 'Revenue Threshold',
      admin: {
        description: 'Revenue threshold for payouts',
      },
    },
    {
      name: 'payout_enabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'Payout Enabled',
    },
    {
      name: 'last_payout_round',
      type: 'date',
      label: 'Last Payout Round',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'total_payouts_issued',
      type: 'number',
      defaultValue: 0,
      label: 'Total Payouts Issued',
    },
  ],
  timestamps: true,
}
