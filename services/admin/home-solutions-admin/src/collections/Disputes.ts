import type { CollectionConfig } from 'payload'
import { isFeatureEnabled } from '../config/features'

export const Disputes: CollectionConfig = {
  slug: 'disputes',
  admin: {
    useAsTitle: 'dispute_id',
    defaultColumns: ['dispute_id', 'user_id', 'type', 'status', 'amount', 'created_at'],
    hidden: !isFeatureEnabled('payments', 'disputeManagement'),
    group: 'Payments',
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
      name: 'dispute_id',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique dispute identifier',
      },
    },
    {
      name: 'payment_id',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Reference to user_payments',
      },
    },
    {
      name: 'user_id',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Chargeback', value: 'chargeback' },
        { label: 'Dispute', value: 'dispute' },
        { label: 'Refund Request', value: 'refund_request' },
        { label: 'Fraud Claim', value: 'fraud_claim' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'needs_response',
      options: [
        { label: 'Needs Response', value: 'needs_response' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Evidence Submitted', value: 'evidence_submitted' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Expired', value: 'expired' },
        { label: 'Withdrawn', value: 'withdrawn' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: [
        { label: 'Fraudulent', value: 'fraudulent' },
        { label: 'Unrecognized', value: 'unrecognized' },
        { label: 'Duplicate', value: 'duplicate' },
        { label: 'Product Not Received', value: 'product_not_received' },
        { label: 'Product Unacceptable', value: 'product_unacceptable' },
        { label: 'Subscription Canceled', value: 'subscription_canceled' },
        { label: 'General', value: 'general' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Disputed amount in cents',
      },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
    },
    {
      name: 'stripe_dispute_id',
      type: 'text',
      admin: {
        description: 'Stripe dispute ID if from Stripe',
      },
    },
    {
      name: 'customer_message',
      type: 'textarea',
      admin: {
        description: 'Message from customer explaining dispute',
      },
    },
    {
      name: 'respond_by',
      type: 'date',
      required: true,
      admin: {
        description: 'Deadline to respond to dispute',
        date: {
          displayFormat: 'MMM dd yyyy hh:mm a',
        },
      },
    },
    {
      name: 'evidence',
      type: 'group',
      fields: [
        {
          name: 'submitted',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'submitted_at',
          type: 'date',
        },
        {
          name: 'customer_communication',
          type: 'textarea',
          admin: {
            description: 'Evidence of communication with customer',
          },
        },
        {
          name: 'receipt_url',
          type: 'text',
          admin: {
            description: 'URL to receipt or proof of purchase',
          },
        },
        {
          name: 'service_documentation',
          type: 'textarea',
          admin: {
            description: 'Documentation of service provided',
          },
        },
        {
          name: 'refund_policy',
          type: 'textarea',
          admin: {
            description: 'Applicable refund/cancellation policy',
          },
        },
        {
          name: 'customer_signature',
          type: 'text',
          admin: {
            description: 'URL to signed agreement/terms',
          },
        },
        {
          name: 'additional_documents',
          type: 'array',
          fields: [
            {
              name: 'document_url',
              type: 'text',
            },
            {
              name: 'document_description',
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      name: 'assigned_to',
      type: 'text',
      admin: {
        description: 'Admin ID assigned to handle this dispute',
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
      name: 'resolution',
      type: 'group',
      fields: [
        {
          name: 'resolved',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'resolved_at',
          type: 'date',
        },
        {
          name: 'outcome',
          type: 'select',
          options: [
            { label: 'Won', value: 'won' },
            { label: 'Lost', value: 'lost' },
            { label: 'Partially Refunded', value: 'partial_refund' },
            { label: 'Fully Refunded', value: 'full_refund' },
          ],
        },
        {
          name: 'resolution_notes',
          type: 'textarea',
        },
        {
          name: 'amount_refunded',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      name: 'impact',
      type: 'group',
      fields: [
        {
          name: 'chargeback_fee',
          type: 'number',
          min: 0,
          admin: {
            description: 'Fee charged by payment processor',
          },
        },
        {
          name: 'total_loss',
          type: 'number',
          min: 0,
          admin: {
            description: 'Total financial loss including fees',
          },
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
