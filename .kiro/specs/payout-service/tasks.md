# Implementation Plan - Payout Service Microservice

## Overview

This implementation plan breaks down the payout service development into discrete, manageable tasks. Each task builds incrementally on previous work, following test-driven development practices where appropriate. The service will be built as a standalone Express.js microservice using TypeScript, Drizzle ORM, and Better Auth for session management.

## Implementation Tasks

- [x] 1. Set up project structure and core dependencies
  - Create new service directory at `services/payout-service/`
  - Initialize Node.js project with TypeScript configuration
  - Install core dependencies: express, drizzle-orm, postgres, zod, better-auth, dotenv, node-cron, winston, nodemailer, pdfkit
  - Set up folder structure: src/{controllers, services, models, middleware, routes, types, utils, config}, drizzle/schema/
  - Copy all Drizzle schema files from `../../drizzle/schema/` to `drizzle/schema/` in payout service
  - Create tsconfig.json with strict mode enabled
  - Set up package.json scripts for dev, build, start, and test
  - _Requirements: Project Setup_

- [x] 2. Configure database connection and Drizzle ORM
  - [x] 2.1 Create database configuration module
    - Create `src/config/database.ts` to initialize PostgreSQL connection pool
    - Use same DATABASE_URL from main app's .env
    - Import Drizzle schemas from local `drizzle/schema/` directory
    - Create database client instance with proper error handling
    - Add connection health check function
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Set up Better Auth session management
    - Create `src/config/auth.ts` for Better Auth configuration
    - Configure Better Auth to use same database and session table as main app
    - Set up session validation middleware
    - Create auth helper functions for role checking (admin, finance_manager)
    - Add session refresh logic
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 3. Create core data models and types
  - [x] 3.1 Define TypeScript interfaces for payout domain
    - Create `src/types/payout.types.ts` with PayoutManagementRecord interface
    - Create `src/types/eligibility.types.ts` with EligibilityResult interface
    - Create `src/types/winner.types.ts` with Winner and ValidationResult interfaces
    - Create `src/types/approval.types.ts` with ApprovalWorkflow interfaces
    - Create `src/types/payment.types.ts` with PaymentInstructions and PayoutCalculation interfaces
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Create Zod validation schemas
    - Create `src/validators/payout.validators.ts` with Zod schemas for all API inputs
    - Add validation for bank details (routing number, account number formats)
    - Add validation for approval decisions
    - Add validation for payment status updates
    - _Requirements: 11.5_

- [x] 4. Implement Eligibility Checker Service
  - [x] 4.1 Create eligibility checker core logic
    - Create `src/services/eligibility-checker.service.ts`
    - Implement `getTotalRevenue()` method querying user_payments table
    - Implement `getCompanyAge()` method calculating months since BUSINESS_LAUNCH_DATE
    - Implement `calculatePotentialWinners()` method using Math.floor(revenue / 100000)
    - Implement `checkEligibility()` method combining all checks
    - Add unit tests for eligibility calculations
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.2 Implement admin notification on eligibility
    - Add method to create alert in `admin_alerts` table when eligible
    - Add method to query eligible member count from `active_member_queue_view`
    - Store eligibility check results in audit log
    - Add error handling and logging
    - _Requirements: 1.5, 1.6, 1.8_

