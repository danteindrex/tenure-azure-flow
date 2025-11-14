# Eligibility Checker Service Implementation

## Overview

The Eligibility Checker Service has been successfully implemented as part of Task 4 of the Payout Service specification. This service is responsible for determining when the company meets the conditions to issue $100,000 payouts to eligible members.

## Implementation Summary

### Task 4.1: Core Eligibility Logic ✅

**File:** `src/services/eligibility-checker.service.ts`

Implemented methods:
- `getTotalRevenue()` - Queries `user_payments` table for total succeeded payments
- `getCompanyAge()` - Calculates months since `BUSINESS_LAUNCH_DATE`
- `calculatePotentialWinners()` - Uses `Math.floor(revenue / 100000)` formula
- `checkEligibility()` - Combines all checks to determine eligibility status

**Requirements Met:**
- ✅ 1.1: Verify total revenue >= $100,000
- ✅ 1.2: Verify company age >= 12 months
- ✅ 1.3: Calculate potential winners
- ✅ 1.4: Query eligible members from `active_member_queue_view`

### Task 4.2: Admin Notification ✅

**File:** `src/services/eligibility-checker.service.ts` (extended)

Implemented methods:
- `getEligibleMembers()` - Retrieves list of eligible members from view
- `createAdminAlert()` - Creates alert in `admin_alerts` table
- `logEligibilityCheck()` - Stores results in `user_audit_logs` table
- `performEligibilityCheckWithNotification()` - Complete workflow with notifications
- `logEligibilityCheckFailure()` - Error handling and audit logging

**Requirements Met:**
- ✅ 1.5: Create alert in `admin_alerts` table when eligible
- ✅ 1.6: Query eligible member count from `active_member_queue_view`
- ✅ 1.8: Store eligibility check results in audit log

## Key Features

### 1. Revenue Calculation
```typescript
// Queries user_payments table for sum of succeeded payments
const result = await db
  .select({
    totalRevenue: sql<string>`COALESCE(SUM(${userPayments.amount}), 0)`
  })
  .from(userPayments)
  .where(eq(userPayments.status, 'succeeded'))
```

### 2. Company Age Calculation
```typescript
// Calculates months since launch date
const diffMs = now.getTime() - launchDate.getTime()
const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44)
const ageInMonths = Math.floor(diffMonths)
```

### 3. Potential Winners Formula
```typescript
// Uses Math.floor to determine number of winners
const potentialWinners = Math.floor(revenue / payoutAmountPerWinner)
```

### 4. Admin Alert Creation
When eligibility conditions are met, the service creates an alert with:
- Title: "Payout Eligibility Conditions Met"
- Severity: `info`
- Category: `payout_eligible`
- Related entity data (revenue, age, potential winners)
- Trigger information (timestamp, requirement status)

### 5. Audit Trail
All eligibility checks are logged to `user_audit_logs` with:
- Entity type: `payout_eligibility`
- Action: `eligibility_check`
- Success status
- Complete eligibility data
- Metadata (thresholds, next check date, alert ID)

## Testing

**Test File:** `tests/services/eligibility-checker.service.test.ts`

### Test Coverage (15 tests, all passing ✅)

1. **getTotalRevenue** (3 tests)
   - Returns total revenue from succeeded payments
   - Returns 0 when no payments exist
   - Handles database errors gracefully

2. **getCompanyAge** (2 tests)
   - Calculates company age in months correctly
   - Returns 0 for company launched today

3. **calculatePotentialWinners** (3 tests)
   - Calculates correct number of winners for revenue >= 100K
   - Returns 0 for revenue < 100K
   - Uses Math.floor for partial amounts

4. **checkEligibility** (2 tests)
   - Returns eligible when revenue >= 100K and age >= 12 months
   - Returns not eligible when revenue < 100K

5. **getEligibleMembers** (2 tests)
   - Returns list of eligible members from view
   - Handles empty result set

6. **createAdminAlert** (1 test)
   - Creates admin alert when eligible

7. **logEligibilityCheck** (2 tests)
   - Logs eligibility check to audit trail
   - Does not throw on logging failure

### Running Tests
```bash
cd services/payout-service
npm test -- --run eligibility-checker.service.test.ts
```

## Configuration

Required environment variables:
```bash
BUSINESS_LAUNCH_DATE=2024-01-01  # Company launch date
PAYOUT_THRESHOLD=100000          # Revenue threshold ($100K)
REWARD_PER_WINNER=100000         # Payout amount per winner ($100K)
```

## Usage Example

```typescript
import { EligibilityChecker } from './services/eligibility-checker.service'

// Initialize checker
const checker = new EligibilityChecker()

// Perform complete eligibility check with notifications
const result = await checker.performEligibilityCheckWithNotification()

if (result.eligibility.isEligible) {
  console.log(`✅ Eligible for payouts!`)
  console.log(`Potential winners: ${result.eligibility.potentialWinners}`)
  console.log(`Eligible members: ${result.eligibleMembers.length}`)
  console.log(`Alert created: ${result.alertId}`)
} else {
  console.log(`❌ Not eligible: ${result.eligibility.reason}`)
}
```

## Integration Points

### Database Tables Used
- `user_payments` - For revenue calculation
- `active_member_queue_view` - For eligible member queries
- `admin_alerts` - For admin notifications
- `user_audit_logs` - For audit trail

### Next Steps
This service will be integrated with:
1. **Cron Job Scheduler** (Task 13.2) - Daily eligibility checks at 2 AM UTC
2. **Admin Dashboard** - Display eligibility status and eligible members
3. **Winner Selector Service** (Task 5) - Use eligibility data to select winners

## Error Handling

The service implements comprehensive error handling:
- Database connection failures are logged and thrown
- Logging failures don't break the eligibility check
- All errors include stack traces in logs
- Sensitive data is redacted from logs

## Logging

All operations are logged with structured Winston logging:
- `info` - Eligibility check results, alert creation
- `debug` - Query details, intermediate calculations
- `error` - Failures with stack traces

Example log output:
```json
{
  "level": "info",
  "message": "Eligibility check completed",
  "service": "payout-service",
  "timestamp": "2024-11-13 20:16:00",
  "isEligible": true,
  "totalRevenue": 250000,
  "companyAgeMonths": 13,
  "potentialWinners": 2,
  "eligibleMemberCount": 5
}
```

## Performance Considerations

- Revenue query uses indexed `status` column
- View query uses indexed `is_eligible` and `has_received_payout` columns
- All queries use Drizzle ORM for SQL injection protection
- Connection pooling configured for optimal performance

## Security

- No sensitive data (bank details, SSNs) in eligibility checks
- All database queries use parameterized statements
- Audit trail captures all eligibility checks
- Admin alerts require proper authentication to view

## Status

✅ **Task 4.1 Complete** - Core eligibility logic implemented and tested
✅ **Task 4.2 Complete** - Admin notification functionality implemented and tested
✅ **Task 4 Complete** - Eligibility Checker Service fully implemented

All 15 unit tests passing. Ready for integration with cron scheduler and admin dashboard.
