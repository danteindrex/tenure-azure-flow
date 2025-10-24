import type { CollectionConfig } from 'payload'
import { isFeatureEnabled } from '../config/features'

export const AdminAlerts: CollectionConfig = {
  slug: 'admin_alerts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'severity', 'status', 'category', 'created_at'],
    hidden: !isFeatureEnabled('alerts', 'adminAlerts'),
    group: 'System',
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
      name: 'alert_id',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'severity',
      type: 'select',
      required: true,
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
        { label: 'Critical', value: 'critical' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'System', value: 'system' },
        { label: 'Security', value: 'security' },
        { label: 'Payment', value: 'payment' },
        { label: 'Queue', value: 'queue' },
        { label: 'Compliance', value: 'compliance' },
        { label: 'User', value: 'user' },
        { label: 'Financial', value: 'financial' },
        { label: 'Integration', value: 'integration' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Acknowledged', value: 'acknowledged' },
        { label: 'Investigating', value: 'investigating' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'related_entity',
      type: 'group',
      fields: [
        {
          name: 'entity_type',
          type: 'select',
          options: [
            { label: 'User', value: 'user' },
            { label: 'Payment', value: 'payment' },
            { label: 'Payout', value: 'payout' },
            { label: 'Queue Entry', value: 'queue_entry' },
            { label: 'Transaction', value: 'transaction' },
            { label: 'System', value: 'system' },
          ],
        },
        {
          name: 'entity_id',
          type: 'text',
        },
      ],
    },
    {
      name: 'trigger',
      type: 'group',
      fields: [
        {
          name: 'trigger_type',
          type: 'select',
          options: [
            { label: 'Automated Rule', value: 'automated' },
            { label: 'Manual', value: 'manual' },
            { label: 'System Event', value: 'system_event' },
            { label: 'Threshold Exceeded', value: 'threshold' },
          ],
        },
        {
          name: 'rule_id',
          type: 'text',
          admin: {
            description: 'ID of the alert rule that triggered this',
          },
        },
        {
          name: 'triggered_by',
          type: 'text',
          admin: {
            description: 'User/system that triggered the alert',
          },
        },
      ],
    },
    {
      name: 'assigned_to',
      type: 'text',
      admin: {
        description: 'Admin ID assigned to handle this alert',
      },
    },
    {
      name: 'acknowledged_by',
      type: 'text',
    },
    {
      name: 'acknowledged_at',
      type: 'date',
    },
    {
      name: 'resolved_by',
      type: 'text',
    },
    {
      name: 'resolved_at',
      type: 'date',
    },
    {
      name: 'resolution_notes',
      type: 'textarea',
    },
    {
      name: 'notifications_sent',
      type: 'array',
      fields: [
        {
          name: 'channel',
          type: 'select',
          options: [
            { label: 'Email', value: 'email' },
            { label: 'SMS', value: 'sms' },
            { label: 'Slack', value: 'slack' },
            { label: 'Push', value: 'push' },
            { label: 'In-App', value: 'in_app' },
          ],
        },
        {
          name: 'recipient',
          type: 'text',
        },
        {
          name: 'sent_at',
          type: 'date',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Sent', value: 'sent' },
            { label: 'Failed', value: 'failed' },
            { label: 'Pending', value: 'pending' },
          ],
        },
      ],
    },
    {
      name: 'escalation',
      type: 'group',
      fields: [
        {
          name: 'escalated',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'escalated_at',
          type: 'date',
        },
        {
          name: 'escalated_to',
          type: 'text',
        },
        {
          name: 'escalation_reason',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional context data',
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
