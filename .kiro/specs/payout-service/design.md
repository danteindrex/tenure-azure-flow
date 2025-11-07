# Design Document - Payout Service Microservice

## Overview

The Payout Service is a standalone Node.js/TypeScript microservice responsible for managing the complete lifecycle of $100,000 member payouts. It operates independently from the main application and subscription service, focusing solely on payout eligibility detection, winner selection, approval workflows, physical payment processing, and compliance tracking.

### Key Responsibilities

1. **Eligibility Detection**: Monitor company revenue and time requirements to determine when payouts can be issued
2. **Winner Selection**: Automatically select eligible members based on queue position and tenure
3. **Retention Fee Deduction**: Deduct $300 from payout for next year's membership retention
4. **Approval Workflow**: Manage multi-level approval process for large payouts
5. **Payment Processing**: Track physical payment processing (ACH/check) through finance team
6. **Tax Compliance**: Handle W-9 collection, backup withholding, and 1099-MISC generation
7. **Membership Management**: Remove winners from active membership after 12 months, re-add if they pay again
8. **Audit Trail**: Maintain comprehensive audit logs for all payout operations
9. **Notifications**: Send email notifications to members and administrators throughout the process

### Technology Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Drizzle ORM (schemas copied locally)
- **Authentication**: Better Auth sessions (shared with main app)
- **Email**: Nodemailer or SendGrid for notifications
- **PDF Generation**: PDFKit for receipts and payment instructions
- **Scheduling**: node-cron for periodic eligibility checks
- **Logging**: Winston for structured logging
- **Monitoring**: Health checks and structured logs

## Architecture

### Service Architecture

```mermaid
graph TB
    subgraph "Payout Service"
        API[REST API Layer]
        SCHED[Scheduler/Cron Jobs]
        ELIG[Eligibility Checker]
        WINNER[Winner Selector]
        APPROVAL[Approval Manager]
        PAYMENT[Payment Processor]
        TAX[Tax Compliance]
        NOTIF[Notification Service]
        AUDIT[Audit Logger]
    end
    
    subgraph "Database"
        VIEW[active_member_queue_view]
        PAYOUT[payout_management]
        PAYMENTS[user_payments]
        TAX_FORMS[tax_forms]
        AUDIT_LOG[user_audit_logs]
    end
    
    subgraph "External Services"
        EMAIL[Email Service]
        ADMIN[Admin Dashboard]
        FINANCE[Finance Team]
    end
    
    SCHED --> ELIG
    ELIG --> VIEW
    ELIG --> PAYMENTS
    ELIG --> WINNER
    WINNER --> VIEW
    WINNER --> PAYOUT
    WINNER --> APPROVAL
    APPROVAL --> PAYMENT
    PAYMENT --> TAX
    PAYMENT --> PAYOUT
    TAX --> TAX_FORMS
    PAYMENT --> NOTIF
    NOTIF --> EMAIL
    API --> APPROVAL
    API --> PAYMENT
    AUDIT --> AUDIT_LOG
    ADMIN --> API
    FINANCE --> API
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer / API Gateway              │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │  Main App      │         │ Payout Service │
        │  (Next.js)     │         │  (Express.js)  │
        └───────┬────────┘         └───────┬────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL DB   │
                    │  (Shared Schema)  │
                    └───────────────────┘
```

### Data Flow

1. **Scheduled Eligibility Check** (Daily at 2 AM UTC)
   - Cron job triggers eligibility checker
   - Query `user_payments` for total revenue
   - Check company age against `BUSINESS_LAUNCH_DATE`
   - If conditions met, send notification to admin dashboard
   - Display eligible members list to admin
   - **Admin manually reviews and decides to initiate payout**

2. **Admin-Initiated Winner Selection Flow**
   - Admin clicks "Initiate Payout" button in dashboard
   - System queries `active_member_queue_view` for eligible members
   - Filter by `is_eligible = true` AND `has_received_payout = false`
   - Display top N potential winners to admin based on `queue_position`
   - Admin reviews list and confirms winners
   - Admin clicks "Create Payout Records" button
   - System validates KYC status for each winner
   - System creates `payout_management` records with status `pending_approval`