- [x] 5. Implement Winner Selector Service
  - [x] 5.1 Create winner selection logic
    - muist be in the payout service
    `
    - Implement `getEligibleMembers()` method querying active_member_queue_view
    - Filter by is_eligible = true AND has_received_payout = false
    - Order by queue_position ASC
    - Limit to potential winner count
    - Add unit tests for winner selection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.2 Implement winner validation
    - Implement `validateWinner()` method checking KYC status
    - Query kyc_verification table for status = 'verified'
    - Verify subscription_status IN ('active', 'trialing')
    - Return ValidationResult with detailed error messages
    - Add unit tests for validation logic
    - _Requirements: 2.7_

  - [x] 5.3 Implement payout record creation
    - Implement `createPayoutRecords()` method
    - Generate unique payout_id for each winner
    - Create records in payout_management table with status 'pending_approval'
    - Store eligibility snapshot in eligibility_check JSONB field
    - Initialize approval_workflow and audit_trail arrays
    - Add transaction handling for atomicity
    - _Requirements: 2.8, 2.9, 2.10, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 6. Implement Approval Manager Service
  - [x] 6.1 Create approval workflow logic
    - Create `src/services/approval-manager.service.ts`
    - Implement `initializeApproval()` method setting up workflow
    - Implement `requiresApproval()` method checking amount threshold
    - Determine required approval count (2 for >= $100K)
    - Store workflow in approval_workflow JSONB array
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 Implement approval submission
    - Implement `submitApproval()` method recording admin decisions
    - Validate admin has permission to approve
    - Record approval/rejection with timestamp and reason in approval_workflow
    - Update approval_workflow JSONB array
    - Check if all required approvals obtained
    - _Requirements: 6.3, 6.7_

  - [x] 6.3 Implement approval status checking
    - Implement `checkApprovalStatus()` method
    - Count current approvals vs required
    - Return pending approvers list
    - Update payout status to 'approved' when complete
    - Update payout status to 'rejected' if any rejection
    - Send notifications to stakeholders
    - _Requirements: 6.4, 6.5, 6.6_

- [x] 7. Implement Payment Processor Service
  - [x] 7.1 Create payout calculation logic
    - Create `src/services/payment-processor.service.ts`
    - Implement `calculateNetPayout()` method
    - Deduct $300 retention fee from $100,000 gross amount
    - Calculate tax withholding if no W-9 (24%)
    - Return PayoutCalculation with breakdown
    - Store breakdown in processing JSONB field
    - _Requirements: 7.1, 7.5_

  - [x] 7.2 Implement payment instructions generation
    - Implement `generatePaymentInstructions()` method
    - For ACH: retrieve encrypted bank details from bank_details JSONB
    - For check: query user_addresses table WHERE is_primary = true
    - Generate PDF using PDFKit with payment details and net amount
    - Store PDF URL in processing JSONB field
    - Return PaymentInstructions object
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 7.3 Implement payment status tracking
    - Implement `markPaymentSent()` method updating status to 'payment_sent'
    - Store sent date and expected arrival date in processing JSONB
    - Implement `confirmPaymentComplete()` method updating status to 'completed'
    - Store completion timestamp
    - Implement `handlePaymentFailure()` method for failed payments
    - Update status to 'payment_failed' and log error
    - _Requirements: 7.6, 7.7, 7.8, 7.9_

  - [x] 7.4 Implement receipt generation
    - Implement `generateReceipt()` method creating PDF receipt
    - Include gross amount, retention fee deduction, tax withholding, net amount
    - Show payment method and recipient details
    - Store receipt URL in receipt_url field
    - Return receipt URL
    - _Requirements: 7.8, 7.10_

- [ ] 8. Implement Tax Compliance Service
  - [ ] 8.1 Create W-9 status checking
    - Create `src/services/tax-compliance.service.ts`
    - Implement `checkW9Status()` method querying tax_forms table
    - Filter by form_type = 'W-9' AND status = 'approved'
    - Return W9Status with hasW9, isApproved, tinProvided flags
    - _Requirements: 5.1_

  - [ ] 8.2 Implement withholding calculation
    - Implement `calculateWithholding()` method
    - Apply 24% backup withholding if no valid W-9
    - Calculate withheld amount and net amount
    - Store details in tax_withholding JSONB field
    - Return WithholdingCalculation object
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ] 8.3 Implement 1099-MISC generation
    - Implement `create1099MISC()` method
    - Create record in tax_forms table with form_type = '1099-MISC'
    - Populate income_details JSONB with box 3 (Other Income)
    - Include federal tax withheld if applicable
    - Set status to 'pending'
    - _Requirements: 5.5, 5.6_

  - [ ] 8.4 Implement year-end 1099 batch generation
    - Implement `generateYearEnd1099s()` method
    - Query all completed payouts for tax year
    - Filter payouts >= $600
    - Generate 1099-MISC for each
    - Return array of TaxForm objects
    - _Requirements: 5.7_

- [x] 9. Implement Membership Manager Service
  - [x] 9.1 Create membership removal scheduling
    - Create `src/services/membership-manager.service.ts`
    - Implement `scheduleMembershipRemoval()` method
    - Calculate removal date as payout date + 12 months
    - Store removal date in processing JSONB field with key 'membership_removal_scheduled'
    - _Requirements: 12.1, 12.2_

  - [x] 9.2 Implement membership removal checking
    - Implement `checkMembershipRemovals()` method
    - Query payout_management for due removals
    - Filter where membership_removal_scheduled <= NOW() AND membership_removed != true
    - Return array of RemovalResult objects
    - _Requirements: 12.3_

  - [x] 9.3 Implement membership removal execution
    - Implement `removeMembership()` method
    - Call subscription service API to cancel subscription
    - Update processing JSONB setting membership_removed = true
    - Store membership_removed_at timestamp
    - Send notification email to member
    - _Requirements: 12.4, 12.5, 12.9_

  - [x] 9.4 Implement membership reactivation
    - Implement `reactivateMembership()` method
    - Allow member to re-enter queue with new tenure_start_date
    - View automatically recalculates queue position
    - Send welcome back email
    - _Requirements: 12.6, 12.7, 12.8, 12.10_

- [-] 10. Implement Notification Service
  - [x] 10.1 Set up email infrastructure
    - Create `src/services/notification.service.ts`
    - Configure Nodemailer or SendGrid
    - Create email templates directory `src/templates/`
    - Set up template rendering engine
    - _Requirements: 9.1-9.7_

  - [ ] 10.2 Create notification methods
    - Implement `sendWinnerNotification()` method
    - Implement `sendBankInfoRequest()` method with secure link
    - Implement `sendTaxInfoRequest()` method with W-9 instructions
    - Implement `sendApprovalRequest()` method to admins
    - Implement `sendPaymentConfirmation()` method with receipt
    - Implement `sendPaymentFailure()` method with error details
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 10.3 Implement notification logging
    - Log all notification attempts in audit_trail JSONB
    - Implement retry logic for failed emails (3 attempts, 5-minute intervals)
    - Store delivery status
    - _Requirements: 9.7_

- [ ] 11. Implement Audit Logger Service
  - [ ] 11.1 Create audit logging infrastructure
    - Create `src/services/audit-logger.service.ts`
    - Implement `logPayoutCreated()` method
    - Implement `logApprovalDecision()` method
    - Implement `logPaymentProcessed()` method
    - Implement `logError()` method
    - _Requirements: 8.5, 8.6_

  - [ ] 11.2 Implement audit log queries
    - Implement `queryAuditLog()` method with filters
    - Insert records into user_audit_logs table
    - Include entity_type, entity_id, action, old_values, new_values
    - Store metadata in metadata JSONB field
    - Include IP address and user agent when available
    - _Requirements: 8.5, 8.6_

- [ ] 12. Create REST API endpoints
  - [ ] 12.1 Set up Express server and middleware
    - Create `src/server.ts` with Express app initialization
    - Add body-parser middleware for JSON
    - Add CORS middleware with proper configuration
    - Add Better Auth session middleware
    - Add error handling middleware
    - Add request logging middleware
    - _Requirements: 11.1, 11.5_

  - [ ] 12.2 Create payout management endpoints
    - Create `src/routes/payout.routes.ts`
    - Implement GET /api/payouts (list all payouts, admin only)
    - Implement GET /api/payouts/:id (get payout details)
    - Implement GET /api/payouts/eligibility (check eligibility status, admin only)
    - Implement POST /api/payouts/check-eligibility (manual trigger, admin only)
    - Implement GET /api/payouts/eligible-members (list eligible members, admin only)
    - Implement POST /api/payouts/initiate (create payout records, admin only)
    - _Requirements: 1.9, 2.1-2.10_

  - [ ] 12.3 Create approval endpoints
    - Implement POST /api/payouts/:id/approve (approve payout, admin only)
    - Implement POST /api/payouts/:id/reject (reject payout, admin only)
    - Add role-based access control middleware
    - Validate admin has permission to approve
    - _Requirements: 6.1-6.7, 11.2_

  - [ ] 12.4 Create payment processing endpoints
    - Implement POST /api/payouts/:id/generate-instructions (admin only)
    - Implement POST /api/payouts/:id/mark-sent (finance manager only)
    - Implement POST /api/payouts/:id/confirm (finance manager only)
    - Implement GET /api/payouts/:id/receipt (download receipt PDF)
    - _Requirements: 7.1-7.10, 11.2_

  - [ ] 12.5 Create member endpoints
    - Create `src/routes/member.routes.ts`
    - Implement GET /api/members/:userId/payout (get member's payout status)
    - Implement POST /api/members/:userId/bank-info (submit bank details)
    - Implement POST /api/members/:userId/tax-info (submit W-9)
    - Add authentication to ensure member can only access their own data
    - _Requirements: 4.1-4.7, 5.1-5.7, 11.3_

  - [ ] 12.6 Create reporting endpoints
    - Create `src/routes/reports.routes.ts`
    - Implement GET /api/reports/payouts (payout summary report, admin only)
    - Implement GET /api/reports/tax-forms/:year (1099-MISC forms, admin only)
    - Implement GET /api/reports/audit-log (query audit log, admin only)
    - Add CSV export functionality
    - _Requirements: 10.5, 10.7_

- [ ] 13. Implement scheduled jobs
  - [ ] 13.1 Set up cron job infrastructure
    - Install node-cron dependency
    - Create `src/jobs/` directory
    - Create job scheduler in `src/jobs/scheduler.ts`
    - Add job status tracking
    - _Requirements: 1.1-1.9_

  - [ ] 13.2 Create eligibility check job
    - Create `src/jobs/eligibility-check.job.ts`
    - Schedule to run daily at 2 AM UTC
    - Call EligibilityChecker.checkEligibility()
    - Create admin alert if eligible
    - Log job execution results
    - _Requirements: 1.1-1.9_

  - [ ] 13.3 Create membership removal job
    - Create `src/jobs/membership-removal.job.ts`
    - Schedule to run daily at 3 AM UTC
    - Call MembershipManager.checkMembershipRemovals()
    - Process due removals
    - Log job execution results
    - _Requirements: 12.1-12.10_

- [ ] 14. Implement health checks and monitoring
  - [ ] 14.1 Create health check endpoints
    - Create `src/routes/health.routes.ts`
    - Implement GET /health endpoint checking database, email service, scheduler
    - Implement GET /ready endpoint checking migrations and database connection
    - Return proper HTTP status codes
    - _Requirements: 10.1_

  - [ ] 14.2 Set up structured logging
    - Install winston dependency
    - Create `src/utils/logger.ts`
    - Configure JSON log format
    - Add log levels: ERROR, WARN, INFO, DEBUG
    - Redact sensitive data from logs
    - Add correlation IDs for request tracing
    - _Requirements: 10.3, 11.6_

- [ ] 15. Implement security features
  - [ ] 15.1 Add rate limiting
    - Install express-rate-limit dependency
    - Create `src/middleware/rate-limit.middleware.ts`
    - Set 100 requests per 15 minutes per user
    - Set 1000 requests per 15 minutes per admin
    - Set 10 requests per minute for approval endpoints
    - _Requirements: 11.7_

  - [ ] 15.2 Implement data encryption
    - Create `src/utils/encryption.ts`
    - Implement AES-256 encryption for bank details
    - Store encryption key in environment variable
    - Add encryption/decryption helper functions
    - _Requirements: 11.4_

  - [ ] 15.3 Add input validation middleware
    - Create `src/middleware/validation.middleware.ts`
    - Use Zod schemas for request validation
    - Sanitize user inputs
    - Return 400 errors for invalid inputs
    - _Requirements: 11.5_

- [ ] 16. Write tests
  - [ ] 16.1 Set up testing infrastructure
    - Install vitest and testing dependencies
    - Create `tests/` directory structure
    - Set up test database configuration
    - Create test fixtures and factories
    - _Requirements: Testing Strategy_

  - [ ] 16.2 Write unit tests
    - Write tests for EligibilityChecker service
    - Write tests for WinnerSelector service
    - Write tests for ApprovalManager service
    - Write tests for PaymentProcessor service
    - Write tests for TaxCompliance service
    - Write tests for MembershipManager service
    - Target 80%+ code coverage
    - _Requirements: Testing Strategy_

  - [ ] 16.3 Write integration tests
    - Write end-to-end payout workflow test
    - Write approval workflow test with multiple admins
    - Write payment processing state transition tests
    - Write tax withholding and 1099 generation tests
    - _Requirements: Testing Strategy_

  - [ ] 16.4 Write API tests
    - Write tests for all REST endpoints
    - Write authentication and authorization tests
    - Write rate limiting tests
    - Write error response tests
    - _Requirements: Testing Strategy_

- [ ] 17. Create deployment configuration
  - [ ] 17.1 Create environment configuration
    - Create `.env.example` file with all required variables
    - Document each environment variable
    - Create `src/config/env.ts` for environment validation
    - Use Zod to validate environment variables on startup
    - _Requirements: Deployment_

  - [ ] 17.2 Create Docker configuration
    - Create `Dockerfile` for production build
    - Create `docker-compose.yml` for local development
    - Optimize Docker image size
    - Add health check to Docker container
    - _Requirements: Deployment_

  - [ ] 17.3 Create database migration scripts
    - Ensure payout_management table has all required columns
    - Add indexes for performance optimization
    - Create migration script for any schema changes
    - Test migrations on clean database
    - _Requirements: Deployment_

- [ ] 18. Documentation and final integration
  - [ ] 18.1 Write API documentation
    - Create OpenAPI/Swagger specification
    - Document all endpoints with request/response examples
    - Document authentication requirements
    - Document error codes and responses
    - _Requirements: API Endpoints_

  - [ ] 18.2 Write developer documentation
    - Create README.md with setup instructions
    - Document architecture and design decisions
    - Create troubleshooting guide
    - Document deployment process
    - _Requirements: Overview_

  - [ ] 18.3 Integration with main app
    - Update main app to call payout service endpoints
    - Add payout service URL to main app environment variables
    - Test end-to-end flow from main app
    - Verify Better Auth session sharing works correctly
    - _Requirements: Architecture_

## Notes

- Each task should be completed and tested before moving to the next
- Use TypeScript strict mode throughout
- Follow existing code style from main app and subscription service
- All database queries should use Drizzle ORM (no raw SQL except for views)
- All API endpoints should have proper error handling
- All sensitive operations should be logged to audit trail
- Use Better Auth for session management (not JWT tokens)
- Share database connection with main app
- Service runs on separate port (e.g., 3002)
- No UI implementation - only REST API endpoints
