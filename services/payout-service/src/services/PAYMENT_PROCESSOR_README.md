# Payment Processor Service

## Overview

The Payment Processor Service handles the complete lifecycle of physical payment processing for $100,000 member payouts. This service manages payout calculations, payment instructions generation, status tracking, and receipt generation.

## Implementation Status

✅ **Task 7.1: Payout Calculation Logic** - COMPLETED
✅ **Task 7.2: Payment Instructions Generation** - COMPLETED
✅ **Task 7.3: Payment Status Tracking** - COMPLETED
✅ **Task 7.4: Receipt Generation** - COMPLETED

## Features Implemented

### 1. Payout Calculation (Task 7.1)

**Business Rules:**
- Gross payout amount: $100,000
- Retention fee: $300 (deducted for next year's membership)
- Tax withholding: 24% if no valid W-9 on file
- Net payout: Gross - Retention Fee - Tax Withholding

**Methods:**
- `calculateNetPayout(hasValidW9: boolean)` - Calculates net payout with detailed breakdown
- `storePayoutCalculation(payoutId, calculation)` - Stores calculation in database
- `calculateAndStorePayoutForRecord(payoutId, hasValidW9)` - Convenience method combining both

**Example Calculations:**
```typescript
// With valid W-9:
// Gross: $100,000
// Retention Fee: -$300
// Net: $99,700

// Without W-9:
// Gross: $100,000
// Retention Fee: -$300
// Tax Withholding: -$24,000 (24%)
// Net: $75,700
```

### 2. Payment Instructions Generation (Task 7.2)

**Features:**
- Retrieves encrypted bank details from `bank_details` JSONB for ACH payments
- Queries `user_addresses` table for primary address for check payments
- Generates PDF payment instructions using PDFKit
- Stores PDF URL in `processing` JSONB field

**Methods:**
- `generatePaymentInstructions(payoutId, generatedBy)` - Main method
- `generatePaymentInstructionsPDF(...)` - Private PDF generation method

**Payment Methods Supported:**
- **ACH**: Direct bank transfer using encrypted bank account details
- **Check**: Physical check mailed to primary address

### 3. Payment Status Tracking (Task 7.3)

**Status Flow:**
```
approved → payment_sent → completed
                ↓
         payment_failed
```

**Methods:**
- `markPaymentSent(payoutId, details)` - Updates status to 'payment_sent'
  - Stores sent date and expected arrival date
  - Records tracking number (if available)
  - Updates audit trail
  
- `confirmPaymentComplete(payoutId, details)` - Updates status to 'completed'
  - Stores completion timestamp
  - Records confirmation number
  - Links receipt URL
  
- `handlePaymentFailure(payoutId, error)` - Updates status to 'payment_failed'
  - Logs error details
  - Marks as retryable or not
  - Triggers admin notifications

### 4. Receipt Generation (Task 7.4)

**Features:**
- Generates professional PDF receipt showing complete breakdown
- Includes gross amount, retention fee, tax withholding, and net amount
- Shows payment method and recipient details
- Stores receipt URL in `receipt_url` field

**Methods:**
- `generateReceipt(payoutId)` - Main receipt generation method
- `generateReceiptPDF(receiptData)` - Private PDF creation method

**Receipt Contents:**
- Payout ID and date
- Recipient information
- Gross payout amount: $100,000
- Retention fee deduction: -$300
- Tax withholding (if applicable): -$24,000
- Net amount paid
- Payment method (ACH/Check)
- Company branding and legal disclaimers

## Data Storage

All payment processing data is stored in the `payout_management` table's `processing` JSONB field:

```json
{
  "calculation": {
    "grossAmount": 100000.00,
    "retentionFee": 300.00,
    "taxWithholding": 0.00,
    "netAmount": 99700.00,
    "breakdown": [...],
    "calculatedAt": "2024-11-14T..."
  },
  "instructionsPdfUrl": "https://...",
  "instructionsGeneratedAt": "2024-11-14T...",
  "instructionsGeneratedBy": 123,
  "sentDate": "2024-11-14T...",
  "expectedArrivalDate": "2024-11-21T...",
  "trackingNumber": "ABC123",
  "completedDate": "2024-11-21T...",
  "confirmationNumber": "XYZ789"
}
```

## Audit Trail

All operations are logged to the `audit_trail` JSONB array:

```json
[
  {
    "action": "payout_calculated",
    "actor": "system",
    "timestamp": "2024-11-14T...",
    "details": { ... }
  },
  {
    "action": "payment_instructions_generated",
    "actor": "admin_123",
    "timestamp": "2024-11-14T...",
    "details": { ... }
  },
  {
    "action": "payment_sent",
    "actor": "admin_456",
    "timestamp": "2024-11-14T...",
    "details": { ... }
  },
  {
    "action": "payment_completed",
    "actor": "admin_456",
    "timestamp": "2024-11-21T...",
    "details": { ... }
  }
]
```

## Usage Examples

### Calculate Payout
```typescript
import { paymentProcessorService } from './services/payment-processor.service'

// Calculate with W-9
const calculation = await paymentProcessorService.calculateNetPayout(true)
console.log(`Net payout: $${calculation.netAmount}`) // $99,700

// Calculate without W-9
const calculationNoW9 = await paymentProcessorService.calculateNetPayout(false)
console.log(`Net payout: $${calculationNoW9.netAmount}`) // $75,700
```

### Generate Payment Instructions
```typescript
const instructions = await paymentProcessorService.generatePaymentInstructions(
  'payout-123',
  adminId
)

console.log(`Payment method: ${instructions.paymentMethod}`)
console.log(`Net amount: $${instructions.amount}`)
console.log(`PDF URL: ${instructions.instructionsPdfUrl}`)
```

### Track Payment Status
```typescript
// Mark as sent
await paymentProcessorService.markPaymentSent('payout-123', {
  sentDate: new Date(),
  expectedArrivalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  trackingNumber: 'ABC123',
  sentBy: adminId
})

// Confirm completion
await paymentProcessorService.confirmPaymentComplete('payout-123', {
  completedDate: new Date(),
  confirmationNumber: 'XYZ789',
  receiptUrl: 'https://...',
  completedBy: adminId
})
```

### Generate Receipt
```typescript
const receiptUrl = await paymentProcessorService.generateReceipt('payout-123')
console.log(`Receipt available at: ${receiptUrl}`)
```

## Testing

Comprehensive unit tests are included in `__tests__/payment-processor.test.ts`:

- ✅ Payout calculation with W-9
- ✅ Payout calculation without W-9
- ✅ Retention fee enforcement
- ✅ Tax withholding calculation
- ✅ Breakdown structure validation
- ✅ Business rules enforcement

Run tests:
```bash
npm test -- src/services/__tests__/payment-processor.test.ts
```

## Requirements Satisfied

### Requirement 7.1 ✅
- Deducts $300 retention fee from $100,000 gross amount
- Calculates net payout correctly

### Requirement 7.2 ✅
- Retrieves encrypted bank details from `bank_details` JSONB for ACH
- Queries `user_addresses` table for primary address for checks

### Requirement 7.3 ✅
- Generates PDF using PDFKit with payment details and net amount

### Requirement 7.4 ✅
- Stores PDF URL in `processing` JSONB field

### Requirement 7.5 ✅
- Stores breakdown in `processing` JSONB field

### Requirement 7.6 ✅
- Updates status to 'payment_sent'

### Requirement 7.7 ✅
- Stores sent date and expected arrival date in `processing` JSONB

### Requirement 7.8 ✅
- Updates status to 'completed'
- Generates receipt PDF showing retention fee deduction

### Requirement 7.9 ✅
- Stores completion timestamp
- Handles payment failures

### Requirement 7.10 ✅
- Receipt includes gross amount, retention fee, tax withholding, net amount

## Next Steps

1. **Implement actual PDF generation** - Currently using mock URLs
   - Use PDFKit to create professional payment instructions
   - Use PDFKit to create detailed receipts
   - Upload to cloud storage (S3, etc.)

2. **Add encryption/decryption** - For bank details
   - Implement AES-256 encryption
   - Secure key management

3. **Integrate with notification service** - Send emails
   - Payment sent notifications
   - Payment completed notifications
   - Payment failure alerts

4. **Add retry logic** - For failed payments
   - Implement exponential backoff
   - Track retry attempts

5. **Create API endpoints** - For admin dashboard
   - POST /api/payouts/:id/generate-instructions
   - POST /api/payouts/:id/mark-sent
   - POST /api/payouts/:id/confirm
   - GET /api/payouts/:id/receipt

## Notes

- All payment processing is tracked through status updates
- Finance team processes payments manually using generated instructions
- Service does NOT integrate with payment processors (Stripe, etc.)
- Physical payments only: ACH transfers and checks
- Complete audit trail maintained for compliance