3. **Approval Workflow**
   - System sends notification to finance managers
   - Admin reviews payout details via dashboard
   - Admin clicks "Approve" or "Reject" button
   - System records approval/rejection in `approval_workflow` JSONB
   - Require 2+ approvals for $100K+ payouts
   - Update status to `approved` when all approvals obtained

4. **Admin-Managed Payment Processing**
   - Admin clicks "Generate Payment Instructions" button
   - System generates payment instructions (ACH details or check request)
   - Admin downloads instructions and processes payment externally
   - Admin clicks "Mark as Sent" button and enters sent date
   - System updates status to `payment_sent`
   - Admin clicks "Confirm Completion" button after payment clears
   - System updates status to `completed`
   - System generates receipt PDF and stores URL

5. **Post-Payout**
   - System deducts $300 retention fee from $100K payout (net payout: $99,700)
   - System creates audit log entry
   - System sends confirmation email to member with retention fee explanation
   - Member automatically excluded from future payouts via view
   - System schedules membership removal for 12 months after payout
   - If member pays again after 12 months, re-add to queue with new timestamp

## Components and Interfaces

### 1. Eligibility Checker Service

**Purpose**: Periodically check if payout conditions are met

**Interface**:
```typescript
interface EligibilityChecker {
  checkEligibility(): Promise<EligibilityResult>
  getTotalRevenue(): Promise<number>
  getCompanyAge(): number
  calculatePotentialWinners(revenue: number): number
}

interface EligibilityResult {
  isEligible: boolean
  totalRevenue: number
  companyAgeMonths: number
  potentialWinners: number
  eligibleMemberCount: number
  nextCheckDate: Date
  reason?: string
}
```

**Implementation Details**:
- Runs daily via cron job at 2 AM UTC
- Queries `user_payments` table: `SELECT SUM(amount) FROM user_payments WHERE status = 'succeeded'`
- Calculates company age: `(Date.now() - BUSINESS_LAUNCH_DATE) / (1000 * 60 * 60 * 24 * 30)`
- Potential winners: `Math.floor(totalRevenue / 100000)`
- If eligible, sends notification to admin dashboard with eligibility details
- Creates admin alert in `admin_alerts` table with severity 'info' and category 'payout_eligible'
- Logs all checks to audit trail
- **Does NOT automatically create payouts - waits for admin to manually initiate**

### 2. Winner Selector Service

**Purpose**: Select eligible members for payout based on queue position

**Interface**:
```typescript
interface WinnerSelector {
  selectWinners(count: number): Promise<Winner[]>
  validateWinner(userId: string): Promise<ValidationResult>
  createPayoutRecords(winners: Winner[]): Promise<PayoutRecord[]>
}

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
}

interface ValidationResult {
  isValid: boolean
  kycVerified: boolean
  hasActiveSubscription: boolean
  errors: string[]
}
```

**Implementation Details**:
- **Triggered by admin action, not automatically**
- Query: `SELECT * FROM active_member_queue_view WHERE is_eligible = true ORDER BY queue_position ASC LIMIT $1`
- Display potential winners to admin for review
- Admin confirms winner selection via dashboard button
- Validate each winner:
  - Check `kyc_verification` table: `status = 'verified'`
  - Verify `subscription_status IN ('active', 'trialing')`
- Create `payout_management` records with unique `payout_id` only after admin confirmation
- Store eligibility snapshot in `eligibility_check` JSONB field
- Send notification to admin confirming payout records created

### 3. Approval Manager Service

**Purpose**: Manage multi-level approval workflow for payouts

