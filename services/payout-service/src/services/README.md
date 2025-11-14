# Payout Service - Services Layer

This directory contains the core business logic services for the Payout Service microservice.

## Services

### Approval Manager Service

**File:** `approval-manager.service.ts`

Manages the multi-level approval workflow for payouts.

**Key Features:**
- Initialize approval workflows for new payouts
- Check if payouts require approval based on amount threshold
- Determine required approval count (2 for >= $100K)
- Validate admin permissions for approvals
- Store workflow in approval_workflow JSONB array

**Usage Example:**

```typescript
import { approvalManagerService } from './services/approval-manager.service'

// Check if a payout requires approval
const requiresApproval = approvalManagerService.requiresApproval(100000)
// Returns: true (amounts >= $100K require approval)

// Get required approval count
const count = approvalManagerService.getRequiredApprovalCount(100000)
// Returns: 2 (two approvals required for $100K+)

// Initialize approval workflow for a payout
const workflow = await approvalManagerService.initializeApproval('payout-123')
// Returns: ApprovalWorkflow object with status 'pending'

// Check if admin can approve
const canApprove = approvalManagerService.canApprove('admin')
// Returns: true (admin role is authorized)

// Get approval threshold configuration
const threshold = approvalManagerService.getApprovalThreshold()
// Returns: { amount: 100000, requiredApprovals: 2, allowedRoles: [...] }
```

**Business Rules:**
- Payouts >= $100,000 require 2 approvals
- Only 'admin' and 'finance_manager' roles can approve
- Workflow is stored in the `approval_workflow` JSONB field
- Each approval includes admin details, decision, reason, and timestamp

**Requirements Implemented:**
- Requirement 6.1: Approval workflow initialization
- Requirement 6.2: Multi-level approval for large payouts

---

## Service Architecture

All services follow these patterns:

1. **Singleton Pattern**: Services are exported as singleton instances
2. **Error Handling**: All methods include try-catch with structured logging
3. **Type Safety**: Full TypeScript typing with interfaces
4. **Database Access**: Use Drizzle ORM for all database operations
5. **Logging**: Winston logger for all operations
6. **Testing**: Unit tests in `tests/services/` directory

## Adding New Services

When creating a new service:

1. Create the service file in `src/services/`
2. Define the service class with clear method documentation
3. Export a singleton instance
4. Create corresponding types in `src/types/`
5. Write unit tests in `tests/services/`
6. Update this README with usage examples

## Testing

Run service tests:

```bash
# Run all service tests
npm test -- services/

# Run specific service test
npm test -- approval-manager.service.test.ts

# Run with coverage
npm test -- --coverage
```

