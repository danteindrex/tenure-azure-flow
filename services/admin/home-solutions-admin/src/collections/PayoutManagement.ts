import type { CollectionConfig } from 'payload'
import { isFeatureEnabled } from '../config/features'

export const PayoutManagement: CollectionConfig = {
  slug: 'payout_management',
  admin: {
    useAsTitle: 'payout_id',
    defaultColumns: ['payout_id', 'user_id', 'amount', 'status', 'scheduled_date'],
    hidden: !isFeatureEnabled('queue', 'payoutWorkflow'),
    group: 'Queue & Payouts',
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
      name: 'payout_id',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique payout identifier (e.g., PO-2025-001)',
      },
    },
    {
      name: 'user_id',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'queue_position',
      type: 'number',
      required: true,
      admin: {
        description: 'Queue position when payout was initiated',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Payout amount ($100,000 as per BR-3)',
      },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_approval',
      options: [
        { label: 'Pending Approval', value: 'pending_approval' },
        { label: 'Approved', value: 'approved' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Canceled', value: 'canceled' },
        { label: 'On Hold', value: 'on_hold' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'eligibility_check',
      type: 'group',
      label: 'Eligibility Verification',
      fields: [
        {
          name: 'tenure_verified',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Continuous tenure verified (BR-9)',
          },
        },
        {
          name: 'tenure_start_date',
          type: 'date',
        },
        {
          name: 'tenure_months',
          type: 'number',
          admin: {
            description: 'Total months of continuous tenure',
          },
        },
        {
          name: 'payments_verified',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'All payments verified (BR-2, BR-6)',
          },
        },
        {
          name: 'total_paid',
          type: 'number',
          admin: {
            description: 'Total amount paid by member',
          },
        },
        {
          name: 'fund_balance_sufficient',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Fund has sufficient balance (BR-3, BR-4)',
          },
        },
        {
          name: 'kyc_verified',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'KYC verification completed',
          },
        },
        {
          name: 'tax_info_complete',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'W-9 or tax information on file',
          },
        },
        {
          name: 'no_default_history',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'No payment default history (BR-6)',
          },
        },
        {
          name: 'queue_position_verified',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Queue position calculated correctly (BR-5, BR-10)',
          },
        },
        {
          name: 'all_checks_passed',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'All eligibility checks passed',
            readOnly: true,
          },
        },
        {
          name: 'verified_by',
          type: 'text',
          admin: {
            description: 'Admin who verified eligibility',
          },
        },
        {
          name: 'verified_at',
          type: 'date',
        },
      ],
    },
    {
      name: 'approval_workflow',
      type: 'array',
      label: 'Approval Workflow',
      fields: [
        {
          name: 'approver_id',
          type: 'text',
          required: true,
        },
        {
          name: 'approver_role',
          type: 'select',
          required: true,
          options: [
            { label: 'Finance Manager', value: 'finance_manager' },
            { label: 'Operations Manager', value: 'operations_manager' },
            { label: 'Compliance Officer', value: 'compliance_officer' },
            { label: 'CEO/Executive', value: 'executive' },
          ],
        },
        {
          name: 'action',
          type: 'select',
          required: true,
          options: [
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Pending', value: 'pending' },
          ],
        },
        {
          name: 'notes',
          type: 'textarea',
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      name: 'scheduled_date',
      type: 'date',
      admin: {
        description: 'Date when payout is scheduled to be processed',
        date: {
          displayFormat: 'MMM dd yyyy',
        },
      },
    },
    {
      name: 'payment_method',
      type: 'select',
      required: true,
      defaultValue: 'ach',
      options: [
        { label: 'ACH Transfer', value: 'ach' },
        { label: 'Wire Transfer', value: 'wire' },
        { label: 'Check', value: 'check' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Stripe', value: 'stripe' },
      ],
    },
    {
      name: 'bank_details',
      type: 'group',
      fields: [
        {
          name: 'account_holder_name',
          type: 'text',
        },
        {
          name: 'bank_name',
          type: 'text',
        },
        {
          name: 'account_number_last4',
          type: 'text',
          admin: {
            description: 'Last 4 digits only for security',
          },
        },
        {
          name: 'routing_number',
          type: 'text',
        },
        {
          name: 'account_type',
          type: 'select',
          options: [
            { label: 'Checking', value: 'checking' },
            { label: 'Savings', value: 'savings' },
          ],
        },
      ],
    },
    {
      name: 'tax_withholding',
      type: 'group',
      label: 'Tax Withholding',
      fields: [
        {
          name: 'requires_withholding',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'withholding_rate',
          type: 'number',
          min: 0,
          max: 100,
          admin: {
            description: 'Withholding rate percentage',
          },
        },
        {
          name: 'withholding_amount',
          type: 'number',
          min: 0,
        },
        {
          name: 'net_payout_amount',
          type: 'number',
          min: 0,
          admin: {
            description: 'Amount after tax withholding',
          },
        },
        {
          name: 'form_1099_required',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Generate 1099 for payouts over $600',
          },
        },
      ],
    },
    {
      name: 'processing',
      type: 'group',
      fields: [
        {
          name: 'initiated_at',
          type: 'date',
        },
        {
          name: 'initiated_by',
          type: 'text',
          admin: {
            description: 'Admin who initiated processing',
          },
        },
        {
          name: 'processor',
          type: 'select',
          options: [
            { label: 'Stripe', value: 'stripe' },
            { label: 'Plaid', value: 'plaid' },
            { label: 'Manual', value: 'manual' },
          ],
        },
        {
          name: 'transaction_id',
          type: 'text',
          admin: {
            description: 'External transaction ID from processor',
          },
        },
        {
          name: 'completed_at',
          type: 'date',
        },
        {
          name: 'failed_at',
          type: 'date',
        },
        {
          name: 'failure_reason',
          type: 'textarea',
          admin: {
            condition: (data) => data.status === 'failed',
          },
        },
        {
          name: 'retry_count',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'receipt_url',
      type: 'text',
      admin: {
        description: 'URL to payout receipt/confirmation',
      },
    },
    {
      name: 'internal_notes',
      type: 'array',
      fields: [
        {
          name: 'note',
          type: 'textarea',
          required: true,
        },
        {
          name: 'created_by',
          type: 'text',
          required: true,
        },
        {
          name: 'created_at',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      name: 'audit_trail',
      type: 'array',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'action',
          type: 'text',
        },
        {
          name: 'actor_id',
          type: 'text',
        },
        {
          name: 'timestamp',
          type: 'date',
        },
        {
          name: 'details',
          type: 'json',
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