**Interface**:
```typescript
interface ApprovalManager {
  initializeApproval(payoutId: string): Promise<ApprovalWorkflow>
  submitApproval(payoutId: string, adminId: number, decision: ApprovalDecision): Promise<void>
  checkApprovalStatus(payoutId: string): Promise<ApprovalStatus>
  requiresApproval(amount: number): boolean
}

interface ApprovalWorkflow {
  requiredApprovals: number
  currentApprovals: number
  approvers: Approver[]
  status: 'pending' | 'approved' | 'rejected'
}

interface ApprovalDecision {
  approved: boolean
  reason?: string
  timestamp: Date
}

interface ApprovalStatus {
  isComplete: boolean
  isApproved: boolean
  pendingApprovers: number[]
  completedApprovals: Approver[]
}
```

**Implementation Details**:
- Payouts >= $100,000 require 2 approvals
- Store approval workflow in `approval_workflow` JSONB array
- Each approval includes: `{ admin_id, decision, reason, timestamp }`
- Update `payout_management.status` when workflow completes
- Send notifications to pending approvers

### 4. Payment Processor Service

**Purpose**: Track physical payment processing and generate payment instructions

**Interface**:
```typescript
interface PaymentProcessor {
  calculateNetPayout(grossAmount: number): Promise<PayoutCalculation>
  generatePaymentInstructions(payoutId: string): Promise<PaymentInstructions>
  markPaymentSent(payoutId: string, details: PaymentSentDetails): Promise<void>
  confirmPaymentComplete(payoutId: string, details: CompletionDetails): Promise<void>
  handlePaymentFailure(payoutId: string, error: PaymentError): Promise<void>
  generateReceipt(payoutId: string): Promise<string>
  scheduleMembershipRemoval(userId: string, payoutDate: Date): Promise<void>
}

interface PayoutCalculation {
  grossAmount: number          // 100000.00
  retentionFee: number         // 300.00
  taxWithholding: number       // 0 or 24000.00 (if no W-9)
  netAmount: number            // 99700.00 or 75700.00
  breakdown: {
    description: string
    amount: number
  }[]
}

interface PaymentInstructions {
  payoutId: string
  paymentMethod: 'ach' | 'check'
  amount: number
  currency: string
  recipient: RecipientDetails
  bankDetails?: BankDetails
  mailingAddress?: Address
  instructionsPdfUrl: string
}

interface BankDetails {
  accountHolderName: string
  routingNumber: string
  accountNumber: string
  accountType: 'checking' | 'savings'
}

interface PaymentSentDetails {
  sentDate: Date
  expectedArrivalDate: Date
  trackingNumber?: string
  notes?: string
}

interface CompletionDetails {
  completedDate: Date
  confirmationNumber?: string
  receiptUrl: string
}
```

**Implementation Details**:
- Calculate net payout: $100,000 - $300 (retention fee) - tax withholding (if applicable)
- Store breakdown in `processing` JSONB:
  ```json
  {
    "gross_amount": 100000.00,
    "retention_fee": 300.00,
    "tax_withholding": 0.00,
    "net_amount": 99700.00,
    "breakdown": [
      { "description": "Gross Payout", "amount": 100000.00 },
      { "description": "Retention Fee (Next Year)", "amount": -300.00 },
      { "description": "Net Payout", "amount": 99700.00 }
    ]
  }
  ```
- Generate PDF payment instructions using PDFKit
- For ACH: Include encrypted bank details from `bank_details` JSONB
- For check: Include mailing address from `user_addresses` WHERE `is_primary = true`
- Store processing details in `processing` JSONB field
- Update `scheduled_date` when payment sent
- Generate receipt PDF on completion showing retention fee deduction
- Schedule membership removal job for 12 months after payout date
- Create cron job to check for membership removals daily

### 5. Tax Compliance Service

**Purpose**: Handle tax withholding, W-9 collection, and 1099-MISC generation

