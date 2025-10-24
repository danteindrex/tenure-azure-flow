import type { CollectionConfig } from 'payload'

export const KYCVerification: CollectionConfig = {
  slug: 'kyc_verification',
  admin: {
    useAsTitle: 'user_id',
    defaultColumns: ['user_id', 'status', 'verified_at', 'created_at'],
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Under Review', value: 'under_review' },
      ],
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