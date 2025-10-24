import type { CollectionConfig } from 'payload'
import { isFeatureEnabled } from '../config/features'

export const KYCVerification: CollectionConfig = {
  slug: 'kyc_verification',
  admin: {
    useAsTitle: 'user_id',
    defaultColumns: ['user_id', 'status', 'verification_method', 'verified_at', 'updated_at'],
    hidden: !isFeatureEnabled('compliance', 'kycVerification'),
    group: 'Compliance',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'id',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'user_id',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Reference to users table',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'In Review', value: 'in_review' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Expired', value: 'expired' },
        { label: 'Requires Action', value: 'requires_action' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'verification_method',
      type: 'select',
      required: true,
      options: [
        { label: 'Government ID', value: 'government_id' },
        { label: 'Passport', value: 'passport' },
        { label: 'Driver License', value: 'drivers_license' },
        { label: 'SSN Verification', value: 'ssn' },
        { label: 'Manual Review', value: 'manual' },
      ],
    },
    {
      name: 'document_type',
      type: 'select',
      options: [
        { label: 'Passport', value: 'passport' },
        { label: 'Driver License', value: 'drivers_license' },
        { label: 'National ID', value: 'national_id' },
        { label: 'SSN Card', value: 'ssn_card' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'document_number',
      type: 'text',
      admin: {
        description: 'Last 4 digits only for security',
      },
    },
    {
      name: 'document_front_url',
      type: 'text',
      admin: {
        description: 'URL to document front image (encrypted storage)',
      },
    },
    {
      name: 'document_back_url',
      type: 'text',
      admin: {
        description: 'URL to document back image (encrypted storage)',
      },
    },
    {
      name: 'selfie_url',
      type: 'text',
      admin: {
        description: 'URL to selfie for liveness check',
      },
    },
    {
      name: 'verification_provider',
      type: 'select',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Stripe Identity', value: 'stripe_identity' },
        { label: 'Plaid', value: 'plaid' },
        { label: 'Persona', value: 'persona' },
        { label: 'Onfido', value: 'onfido' },
        { label: 'Alloy', value: 'alloy' },
      ],
      defaultValue: 'manual',
    },
    {
      name: 'provider_verification_id',
      type: 'text',
      admin: {
        description: 'External provider verification ID',
      },
    },
    {
      name: 'verification_data',
      type: 'json',
      admin: {
        description: 'JSON data from verification provider',
      },
    },
    {
      name: 'verified_at',
      type: 'date',
      admin: {
        date: {
          displayFormat: 'MMM dd yyyy hh:mm a',
        },
      },
    },
    {
      name: 'expires_at',
      type: 'date',
      admin: {
        description: 'KYC verification expiration date (typically 1-2 years)',
        date: {
          displayFormat: 'MMM dd yyyy',
        },
      },
    },
    {
      name: 'rejection_reason',
      type: 'textarea',
      admin: {
        condition: (data) => data.status === 'rejected',
      },
    },
    {
      name: 'reviewer_id',
      type: 'text',
      admin: {
        description: 'Admin who reviewed the verification',
      },
    },
    {
      name: 'reviewer_notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes from reviewer',
      },
    },
    {
      name: 'risk_score',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        description: 'Risk score from 0 (low risk) to 100 (high risk)',
      },
    },
    {
      name: 'risk_factors',
      type: 'array',
      fields: [
        {
          name: 'factor',
          type: 'text',
        },
      ],
      admin: {
        description: 'Identified risk factors',
      },
    },
    {
      name: 'ip_address',
      type: 'text',
      admin: {
        description: 'IP address during verification',
      },
    },
    {
      name: 'user_agent',
      type: 'text',
      admin: {
        description: 'Browser/device info during verification',
      },
    },
    {
      name: 'geolocation',
      type: 'group',
      fields: [
        {
          name: 'country',
          type: 'text',
        },
        {
          name: 'region',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'latitude',
          type: 'number',
        },
        {
          name: 'longitude',
          type: 'number',
        },
      ],
    },
    {
      name: 'created_at',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          displayFormat: 'MMM dd yyyy hh:mm a',
        },
      },
    },
    {
      name: 'updated_at',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          displayFormat: 'MMM dd yyyy hh:mm a',
        },
      },
    },
  ],
}
