# Winner Selector Service Implementation

## Overview

The Winner Selector Service has been successfully implemented to handle the selection of eligible members for payout, validation of their eligibility, and creation of payout records in the database.

## Implementation Date

November 14, 2025

## Components Implemented

### 1. Winner Selector Service (`src/services/winner-selector.service.ts`)

The main service class that provides three core methods:

#### `getEligibleMembers(count: number): Promise<Winner[]>`

**Purpose**: Query the `active_member_queue_view` to select eligible members for payout.

**Requirements Addressed**:
- 2.1: Query active_member_queue_view
- 2.2: Filter by `is_eligible = true` AND `has_received_payout = false`
- 2.3: Order by `queue_position ASC`
- 2.4: Limit to potential winner count

**Implementation Details**:
- Executes SQL query against the materialized view
- Returns members ordered by queue position (longest tenure first)
- Handles null full names by constructing from first/last name
- Includes comprehensive logging for audit trail

**Example Usage**:
```typescript
const selector = new WinnerSelector()
const winners = await selector.getEligibleMembers(3)
console.log(`Selected ${winners.length} winners`)
```

#### `validateWinner(userId: string): Promise<ValidationResult>`

**Purpose**: Validate a winner's eligibility before creating payout records.

**Requirements Addressed**:
- 2.7: Check KYC status and subscription status

**Validation Checks**:
1. **KYC Verification**: Queries `kyc_verification` table to ensure status = 'verified'
2. **Subscription Status**: Queries `user_subscriptions` table to ensure status IN ('active', 'trialing')
3. **Bank Information**: Placeholder for future implementation (currently returns warning)
4. **Tax Information**: Placeholder for future implementation (currently returns warning)

**Return Value**:
```typescript
{
  isValid: boolean,
  kycVerified: boolean,
  hasActiveSubscription: boolean,
  hasValidBankInfo: boolean,
  hasValidTaxInfo: boolean,
  errors: string[],
  warnings: string[]
}
```

**Example Usage**:
```typescript
const validation = await selector.validateWinner('user-123')
if (validation.isValid) {
  console.log('Winner is eligible for payout')
} else {
  console.error('Validation errors:', validation.errors)
}
```

#### `createPayoutRecords(winners: Winner[], initiatedBy: number, notes?: string): Promise<PayoutCreationResult>`

**Purpose**: Create payout records in the database for validated winners.

**Requirements Addressed**:
- 2.8: Generate unique payout_id for each winner
- 2.9: Create records in payout_management table with status 'pending_approval'
- 2.10: Store eligibility snapshot in eligibility_check JSONB field
- 3.1-3.7: Initialize approval_workflow and audit_trail arrays

**Implementation Details**:
- Uses database transactions for atomicity
- Validates each winner before creating payout record
- Generates UUID for each payout
- Creates comprehensive eligibility snapshot including:
  - Queue position
  - Tenure start date
  - Last payment date
  - Total payments
  - Lifetime payment total
  - Subscription status
  - KYC verification status
- Initializes approval workflow with:
  - Required approvals: 2
  - Current approvals: 0
  - Status: 'pending'
- Initializes audit trail with creation event
- Handles failures gracefully and reports them

**Example Usage**:
```typescript
const result = await selector.createPayoutRecords(
  winners,
  adminUserId,
  'Monthly payout round'
)

console.log(`Created ${result.createdCount} payouts`)
console.log(`Failed ${result.failedCount} payouts`)
```

## Test Coverage

### Test File: `tests/services/winner-selector.service.test.ts`

**Total Tests**: 14
**Test Status**: ✅ All Passing

### Test Suites

#### 1. `getEligibleMembers` Tests (5 tests)
- ✅ Returns eligible members ordered by queue position
- ✅ Handles members with null full_name by constructing from first/last name
- ✅ Returns empty array when no eligible members found
- ✅ Limits results to requested count
- ✅ Throws error when database query fails

#### 2. `validateWinner` Tests (5 tests)
- ✅ Returns valid result when KYC verified and subscription active
- ✅ Returns invalid result when KYC not verified
- ✅ Returns invalid result when subscription not active
- ✅ Returns invalid result when no KYC record found
- ✅ Handles database errors gracefully

#### 3. `createPayoutRecords` Tests (4 tests)
- ✅ Creates payout records for valid winners
- ✅ Skips invalid winners and reports failures
- ✅ Uses transaction for atomicity
- ✅ Throws error when transaction fails

