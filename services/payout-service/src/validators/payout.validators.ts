/**
 * Payout Service Validators
 * 
 * Zod schemas for validating API inputs and data structures
 */

import { z } from 'zod';

// ============================================================================
// Bank Details Validation
// ============================================================================

export const bankDetailsSchema = z.object({
  accountHolderName: z.string()
    .min(2, 'Account holder name must be at least 2 characters')
    .max(100, 'Account holder name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Account holder name contains invalid characters'),
  
  routingNumber: z.string()
    .length(9, 'Routing number must be exactly 9 digits')
    .regex(/^\d{9}$/, 'Routing number must contain only digits'),
  
  accountNumber: z.string()
    .min(4, 'Account number must be at least 4 digits')
    .max(17, 'Account number must not exceed 17 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  
  accountType: z.enum(['checking', 'savings'], {
    errorMap: () => ({ message: 'Account type must be either checking or savings' })
  }),
  
  bankName: z.string().optional()
});

export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;

// ============================================================================
// Address Validation
// ============================================================================

export const addressSchema = z.object({
  streetAddress: z.string()
    .min(5, 'Street address must be at least 5 characters')
    .max(200, 'Street address must not exceed 200 characters'),
  
  addressLine2: z.string()
    .max(200, 'Address line 2 must not exceed 200 characters')
    .optional(),
  
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must not exceed 100 characters'),
  
  state: z.string()
    .length(2, 'State must be a 2-letter code')
    .regex(/^[A-Z]{2}$/, 'State must be a valid 2-letter uppercase code'),
  
  postalCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Postal code must be in format 12345 or 12345-6789'),
  
  countryCode: z.string()
    .length(2, 'Country code must be 2 letters')
    .regex(/^[A-Z]{2}$/, 'Country code must be uppercase')
    .default('US')
});

export type AddressInput = z.infer<typeof addressSchema>;

// ============================================================================
// Approval Decision Validation
// ============================================================================

export const approvalDecisionSchema = z.object({
  payoutId: z.string()
    .uuid('Invalid payout ID format'),
  
  decision: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Decision must be either approved or rejected' })
  }),
  
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must not exceed 1000 characters')
    .optional(),
  
  metadata: z.object({
    ipAddress: z.string().ip().optional(),
    userAgent: z.string().max(500).optional(),
    notes: z.string().max(2000).optional()
  }).optional()
});

export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;

// ============================================================================
// Payment Status Update Validation
// ============================================================================

export const paymentStatusUpdateSchema = z.object({
  payoutId: z.string()
    .uuid('Invalid payout ID format'),
  
  status: z.enum([
    'pending_approval',
    'approved',
    'scheduled',
    'processing',
    'completed',
    'failed',
    'cancelled'
  ], {
    errorMap: () => ({ message: 'Invalid status. Must match database constraint.' })
  }),
  
  details: z.record(z.any()).optional()
});

export type PaymentStatusUpdateInput = z.infer<typeof paymentStatusUpdateSchema>;

// ============================================================================
// Payment Sent Details Validation
// ============================================================================

export const paymentSentDetailsSchema = z.object({
  sentDate: z.coerce.date(),
  
  expectedArrivalDate: z.coerce.date(),
  
  trackingNumber: z.string()
    .max(100, 'Tracking number must not exceed 100 characters')
    .optional(),
  
  notes: z.string()
    .max(2000, 'Notes must not exceed 2000 characters')
    .optional()
}).refine(
  (data) => data.expectedArrivalDate >= data.sentDate,
  {
    message: 'Expected arrival date must be on or after sent date',
    path: ['expectedArrivalDate']
  }
);

export type PaymentSentDetailsInput = z.infer<typeof paymentSentDetailsSchema>;

// ============================================================================
// Payment Completion Details Validation
// ============================================================================

export const completionDetailsSchema = z.object({
  completedDate: z.coerce.date(),
  
  confirmationNumber: z.string()
    .max(100, 'Confirmation number must not exceed 100 characters')
    .optional(),
  
  notes: z.string()
    .max(2000, 'Notes must not exceed 2000 characters')
    .optional()
});

export type CompletionDetailsInput = z.infer<typeof completionDetailsSchema>;

// ============================================================================
// Payout Creation Validation
// ============================================================================

export const payoutCreationSchema = z.object({
  userIds: z.array(z.string().uuid())
    .min(1, 'At least one user ID is required')
    .max(100, 'Cannot create more than 100 payouts at once'),
  
  notes: z.string()
    .max(2000, 'Notes must not exceed 2000 characters')
    .optional()
});

export type PayoutCreationInput = z.infer<typeof payoutCreationSchema>;

// ============================================================================
// Payout List Filters Validation
// ============================================================================

