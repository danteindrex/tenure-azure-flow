import type { CollectionConfig } from 'payload'
import { isFeatureEnabled } from '../config/features'

export const TransactionMonitoring: CollectionConfig = {
  slug: 'transaction_monitoring',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['transaction_id', 'user_id', 'risk_level', 'status', 'created_at'],
    hidden: !isFeatureEnabled('compliance', 'amlMonitoring'),
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
      name: 'transaction_id',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Reference to user_payments table',
      },
    },
    {
      name: 'user_id',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'transaction_type',
      type: 'select',
      required: true,
      options: [
        { label: 'Payment In', value: 'payment_in' },
        { label: 'Payout', value: 'payout' },
        { label: 'Refund', value: 'refund' },
        { label: 'Chargeback', value: 'chargeback' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
    },
    {
      name: 'risk_level',
      type: 'select',
      required: true,
      defaultValue: 'low',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'risk_score',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        description: 'Calculated risk score 0-100',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_review',
      options: [
        { label: 'Auto Approved', value: 'auto_approved' },
        { label: 'Pending Review', value: 'pending_review' },
        { label: 'Under Investigation', value: 'under_investigation' },
        { label: 'Approved', value: 'approved' },
        { label: 'Flagged', value: 'flagged' },
        { label: 'Blocked', value: 'blocked' },
        { label: 'Reported', value: 'reported' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'flags',
      type: 'array',
      fields: [
        {
          name: 'flag_type',
          type: 'select',
          required: true,
          options: [
            { label: 'Velocity Check Failed', value: 'velocity' },
            { label: 'Large Transaction', value: 'large_amount' },
            { label: 'Geographic Anomaly', value: 'geo_anomaly' },
            { label: 'Unusual Pattern', value: 'unusual_pattern' },
            { label: 'Multiple Failed Attempts', value: 'multiple_failures' },
            { label: 'Suspicious Device', value: 'suspicious_device' },
            { label: 'IP Blacklist', value: 'ip_blacklist' },
            { label: 'Round Amount', value: 'round_amount' },
            { label: 'Rapid Succession', value: 'rapid_succession' },
          ],
        },
        {
          name: 'severity',
          type: 'select',
          options: [
            { label: 'Info', value: 'info' },
            { label: 'Warning', value: 'warning' },
            { label: 'Critical', value: 'critical' },
          ],
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'detected_at',
          type: 'date',
        },
      ],
    },
    {
      name: 'aml_check',
      type: 'group',
      fields: [
        {
          name: 'checked',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'passed',
          type: 'checkbox',
        },
        {
          name: 'sanctions_list_hit',
          type: 'checkbox',
          admin: {
            description: 'Found on OFAC/UN sanctions list',
          },
        },
        {
          name: 'pep_match',
          type: 'checkbox',
          admin: {
            description: 'Politically Exposed Person match',
          },
        },
        {
          name: 'checked_at',
          type: 'date',
        },
      ],
    },
    {
      name: 'velocity_check',
      type: 'group',
      fields: [
        {
          name: 'transactions_24h',
          type: 'number',
          admin: {
            description: 'Number of transactions in last 24 hours',
          },
        },
        {
          name: 'amount_24h',
          type: 'number',
          admin: {
            description: 'Total amount in last 24 hours',
          },
        },
        {
          name: 'transactions_7d',
          type: 'number',
        },
        {
          name: 'amount_7d',
          type: 'number',
        },
      ],
    },
    {
      name: 'device_fingerprint',
      type: 'group',
      fields: [
        {
          name: 'device_id',
          type: 'text',
        },
        {
          name: 'browser',
          type: 'text',
        },
        {
          name: 'os',
          type: 'text',
        },
        {
          name: 'ip_address',
          type: 'text',
        },
        {
          name: 'is_vpn',
          type: 'checkbox',
        },
        {
          name: 'is_tor',
          type: 'checkbox',
        },
      ],
    },
    {
      name: 'geographic_data',
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
          name: 'is_high_risk_country',
          type: 'checkbox',
        },
        {
          name: 'distance_from_previous_km',
          type: 'number',
          admin: {
            description: 'Distance from previous transaction location',
          },
        },
      ],
    },
    {
      name: 'reviewer_id',
      type: 'text',
      admin: {
        description: 'Admin who reviewed this transaction',
      },
    },
    {
      name: 'reviewer_notes',
      type: 'textarea',
    },
    {
      name: 'reviewed_at',
      type: 'date',
    },
    {
      name: 'action_taken',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Approved', value: 'approved' },
        { label: 'Blocked', value: 'blocked' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Reported to Authorities', value: 'reported' },
        { label: 'Account Suspended', value: 'account_suspended' },
      ],
    },
    {
      name: 'sar_filed',
      type: 'checkbox',
      admin: {
        description: 'Suspicious Activity Report filed with FinCEN',
      },
    },
    {
      name: 'sar_filed_at',
      type: 'date',
      admin: {
        condition: (data) => data.sar_filed === true,
      },
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
