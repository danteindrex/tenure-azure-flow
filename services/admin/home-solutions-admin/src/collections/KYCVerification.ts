import type { CollectionConfig } from 'payload'

export const KYCVerification: CollectionConfig = {
  slug: 'kyc_verification',
  admin: {
    useAsTitle: 'user_id',
    defaultColumns: ['user_id', 'kyc_status_id', 'verified_at', 'created_at'],
    description: 'KYC verification records',
    group: 'Compliance & Security',
  },
  fields: [
    {
      name: 'user_id',
      type: 'text',
      required: true,
      label: 'User ID',
    },
    {
      name: 'kyc_status_id',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: 'FK to kyc_statuses: 1=Pending, 2=In Review, 3=Verified, 4=Rejected, 5=Expired',
      },
    },
    {
      name: 'document_type',
      type: 'select',
      options: [
        { label: 'Passport', value: 'passport' },
        { label: 'Driver License', value: 'drivers_license' },
        { label: 'National ID', value: 'national_id' },
      ],
    },
    {
      name: 'verified_at',
      type: 'date',
      label: 'Verified At',
    },
    {
      name: 'verified_by',
      type: 'text',
      label: 'Verified By',
    },
    {
      name: 'rejection_reason',
      type: 'textarea',
      label: 'Rejection Reason',
    },
  ],
  timestamps: true,
}