**Interface**:
```typescript
interface TaxComplianceService {
  checkW9Status(userId: string): Promise<W9Status>
  calculateWithholding(amount: number, hasW9: boolean): Promise<WithholdingCalculation>
  create1099MISC(payoutId: string, taxYear: number): Promise<TaxForm>
  generateYearEnd1099s(taxYear: number): Promise<TaxForm[]>
}

interface W9Status {
  hasW9: boolean
  isApproved: boolean
  tinProvided: boolean
  formId?: string
}

interface WithholdingCalculation {
  grossAmount: number
  withholdingRate: number
  withheldAmount: number
  netAmount: number
  reason: string
}

interface TaxForm {
  formId: string
  userId: string
  formType: '1099-MISC' | 'W-9'
  taxYear: number
  status: string
  incomeDetails: Record<string, any>
}
```

**Implementation Details**:
- Query `tax_forms` table: `WHERE user_id = $1 AND form_type = 'W-9' AND status = 'approved'`
- Apply 24% backup withholding if no valid W-9
- Store withholding details in `tax_withholding` JSONB:
  ```json
  {
    "withholding_rate": 0.24,
    "withheld_amount": 24000.00,
    "net_payout_amount": 76000.00,
    "reason": "No W-9 on file"
  }
  ```
- Create 1099-MISC record with `income_details`:
  ```json
  {
    "box_3_other_income": 100000.00,
    "federal_tax_withheld": 24000.00
  }
  ```
- Generate year-end 1099s for all payouts >= $600

### 6. Notification Service

**Purpose**: Send email notifications to members and administrators

**Interface**:
```typescript
interface NotificationService {
  sendWinnerNotification(userId: string, payoutId: string): Promise<void>
  sendBankInfoRequest(userId: string, payoutId: string): Promise<void>
  sendTaxInfoRequest(userId: string, payoutId: string): Promise<void>
  sendApprovalRequest(adminId: number, payoutId: string): Promise<void>
  sendPaymentConfirmation(userId: string, payoutId: string): Promise<void>
  sendPaymentFailure(userId: string, payoutId: string, error: string): Promise<void>
}

interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
  attachments?: Attachment[]
}
```

**Implementation Details**:
- Use Nodemailer or SendGrid for email delivery
- Templates stored in `src/templates/` directory
- Include secure links for bank info submission
- Log all notification attempts in `audit_trail` JSONB
- Retry failed emails up to 3 times

### 7. Membership Manager Service

**Purpose**: Manage winner membership lifecycle after payout

**Interface**:
```typescript
interface MembershipManager {
  scheduleMembershipRemoval(userId: string, payoutDate: Date): Promise<void>
  checkMembershipRemovals(): Promise<RemovalResult[]>
  removeMembership(userId: string): Promise<void>
  reactivateMembership(userId: string, newPaymentDate: Date): Promise<void>
  getMembershipStatus(userId: string): Promise<MembershipStatus>
}

interface RemovalResult {
  userId: string
  payoutDate: Date
  removalDate: Date
  removed: boolean
  reason?: string
}

interface MembershipStatus {
  userId: string
  hasReceivedPayout: boolean
  payoutDate?: Date
  scheduledRemovalDate?: Date
  isActive: boolean
  canReactivate: boolean
}
```

**Implementation Details**:
- When payout completed, calculate removal date: `payoutDate + 12 months`
- Store removal date in `payout_management.processing` JSONB:
  ```json
  {
    "membership_removal_scheduled": "2025-11-07T00:00:00Z",
    "removal_reason": "12 months after payout"
  }
  ```
- Daily cron job checks for memberships to remove:
  ```sql
  SELECT user_id FROM payout_management 
  WHERE status = 'completed' 
  AND (processing->>'membership_removal_scheduled')::timestamp <= NOW()
  AND (processing->>'membership_removed')::boolean IS NOT TRUE
  ```
- Remove membership by canceling subscription via subscription service API
- If member makes new payment after removal, subscription service triggers reactivation
- Reactivation adds member back to queue with new `tenure_start_date` (new payment date)
- View automatically recalculates queue position based on new tenure

### 8. Audit Logger Service

**Purpose**: Maintain comprehensive audit trail for all payout operations

