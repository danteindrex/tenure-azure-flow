import type { CollectionConfig } from 'payload'
import { isFeatureEnabled } from '../config/features'

export const ReportTemplates: CollectionConfig = {
  slug: 'report_templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'schedule', 'is_active'],
    hidden: !isFeatureEnabled('reporting', 'customReportBuilder'),
    group: 'Reporting',
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Financial', value: 'financial' },
        { label: 'Compliance', value: 'compliance' },
        { label: 'Operations', value: 'operations' },
        { label: 'User Analytics', value: 'user_analytics' },
        { label: 'Payment Analytics', value: 'payment_analytics' },
        { label: 'Queue Analytics', value: 'queue_analytics' },
        { label: 'Tax', value: 'tax' },
        { label: 'Executive Summary', value: 'executive' },
      ],
    },
    {
      name: 'data_source',
      type: 'select',
      required: true,
      options: [
        { label: 'Users', value: 'users' },
        { label: 'Payments', value: 'payments' },
        { label: 'Subscriptions', value: 'subscriptions' },
        { label: 'Queue', value: 'queue' },
        { label: 'Payouts', value: 'payouts' },
        { label: 'Disputes', value: 'disputes' },
        { label: 'Tax Forms', value: 'tax_forms' },
        { label: 'Custom SQL', value: 'custom_sql' },
      ],
    },
    {
      name: 'query_config',
      type: 'group',
      fields: [
        {
          name: 'sql_query',
          type: 'code',
          admin: {
            language: 'sql',
            description: 'Custom SQL query if data_source is custom_sql',
          },
        },
        {
          name: 'filters',
          type: 'array',
          fields: [
            {
              name: 'field',
              type: 'text',
            },
            {
              name: 'operator',
              type: 'select',
              options: [
                { label: 'Equals', value: 'eq' },
                { label: 'Not Equals', value: 'neq' },
                { label: 'Greater Than', value: 'gt' },
                { label: 'Less Than', value: 'lt' },
                { label: 'Contains', value: 'contains' },
                { label: 'Between', value: 'between' },
                { label: 'In List', value: 'in' },
              ],
            },
            {
              name: 'value',
              type: 'text',
            },
          ],
        },
        {
          name: 'group_by',
          type: 'array',
          fields: [
            {
              name: 'field',
              type: 'text',
            },
          ],
        },
        {
          name: 'sort_by',
          type: 'array',
          fields: [
            {
              name: 'field',
              type: 'text',
            },
            {
              name: 'direction',
              type: 'select',
              options: [
                { label: 'Ascending', value: 'asc' },
                { label: 'Descending', value: 'desc' },
              ],
            },
          ],
        },
        {
          name: 'limit',
          type: 'number',
          min: 1,
          max: 10000,
        },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'field_name',
          type: 'text',
          required: true,
        },
        {
          name: 'display_name',
          type: 'text',
          required: true,
        },
        {
          name: 'data_type',
          type: 'select',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Number', value: 'number' },
            { label: 'Currency', value: 'currency' },
            { label: 'Date', value: 'date' },
            { label: 'Percentage', value: 'percentage' },
            { label: 'Boolean', value: 'boolean' },
          ],
        },
        {
          name: 'format',
          type: 'text',
          admin: {
            description: 'Optional format string (e.g., "$0,0.00" for currency)',
          },
        },
        {
          name: 'aggregation',
          type: 'select',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Sum', value: 'sum' },
            { label: 'Average', value: 'avg' },
            { label: 'Count', value: 'count' },
            { label: 'Min', value: 'min' },
            { label: 'Max', value: 'max' },
          ],
        },
      ],
    },
    {
      name: 'visualizations',
      type: 'array',
      fields: [
        {
          name: 'chart_type',
          type: 'select',
          options: [
            { label: 'Bar Chart', value: 'bar' },
            { label: 'Line Chart', value: 'line' },
            { label: 'Pie Chart', value: 'pie' },
            { label: 'Table', value: 'table' },
            { label: 'KPI Card', value: 'kpi' },
            { label: 'Heat Map', value: 'heatmap' },
          ],
        },
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'x_axis',
          type: 'text',
        },
        {
          name: 'y_axis',
          type: 'text',
        },
        {
          name: 'config',
          type: 'json',
          admin: {
            description: 'Chart-specific configuration',
          },
        },
      ],
    },
    {
      name: 'schedule',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Enable scheduled report generation',
          },
        },
        {
          name: 'frequency',
          type: 'select',
          options: [
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Monthly', value: 'monthly' },
            { label: 'Quarterly', value: 'quarterly' },
            { label: 'Yearly', value: 'yearly' },
            { label: 'Custom Cron', value: 'cron' },
          ],
        },
        {
          name: 'cron_expression',
          type: 'text',
          admin: {
            description: 'Cron expression if frequency is custom',
          },
        },
        {
          name: 'day_of_week',
          type: 'select',
          options: [
            { label: 'Monday', value: '1' },
            { label: 'Tuesday', value: '2' },
            { label: 'Wednesday', value: '3' },
            { label: 'Thursday', value: '4' },
            { label: 'Friday', value: '5' },
            { label: 'Saturday', value: '6' },
            { label: 'Sunday', value: '0' },
          ],
          admin: {
            condition: (data) => data.schedule?.frequency === 'weekly',
          },
        },
        {
          name: 'day_of_month',
          type: 'number',
          min: 1,
          max: 31,
          admin: {
            condition: (data) => data.schedule?.frequency === 'monthly',
          },
        },
        {
          name: 'time',
          type: 'text',
          admin: {
            description: 'Time to run report (HH:MM format)',
            placeholder: '09:00',
          },
        },
        {
          name: 'timezone',
          type: 'text',
          defaultValue: 'America/New_York',
        },
      ],
    },
    {
      name: 'delivery',
      type: 'group',
      fields: [
        {
          name: 'recipients',
          type: 'array',
          fields: [
            {
              name: 'email',
              type: 'email',
              required: true,
            },
            {
              name: 'name',
              type: 'text',
            },
          ],
        },
        {
          name: 'formats',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'PDF', value: 'pdf' },
            { label: 'Excel', value: 'xlsx' },
            { label: 'CSV', value: 'csv' },
            { label: 'JSON', value: 'json' },
          ],
          defaultValue: ['pdf'],
        },
        {
          name: 'subject_template',
          type: 'text',
          admin: {
            description: 'Email subject (supports {{variables}})',
          },
        },
        {
          name: 'body_template',
          type: 'textarea',
          admin: {
            description: 'Email body (supports {{variables}})',
          },
        },
      ],
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'is_system_report',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'System reports cannot be deleted',
        position: 'sidebar',
      },
    },
    {
      name: 'created_by',
      type: 'text',
    },
    {
      name: 'last_run_at',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'last_run_status',
      type: 'select',
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Partial', value: 'partial' },
      ],
      admin: {
        readOnly: true,
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
