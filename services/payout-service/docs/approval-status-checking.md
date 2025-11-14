# Approval Status Checking Implementation

## Overview

This document describes the implementation of the `checkApprovalStatus()` method in the Approval Manager Service, which handles approval workflow status checking, automatic status updates, and stakeholder notifications.

## Requirements Implemented

This implementation satisfies the following requirements from the payout service specification:

- **Requirement 6.4**: Update payout status to 'approved' when all required approvals are obtained
- **Requirement 6.5**: Update payout status to 'rejected' if any rejection exists
- **Requirement 6.6**: Send notifications to stakeholders and log decisions in audit trail

## Implementation Details

### Method Signature

```typescript
async checkApprovalStatus(payoutId: string): Promise<ApprovalStatus>
```

### Functionality

The `checkApprovalStatus()` method performs the following operations:

1. **Retrieves Current Workflow State**
   - Fetches the payout record from the database
   - Extracts the approval workflow from the JSONB field
   - Validates that the workflow is initialized

2. **Counts Current Approvals**
   - Filters approvers who have made an 'approved' decision
   - Calculates the number of approvals obtained
   - Compares against required approvals threshold

3. **Detects Status Changes**
   - **Approval Complete**: When current approvals >= required approvals AND no rejections exist
   - **Rejection**: When any approver has submitted a 'rejected' decision

4. **Updates Payout Status**
   - Sets workflow status to 'approved' or 'rejected' as appropriate
   - Updates the payout_management record status field
   - Records completion timestamp in the workflow

5. **Logs to Audit Trail**
   - Creates audit entries for status changes
   - Includes details about approvers, reasons, and timestamps
   - Stores in the audit_trail JSONB field

6. **Sends Notifications**
   - **On Approval**: Notifies member and stakeholders of approval
   - **On Rejection**: Notifies member and stakeholders with rejection reason
   - Uses the NotificationService for email delivery

7. **Returns Status Object**
   - Provides comprehensive status information
   - Includes completion state, approval/rejection flags
   - Lists completed approvals and pending approver count

### Return Value

```typescript
interface ApprovalStatus {
  isComplete: boolean              // True if approved or rejected
  isApproved: boolean              // True if fully approved
  isRejected: boolean              // True if any rejection
  pendingApprovers: number[]       // List of pending approver IDs
  completedApprovals: Approver[]   // List of completed approvals
  requiredApprovals: number        // Number of approvals required
  currentApprovals: number         // Number of approvals obtained
  rejectionReason?: string         // Reason if rejected
}
```

## Usage Example

```typescript
import { approvalManagerService } from './services/approval-manager.service'

// Check approval status for a payout
const status = await approvalManagerService.checkApprovalStatus('payout-123')

if (status.isComplete) {
  if (status.isApproved) {
    console.log('Payout fully approved!')
    console.log(`Approvals: ${status.currentApprovals}/${status.requiredApprovals}`)
  } else if (status.isRejected) {
    console.log('Payout rejected:', status.rejectionReason)
  }
} else {
  console.log(`Pending approvals: ${status.requiredApprovals - status.currentApprovals}`)
}
```

## Workflow State Transitions

```
pending_approval
    ↓
    ├─→ [All approvals obtained] → approved
    │
    └─→ [Any rejection] → rejected
```

## Notification Flow

### On Approval
1. Method detects all required approvals obtained
2. Updates workflow and payout status to 'approved'
3. Calls `notificationService.sendPayoutApproved()`
4. Notification includes:
   - Payout ID
   - Member user ID
   - Approval count
   - Final approver name

### On Rejection
1. Method detects rejection in approver list
2. Updates workflow and payout status to 'rejected'
3. Calls `notificationService.sendPayoutRejected()`
4. Notification includes:
   - Payout ID
   - Member user ID
   - Rejection reason
   - Rejector name

## Audit Trail Entries

### Approval Completion
```json
{
  "action": "approval_workflow_completed",
  "actor": "system",
  "timestamp": "2024-11-14T10:30:00Z",
  "details": {
    "currentApprovals": 2,
    "requiredApprovals": 2,
    "finalStatus": "approved"
  }
}
```

### Rejection
```json
{
  "action": "approval_workflow_rejected",
  "actor": "system",
  "timestamp": "2024-11-14T10:30:00Z",
  "details": {
    "rejectedBy": "Admin 2",
    "reason": "Insufficient documentation",
    "finalStatus": "rejected"
  }
}
```

## Error Handling

The method handles the following error scenarios:

1. **Payout Not Found**: Throws error if payout ID doesn't exist
2. **Workflow Not Initialized**: Throws error if approval workflow is missing
3. **Database Errors**: Logs error and re-throws for caller to handle
4. **Notification Failures**: Logs error but doesn't block workflow (notifications are non-critical)

## Testing

### Unit Tests
- Located in: `tests/services/approval-manager.service.test.ts`
- Tests approval counting logic
- Tests status determination logic
- Tests pending approvers calculation

### Integration Tests
- Located in: `tests/integration/approval-status-check.integration.test.ts`
- Tests complete workflow scenarios
- Tests notification data preparation
- Tests audit trail creation

Run tests with:
```bash
npm test -- --run approval-manager.service.test.ts
npm test -- --run approval-status-check.integration.test.ts
```

## Dependencies

- **Database**: Drizzle ORM for database operations
- **Notification Service**: For sending email notifications
- **Logger**: Winston for structured logging
- **Types**: Approval types from `types/approval.types.ts`

## Future Enhancements

1. **Pre-assigned Approvers**: Track specific admins who need to approve
2. **Approval Reminders**: Send reminder notifications to pending approvers
3. **Approval Deadlines**: Implement time limits for approval decisions
4. **Approval Delegation**: Allow admins to delegate approval authority
5. **Conditional Approvals**: Support different approval rules based on amount tiers

## Related Documentation

- [Approval Manager Service](../src/services/approval-manager.service.ts)
- [Notification Service](../src/services/notification.service.ts)
- [Approval Types](../src/types/approval.types.ts)
- [Requirements Document](../../.kiro/specs/payout-service/requirements.md)
- [Design Document](../../.kiro/specs/payout-service/design.md)