export const payoutListFiltersSchema = z.object({
  status: z.union([
    z.enum([
      'pending_approval',
      'pending_bank_info',
      'pending_tax_info',
      'approved',
      'ready_for_payment',
      'payment_sent',
      'completed',
      'payment_failed',
      'rejected',
      'cancelled',
      'requires_manual_review'
    ]),
    z.array(z.enum([
      'pending_approval',
      'pending_bank_info',
      'pending_tax_info',
      'approved',
      'ready_for_payment',
      'payment_sent',
      'completed',
      'payment_failed',
      'rejected',
      'cancelled',
      'requires_manual_review'
    ]))
  ]).optional(),
  
  userId: z.string().uuid().optional(),
  
  startDate: z.coerce.date().optional(),
  
  endDate: z.coerce.date().optional(),
  
  minAmount: z.number()
    .min(0, 'Minimum amount must be non-negative')
    .optional(),
  
  maxAmount: z.number()
    .min(0, 'Maximum amount must be non-negative')
    .optional(),
  
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must not exceed 1000')
    .default(50),
  
  offset: z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .default(0)
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
).refine(
  (data) => {
    if (data.minAmount !== undefined && data.maxAmount !== undefined) {
      return data.maxAmount >= data.minAmount;
    }
    return true;
  },
  {
    message: 'Maximum amount must be greater than or equal to minimum amount',
    path: ['maxAmount']
  }
);

export type PayoutListFiltersInput = z.infer<typeof payoutListFiltersSchema>;

// ============================================================================
// Winner Selection Validation
// ============================================================================

export const winnerSelectionSchema = z.object({
  count: z.number()
    .int('Count must be an integer')
    .min(1, 'Count must be at least 1')
    .max(100, 'Count must not exceed 100'),
  
  requireKycVerification: z.boolean().default(true),
  
  requireActiveSubscription: z.boolean().default(true)
});

export type WinnerSelectionInput = z.infer<typeof winnerSelectionSchema>;

// ============================================================================
// Tax Information Validation
// ============================================================================

export const taxInfoSchema = z.object({
  hasTaxForm: z.boolean(),
  
  formType: z.enum(['W-9', '1099-MISC']).optional(),
  
  taxYear: z.number()
    .int('Tax year must be an integer')
    .min(2000, 'Tax year must be 2000 or later')
    .max(2100, 'Tax year must be 2100 or earlier')
    .optional(),
  
  tinProvided: z.boolean().optional()
});

export type TaxInfoInput = z.infer<typeof taxInfoSchema>;

// ============================================================================
// Internal Notes Validation
// ============================================================================

export const internalNoteSchema = z.object({
  payoutId: z.string().uuid('Invalid payout ID format'),
  
  note: z.string()
    .min(1, 'Note cannot be empty')
    .max(5000, 'Note must not exceed 5000 characters')
});

export type InternalNoteInput = z.infer<typeof internalNoteSchema>;

// ============================================================================
// Payment Method Validation
// ============================================================================

export const paymentMethodSchema = z.object({
  payoutId: z.string().uuid('Invalid payout ID format'),
  
  paymentMethod: z.enum(['ach', 'check'], {
    errorMap: () => ({ message: 'Payment method must be either ach or check' })
  }),
  
  bankDetails: bankDetailsSchema.optional(),
  
  mailingAddress: addressSchema.optional()
}).refine(
  (data) => {
    if (data.paymentMethod === 'ach') {
      return data.bankDetails !== undefined;
    }
    return true;
  },
  {
    message: 'Bank details are required for ACH payment method',
    path: ['bankDetails']
  }
).refine(
  (data) => {
    if (data.paymentMethod === 'check') {
      return data.mailingAddress !== undefined;
    }
    return true;
  },
  {
    message: 'Mailing address is required for check payment method',
    path: ['mailingAddress']
  }
);

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

// ============================================================================
// Eligibility Check Validation
// ============================================================================

export const eligibilityCheckSchema = z.object({
  forceCheck: z.boolean().default(false),
  
  includeDetails: z.boolean().default(true)
});

export type EligibilityCheckInput = z.infer<typeof eligibilityCheckSchema>;

// ============================================================================
// Payment Failure Validation
// ============================================================================

export const paymentFailureSchema = z.object({
  payoutId: z.string().uuid('Invalid payout ID format'),
  
  errorCode: z.string()
    .min(1, 'Error code is required')
    .max(50, 'Error code must not exceed 50 characters'),
  
  errorMessage: z.string()
    .min(1, 'Error message is required')
    .max(1000, 'Error message must not exceed 1000 characters'),
  
  retryable: z.boolean().default(false),
  
  details: z.record(z.any()).optional()
});

export type PaymentFailureInput = z.infer<typeof paymentFailureSchema>;

// ============================================================================
// Pagination Validation
// ============================================================================

export const paginationSchema = z.object({
  page: z.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  
  pageSize: z.number()
    .int('Page size must be an integer')
    .min(1, 'Page size must be at least 1')
    .max(100, 'Page size must not exceed 100')
    .default(20)
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================================================
// UUID Validation Helper
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

// ============================================================================
// Date Range Validation Helper
// ============================================================================

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
);

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