## Database Schema Usage

### Tables Queried

1. **active_member_queue_view** (Materialized View)
   - Used for selecting eligible members
   - Filters: `is_eligible = true`, `has_received_payout = false`
   - Ordering: `queue_position ASC`

2. **kyc_verification**
   - Used for validating KYC status
   - Checks: `status = 'verified'`

3. **user_subscriptions**
   - Used for validating subscription status
   - Checks: `status IN ('active', 'trialing')`

### Tables Modified

1. **payout_management**
   - Inserts new payout records
   - Fields populated:
     - `payoutId` (UUID)
     - `userId`
     - `queuePosition`
     - `amount` (100000.00)
     - `currency` ('USD')
     - `status` ('pending_approval')
     - `eligibilityCheck` (JSONB)
     - `approvalWorkflow` (JSONB array)
     - `auditTrail` (JSONB array)
     - `internalNotes` (JSONB array, optional)

## Data Structures

### Winner Interface
```typescript
interface Winner {
  userId: string
  email: string
  fullName: string
  queuePosition: number
  tenureStartDate: Date
  lastPaymentDate: Date
  totalPayments: number
  lifetimeTotal: number
  subscriptionStatus: string
  subscriptionId?: string
  kycStatus?: string
}
```

### ValidationResult Interface
```typescript
interface ValidationResult {
  isValid: boolean
  kycVerified: boolean
  hasActiveSubscription: boolean
  hasValidBankInfo: boolean
  hasValidTaxInfo: boolean
  errors: string[]
  warnings: string[]
}
```

### PayoutCreationResult Interface
```typescript
interface PayoutCreationResult {
  success: boolean
  payoutIds: string[]
  failedUsers: Array<{
    userId: string
    reason: string
  }>
  createdCount: number
  failedCount: number
}
```

## Logging

The service includes comprehensive logging at multiple levels:

- **INFO**: Major operations (selection, validation, creation)
- **DEBUG**: Detailed operation steps and data
- **WARN**: Validation failures, skipped winners
- **ERROR**: System errors, database failures

All logs include relevant context for debugging and audit purposes.

## Error Handling

### Graceful Degradation
- Database errors are caught and logged
- Validation failures don't stop the entire process
- Failed payout creations are reported but don't rollback successful ones within the same batch

### Transaction Safety
- All payout record creations use database transactions
- Ensures atomicity of multi-record operations
- Rollback on transaction failure

## Future Enhancements

1. **Bank Information Validation**
   - Implement validation of bank account details
   - Check for required fields (routing number, account number, etc.)
   - Validate format and checksums

2. **Tax Information Validation**
   - Implement W-9 form validation
   - Check for valid TIN
   - Verify tax form approval status

3. **Batch Processing**
   - Add support for processing large batches of winners
   - Implement progress tracking
   - Add resume capability for interrupted processes

4. **Notification Integration**
   - Send notifications to selected winners
   - Alert admins of validation failures
   - Notify finance team of pending approvals

## Dependencies

- `drizzle-orm`: Database ORM for queries and transactions
- `uuid`: Generate unique payout IDs
- `winston`: Logging framework
- `vitest`: Testing framework

## Integration Points

### Upstream Services
- **Eligibility Checker Service**: Provides count of potential winners
- **Admin Dashboard**: Triggers winner selection and payout creation

### Downstream Services
- **Approval Manager Service**: Handles approval workflow (to be implemented)
- **Payment Processor Service**: Processes approved payouts (to be implemented)
- **Notification Service**: Sends notifications to winners and admins (to be implemented)

## Compliance & Audit

- All operations are logged with timestamps and user context
- Eligibility snapshots preserve historical data for audit purposes
- Audit trail tracks all state changes
- Transaction logs ensure data integrity

## Performance Considerations

- Materialized view query is optimized with proper indexing
- Batch validation reduces database round trips
- Transaction scope is minimized to reduce lock contention
- Logging is asynchronous to avoid blocking operations

## Security Considerations

- User IDs are validated before database operations
- Admin user ID is required for payout creation
- Sensitive data is not logged (only user IDs, not personal details)
- Database transactions prevent race conditions

## Conclusion

The Winner Selector Service successfully implements all requirements for task 5, providing a robust, well-tested foundation for the payout workflow. The service is ready for integration with the approval and payment processing services.
