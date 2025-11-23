# ⚠️ CRITICAL: Status Enum Mismatch Detected

## Problem

The payout service code is using statuses that **do not exist** in the database schema, which will cause database constraint violations.

## Database Schema (Source of Truth)

**File**: `/home/dante/Documents/tenure-azure-flow/drizzle/migrations/schema.ts:473`

```sql
CHECK (status = ANY (ARRAY[
  'pending_approval'::text,
  'approved'::text,
  'scheduled'::text,
  'processing'::text,
  'completed'::text,
  'failed'::text,
  'cancelled'::text
]))
```

## Current Code Issues

### ❌ Invalid Statuses Used in Code

1. **`'payment_sent'`** - Used in:
   - `src/controllers/payment.controller.ts:50`
   - `src/services/payment-processor.service.ts:580`

2. **`'rejected'`** - Used in:
   - `src/controllers/approval.controller.ts:131`

3. **`'ready_for_payment'`** - Used in:
   - `src/services/payment-processor.service.ts:559`

### ✅ Valid Statuses (Already in Database)

- `'pending_approval'` ✓
- `'approved'` ✓
- `'scheduled'` ✓
- `'processing'` ✓
- `'completed'` ✓
- `'failed'` ✓
- `'cancelled'` ✓

## Required Changes

### Option 1: Update Code to Use Existing Statuses (RECOMMENDED)

Map the intended functionality to existing database statuses:

| **Current Code** | **Should Use** | **Reasoning** |
|------------------|----------------|---------------|
| `'payment_sent'` | `'processing'` | Payment has been initiated but not completed |
| `'rejected'` | `'cancelled'` | Payout was cancelled/rejected during approval |
| `'ready_for_payment'` | `'approved'` | Already approved, ready for processing |

### Option 2: Add New Statuses to Database (Requires Migration)

If you want to keep the code statuses, you must:

1. Create a database migration to update the CHECK constraint
2. Add `'payment_sent'`, `'rejected'`, `'ready_for_payment'` to the enum
3. Deploy migration before deploying payout service code

## Status Flow Mapping

### Current Code Flow
```
pending_approval → approved → ready_for_payment → payment_sent → completed
                 → rejected
```

### Database-Compliant Flow (Recommended)
```
pending_approval → approved → processing → completed
                 → cancelled
                 → failed
```

## Detailed Mapping

### Approval Workflow
- **Admin creates payout** → `'pending_approval'`
- **First admin approves** → `'pending_approval'` (still needs 2nd approval)
- **Second admin approves** → `'approved'`
- **Admin rejects** → `'cancelled'` (instead of `'rejected'`)

### Payment Processing
- **Generate instructions** → `'approved'` (no status change)
- **Mark payment sent** → `'processing'` (instead of `'payment_sent'`)
- **Confirm completion** → `'completed'`
- **Payment fails** → `'failed'`

### Scheduled Payments
- **Schedule for future** → `'scheduled'`
- **Scheduled job runs** → `'processing'`

## Files That Need Updates

1. **`src/controllers/approval.controller.ts`** (Line 131)
   - Change `'rejected'` → `'cancelled'`

2. **`src/controllers/payment.controller.ts`** (Line 50)
   - Change `'payment_sent'` → `'processing'`

3. **`src/services/payment-processor.service.ts`**
   - Line 559: Change `'ready_for_payment'` → `'approved'`
   - Line 580: Change `'payment_sent'` → `'processing'`
   - Line 656: Change `'payment_sent'` → `'processing'`
   - Line 765: Change `'payment_failed'` → `'failed'` (this one is OK)

4. **Documentation Updates**
   - `IMPLEMENTATION.md`
   - `INTEGRATION.md`
   - `README.md`

## Implementation

I will now fix all the code to use database-compliant statuses.