**Interface**:
```typescript
interface AuditLogger {
  logPayoutCreated(payoutId: string, details: any): Promise<void>
  logApprovalDecision(payoutId: string, adminId: number, decision: any): Promise<void>
  logPaymentProcessed(payoutId: string, details: any): Promise<void>
  logError(operation: string, error: Error, context: any): Promise<void>
  queryAuditLog(filters: AuditFilters): Promise<AuditEntry[]>
}

interface AuditEntry {
  id: string
  userId?: string
  adminId?: number
  entityType: string
  entityId: string
  action: string
  oldValues?: any
  newValues?: any
  success: boolean
  errorMessage?: string
  metadata: any
  createdAt: Date
}
```

**Implementation Details**:
- Insert into `user_audit_logs` table for all operations
- Entity types: 'payout', 'approval', 'payment', 'tax_form'
- Actions: 'created', 'approved', 'rejected', 'sent', 'completed', 'failed'
- Store full context in `metadata` JSONB field
- Include IP address and user agent when available

## Data Models

### Payout Management Record

```typescript
interface PayoutManagementRecord {
  id: string                    // UUID primary key
  payoutId: string              // Unique payout identifier
  userId: string                // UUID reference to user
  queuePosition: number         // Position at time of selection
  amount: number                // 100000.00 (gross amount)
  currency: string              // 'USD'
  status: PayoutStatus          // Current status
  retentionFee: number          // 300.00 (deducted for next year)
  netAmount: number             // 99700.00 (or less if tax withheld)
  membershipRemovalDate: Date   // 12 months after payout
  eligibilityCheck: {           // Snapshot of eligibility data
    totalRevenue: number
    companyAgeMonths: number
    queuePosition: number
    tenureStartDate: string
    totalPayments: number
    lifetimeTotal: number
    selectionCriteria: string
    timestamp: string
  }
  approvalWorkflow: Array<{     // Approval history
    adminId: number
    decision: 'approved' | 'rejected'
    reason?: string
    timestamp: string
  }>
  scheduledDate?: Date          // Expected arrival date
  paymentMethod: 'ach' | 'check'
  bankDetails?: {               // Encrypted bank info
    accountHolderName: string
    routingNumber: string
    accountNumber: string
    accountType: 'checking' | 'savings'
    encrypted: boolean
  }
  taxWithholding?: {            // Tax withholding details
    withholdingRate: number
    withheldAmount: number
    netPayoutAmount: number
    reason: string
  }
  processing?: {                // Payment processing details
    sentDate?: string
    expectedArrivalDate?: string
    completedDate?: string
    trackingNumber?: string
    confirmationNumber?: string
    notes?: string
  }
  receiptUrl?: string           // PDF receipt URL
  internalNotes: Array<{        // Admin notes
    adminId: number
    note: string
    timestamp: string
  }>
  auditTrail: Array<{           // Complete audit trail
    action: string
    actor: string
    timestamp: string
    details: any
  }>
  createdAt: Date
  updatedAt: Date
}

type PayoutStatus = 
  | 'pending_approval'
  | 'pending_bank_info'
  | 'pending_tax_info'
  | 'approved'
  | 'ready_for_payment'
  | 'payment_sent'
  | 'completed'
  | 'payment_failed'
  | 'rejected'
  | 'cancelled'
  | 'requires_manual_review'
```

### Active Member Queue View (Read-Only)

```typescript
interface ActiveMemberQueueView {
  userId: string
  email: string
  userCreatedAt: Date
  firstName: string | null
  lastName: string | null
  middleName: string | null
  fullName: string | null
  subscriptionId: string
  subscriptionStatus: string
  providerSubscriptionId: string | null
  tenureStartDate: Date          // MIN(payment.created_at)
  lastPaymentDate: Date          // MAX(payment.created_at)
  totalSuccessfulPayments: number
  lifetimePaymentTotal: number
  hasReceivedPayout: boolean     // EXISTS check on payout_management
  queuePosition: number          // ROW_NUMBER() calculated
  isEligible: boolean            // subscription_status = 'active'
  meetsTimeRequirement: boolean  // >= 12 payments
  calculatedAt: Date
}
```

