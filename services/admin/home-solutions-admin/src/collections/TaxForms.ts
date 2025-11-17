import type { CollectionConfig } from 'payload'
import { isFeatureEnabled } from '../config/features'

export const TaxForms: CollectionConfig = {
  slug: 'tax_forms',
  admin: {
    useAsTitle: 'form_id',
    defaultColumns: ['form_id', 'user_id', 'form_type', 'tax_year', 'status'],
    hidden: !isFeatureEnabled('tax', 'form1099Generation'),
    group: 'Tax & Compliance',
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
      name: 'form_id',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique form identifier',
      },
    },
    {
      name: 'user_id',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'form_type',
      type: 'select',
      required: true,
      options: [
        { label: 'W-9 (Request for TIN)', value: 'w9' },
        { label: '1099-MISC', value: '1099_misc' },
        { label: '1099-NEC', value: '1099_nec' },
        { label: '1099-K', value: '1099_k' },
        { label: 'W-8BEN (Foreign)', value: 'w8ben' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tax_year',
      type: 'number',
      required: true,
      min: 2020,
      max: 2099,
      defaultValue: new Date().getFullYear(),
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Generated', value: 'generated' },
        { label: 'Sent to Recipient', value: 'sent_to_recipient' },
        { label: 'Filed with IRS', value: 'filed_with_irs' },
        { label: 'Corrected', value: 'corrected' },
        { label: 'Voided', value: 'voided' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'recipient_info',
      type: 'group',
      label: 'Recipient Information',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'tin',
          type: 'text',
          required: true,
          admin: {
            description: 'Tax Identification Number (SSN/EIN) - Encrypted',
          },
        },
        {
          name: 'tin_type',
          type: 'select',
          required: true,
          options: [
            { label: 'SSN', value: 'ssn' },
            { label: 'EIN', value: 'ein' },
            { label: 'ITIN', value: 'itin' },
          ],
        },
        {
          name: 'address',
          type: 'group',
          fields: [
            {
              name: 'street',
              type: 'text',
              required: true,
            },
            {
              name: 'city',
              type: 'text',
              required: true,
            },
            {
              name: 'state',
              type: 'text',
              required: true,
            },
            {
              name: 'zip_code',
              type: 'text',
              required: true,
            },
            {
              name: 'country',
              type: 'text',
              defaultValue: 'USA',
            },
          ],
        },
      ],
    },
    {
      name: 'payer_info',
      type: 'group',
      label: 'Payer Information',
      fields: [
        {
          name: 'business_name',
          type: 'text',
          defaultValue: 'Tenure Reward Payouts LLC',
        },
        {
          name: 'ein',
          type: 'text',
          admin: {
            description: 'Payer EIN',
          },
        },
        {
          name: 'address',
          type: 'group',
          fields: [
            {
              name: 'street',
              type: 'text',
            },
            {
              name: 'city',
              type: 'text',
            },
            {
              name: 'state',
              type: 'text',
            },
            {
              name: 'zip_code',
              type: 'text',
            },
          ],
        },
        {
          name: 'phone',
          type: 'text',
        },
      ],
    },
    {
      name: 'income_details',
      type: 'group',
      label: 'Income Details',
      admin: {
        condition: (data: any) => data.form_type?.includes('1099'),
      },
      fields: [
        {
          name: 'total_amount',
          type: 'number',
          required: true,
          min: 0,
          admin: {
            description: 'Total reportable income (must be ≥$600 for 1099)',
          },
        },
        {
          name: 'box_1_nonemployee_compensation',
          type: 'number',
          min: 0,
          admin: {
            description: '1099-NEC Box 1',
          },
        },
        {
          name: 'box_2_payer_direct_sales',
          type: 'number',
          min: 0,
        },
        {
          name: 'box_4_federal_income_tax',
          type: 'number',
          min: 0,
          admin: {
            description: 'Federal tax withheld',
          },
        },
        {
          name: 'box_5_state_tax',
          type: 'number',
          min: 0,
        },
        {
          name: 'box_6_state_income',
          type: 'number',
          min: 0,
        },
        {
          name: 'related_payments',
          type: 'array',
          admin: {
            description: 'Payments included in this form',
          },
          fields: [
            {
              name: 'payment_id',
              type: 'text',
            },
            {
              name: 'payment_date',
              type: 'date',
            },
            {
              name: 'amount',
              type: 'number',
            },
          ],
        },
      ],
    },
    {
      name: 'w9_data',
      type: 'group',
      label: 'W-9 Data',
      admin: {
        condition: (data: any) => data.form_type === 'w9',
      },
      fields: [
        {
          name: 'business_entity_type',
          type: 'select',
          options: [
            { label: 'Individual/Sole Proprietor', value: 'individual' },
            { label: 'C Corporation', value: 'c_corp' },
            { label: 'S Corporation', value: 's_corp' },
            { label: 'Partnership', value: 'partnership' },
            { label: 'LLC', value: 'llc' },
            { label: 'Trust/Estate', value: 'trust' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'exempt_payee_code',
          type: 'text',
        },
        {
          name: 'certification_signed',
          type: 'checkbox',
          required: true,
          admin: {
            description: 'Taxpayer certification under penalties of perjury',
          },
        },
        {
          name: 'signature_date',
          type: 'date',
        },
        {
          name: 'signed_document_url',
          type: 'text',
          admin: {
            description: 'URL to signed W-9 PDF',
          },
        },
      ],
    },
    {
      name: 'generation',
      type: 'group',
      fields: [
        {
          name: 'generated_at',
          type: 'date',
        },
        {
          name: 'generated_by',
          type: 'text',
          admin: {
            description: 'Admin who generated the form',
          },
        },
        {
          name: 'pdf_url',
          type: 'text',
          admin: {
            description: 'URL to generated PDF',
          },
        },
        {
          name: 'pdf_hash',
          type: 'text',
          admin: {
            description: 'SHA-256 hash for verification',
          },
        },
      ],
    },
    {
      name: 'delivery',
      type: 'group',
      fields: [
        {
          name: 'sent_to_recipient_at',
          type: 'date',
        },
        {
          name: 'sent_via',
          type: 'select',
          options: [
            { label: 'Email', value: 'email' },
            { label: 'Postal Mail', value: 'mail' },
            { label: 'Electronic Portal', value: 'portal' },
          ],
        },
        {
          name: 'recipient_email',
          type: 'text',
        },
        {
          name: 'tracking_number',
          type: 'text',
          admin: {
            description: 'Postal tracking if sent via mail',
          },
        },
      ],
    },
    {
      name: 'irs_filing',
      type: 'group',
      label: 'IRS Filing',
      fields: [
        {
          name: 'filed_with_irs',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'filed_at',
          type: 'date',
        },
        {
          name: 'filing_method',
          type: 'select',
          options: [
            { label: 'IRS FIRE System', value: 'fire' },
            { label: 'Tax Software', value: 'tax_software' },
            { label: 'Mail', value: 'mail' },
          ],
        },
        {
          name: 'confirmation_number',
          type: 'text',
        },
        {
          name: 'filing_deadline',
          type: 'date',
          admin: {
            description: 'January 31st for 1099s',
          },
        },
      ],
    },
    {
      name: 'corrections',
      type: 'array',
      fields: [
        {
          name: 'corrected_form_id',
          type: 'text',
        },
        {
          name: 'reason',
          type: 'textarea',
        },
        {
          name: 'corrected_at',
          type: 'date',
        },
        {
          name: 'corrected_by',
          type: 'text',
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes',
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