## Error Handling

### Error Categories

1. **Validation Errors** (400)
   - Invalid payout ID
   - Missing required fields
   - Invalid bank details format

2. **Authorization Errors** (401/403)
   - Invalid JWT token
   - Insufficient permissions
   - Expired session

3. **Business Logic Errors** (422)
   - Eligibility conditions not met
   - Winner already received payout
   - KYC not verified
   - Missing W-9 form

4. **System Errors** (500)
   - Database connection failure
   - Email service unavailable
   - PDF generation failure

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    requestId: string
  }
}
```

### Retry Strategy

- **Database Operations**: Retry 3 times with exponential backoff (1s, 2s, 4s)
- **Email Notifications**: Retry 3 times with 5-minute intervals
- **PDF Generation**: Retry 2 times immediately
- **External API Calls**: Circuit breaker pattern (5 failures → 30s cooldown)

## Testing Strategy

### Unit Tests

- Test each service class independently
- Mock database queries using Drizzle mock
- Mock external dependencies (email, PDF generation)
- Target: 80%+ code coverage

**Example Test Cases**:
```typescript
describe('EligibilityChecker', () => {
  it('should return eligible when revenue >= 100K and age >= 12 months')
  it('should return not eligible when revenue < 100K')
  it('should calculate correct number of potential winners')
  it('should handle database errors gracefully')
})

describe('WinnerSelector', () => {
  it('should select winners in correct queue order')
  it('should exclude members who already received payouts')
  it('should validate KYC status for each winner')
  it('should handle tie-breaking by user_id')
})
```

### Integration Tests

- Test complete payout workflow end-to-end
- Use test database with sample data
- Test approval workflow with multiple admins
- Test payment processing state transitions

**Example Test Scenarios**:
```typescript
describe('Payout Workflow Integration', () => {
  it('should complete full payout workflow from eligibility to completion')
  it('should handle rejection in approval workflow')
  it('should apply backup withholding when W-9 missing')
  it('should generate correct 1099-MISC forms')
})
```

### API Tests

- Test all REST endpoints
- Test authentication and authorization
- Test rate limiting
- Test error responses

**Example API Tests**:
```typescript
describe('POST /api/payouts/approve', () => {
  it('should approve payout with valid admin token')
  it('should reject with invalid token')
  it('should require 2 approvals for $100K+ payouts')
  it('should return 404 for non-existent payout')
})
```

### Performance Tests

- Load test eligibility checker with 10K+ members
- Test queue view query performance
- Test concurrent approval requests
- Target: < 500ms response time for 95th percentile

## Security Considerations

### Authentication & Authorization

- JWT tokens validated on every request
- Role-based access control (RBAC):
  - `admin`: Full access to all operations
  - `finance_manager`: Approve payouts, mark payments sent/completed
  - `viewer`: Read-only access to payout data
- Member access: Can only view their own payout records

### Data Encryption

- Bank account details encrypted at rest using AES-256
- Encryption key stored in environment variable (AWS KMS recommended)
- TLS 1.3 for all API communications
- Sensitive data never logged (account numbers, SSNs)

### Rate Limiting

- 100 requests per 15 minutes per user
- 1000 requests per 15 minutes per admin
- Stricter limits on approval endpoints (10 per minute)

### Audit Trail

- All operations logged to `user_audit_logs`
- Include IP address, user agent, timestamp
- Immutable audit records (no updates/deletes)
- Retention: 7 years for compliance

### Input Validation

- Validate all inputs using Zod schemas
- Sanitize user-provided data
- Prevent SQL injection via parameterized queries (Drizzle ORM)
- Prevent XSS in email templates

## Monitoring and Observability

### Health Checks

```typescript
GET /health
Response: {
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  checks: {
    database: 'up' | 'down',
    email: 'up' | 'down',
    scheduler: 'running' | 'stopped'
  }
}

GET /ready
Response: {
  ready: boolean,
  services: {
    database: boolean,
    migrations: boolean
  }
}
```

### Logging

- Structured JSON logs using Winston
- Log levels: ERROR, WARN, INFO, DEBUG
- Include correlation IDs for request tracing
- Sensitive data redacted from logs

### Alerts

- **Critical**: Database connection failure, eligibility check failure
- **Warning**: Payment processing delay > 5 days, approval pending > 3 days
- **Info**: New payout created, payment completed

## Deployment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=7d

# Business Rules
BUSINESS_LAUNCH_DATE=2024-01-01
PAYOUT_THRESHOLD=100000
REWARD_PER_WINNER=100000

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=payouts@yourdomain.com

# Encryption
ENCRYPTION_KEY=your-encryption-key

# Monitoring
PORT=3002
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "start"]
```

### Database Migrations

- Use Drizzle Kit for schema migrations
- Run migrations on startup: `npm run migrate`
- Rollback capability for failed deployments

### Scaling Considerations

- Stateless service design (horizontal scaling)
- Use Redis for distributed locks (prevent duplicate eligibility checks)
- Queue-based processing for high-volume operations
- Read replicas for reporting queries

## API Endpoints

### Payout Management

```
GET    /api/payouts                         # List all payouts (admin only)
GET    /api/payouts/:id                     # Get payout details
GET    /api/payouts/eligibility             # Get current eligibility status (admin only)
POST   /api/payouts/check-eligibility       # Manually trigger eligibility check (admin only)
GET    /api/payouts/eligible-members        # Get list of eligible members for payout (admin only)
POST   /api/payouts/initiate                # Admin initiates payout for selected winners (admin only)
POST   /api/payouts/:id/approve             # Approve payout (admin only)
POST   /api/payouts/:id/reject              # Reject payout (admin only)
POST   /api/payouts/:id/generate-instructions  # Generate payment instructions (admin only)
POST   /api/payouts/:id/mark-sent           # Mark payment as sent (finance only)
POST   /api/payouts/:id/confirm             # Confirm payment completion (finance only)
GET    /api/payouts/:id/receipt             # Download receipt PDF
```

### Member Endpoints

```
GET    /api/members/:userId/payout     # Get member's payout status
POST   /api/members/:userId/bank-info  # Submit bank details
POST   /api/members/:userId/tax-info   # Submit W-9 information
```

### Reporting

```
GET    /api/reports/payouts            # Payout summary report
GET    /api/reports/tax-forms/:year    # Generate 1099-MISC forms for year
GET    /api/reports/audit-log          # Query audit log
```

### Health & Monitoring

```
GET    /health                         # Health check
GET    /ready                          # Readiness check
```

## Dependencies

### Core Dependencies

```json
{
  "express": "^4.18.0",
  "drizzle-orm": "^0.29.0",
  "postgres": "^3.4.0",
  "zod": "^3.22.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "winston": "^3.11.0",
  "node-cron": "^3.0.0",
  "nodemailer": "^6.9.0",
  "pdfkit": "^0.13.0",
  "dotenv": "^16.3.0"
}
```

### Dev Dependencies

```json
{
  "typescript": "^5.3.0",
  "@types/node": "^20.10.0",
  "@types/express": "^4.17.0",
  "vitest": "^1.0.0",
  "drizzle-kit": "^0.20.0",
  "tsx": "^4.7.0"
}
```

## Future Enhancements

1. **Automated ACH Processing**: Integrate with Stripe Connect or Plaid for automated ACH transfers
2. **Multi-Currency Support**: Support payouts in currencies other than USD
3. **Partial Payouts**: Allow splitting payouts across multiple payment methods
4. **Recurring Payouts**: Support for annual or quarterly payout schedules
5. **Member Portal**: Self-service portal for members to manage bank info and view payout history
6. **Advanced Reporting**: Business intelligence dashboard with payout analytics
7. **Webhook Support**: Notify external systems of payout events
8. **Batch Processing**: Process multiple payouts in a single batch for efficiency
