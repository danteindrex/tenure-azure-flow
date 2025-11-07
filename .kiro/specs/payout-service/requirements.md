# Requirements Document - Payout Service Microservice

## Introduction

The Payout Service is a critical microservice responsible for managing the automated distribution of $100,000 rewards to eligible members based on company revenue milestones and member tenure. This service will handle eligibility verification, winner selection, physical payment processing (via ACH transfer or check), tax compliance, and audit trail management. The service must integrate with existing Drizzle ORM schemas and the active member queue view.

**Important Note:** Payouts are processed physically through direct bank transfers (ACH) or checks, NOT through Stripe. The service tracks payment status and manages the approval workflow, but actual fund disbursement is handled manually by the finance team or through a separate banking integration.

## Requirements

### Requirement 1: Payout Eligibility Detection and Admin Notification

**User Story:** As a system administrator, I want the payout service to automatically detect when payout conditions are met and notify me, so that I can review and manually initiate payouts for eligible members.

#### Acceptance Criteria

1. WHEN the system checks payout eligibility THEN it SHALL verify that total company revenue from `user_payments` table is >= $100,000
2. WHEN the system checks payout eligibility THEN it SHALL verify that the company has been in operation for >= 12 months from the `BUSINESS_LAUNCH_DATE`
3. WHEN both revenue and time conditions are met THEN the system SHALL calculate the number of potential winners as `Math.floor(totalRevenue / 100000)`
4. WHEN eligibility is checked THEN the system SHALL query the `active_member_queue_view` to get eligible members where `is_eligible = true` AND `has_received_payout = false`
5. WHEN eligibility conditions ARE met THEN the system SHALL create an alert in the `admin_alerts` table with severity 'info', category 'payout_eligible', and details about eligible members
6. WHEN eligibility conditions ARE met THEN the system SHALL send an email notification to all administrators with role 'admin' or 'finance_manager'
7. WHEN eligibility conditions are not met THEN the system SHALL log the current status and schedule the next check
8. WHEN eligibility is checked THEN the system SHALL store the check results in an audit log with timestamp, revenue amount, eligible member count, and decision
9. WHEN an admin views the dashboard THEN the system SHALL display the current eligibility status and list of eligible members if conditions are met

### Requirement 2: Admin-Initiated Winner Selection

**User Story:** As a system administrator, I want to review eligible members and manually initiate payout creation, so that I have full control over who receives payouts and when.

#### Acceptance Criteria

1. WHEN an admin requests eligible members THEN the system SHALL query `active_member_queue_view` ordered by `queue_position ASC`
2. WHEN querying eligible members THEN the system SHALL filter members where `is_eligible = true` AND `has_received_payout = false` AND `subscription_status IN ('active', 'trialing')`
3. WHEN displaying eligible members THEN the system SHALL show them ordered by longest tenure using `last_payment_date` (oldest first)
4. IF there is a tie in `last_payment_date` THEN the system SHALL use `user_id ASC` as the tiebreaker
5. WHEN displaying eligible members THEN the system SHALL show only the top N members where N = `Math.floor(totalRevenue / 100000)`
6. WHEN an admin clicks "Initiate Payout" THEN the system SHALL display a confirmation dialog showing the selected winners and total payout amount
7. WHEN an admin confirms payout initiation THEN the system SHALL validate that each winner has completed KYC verification by checking `kyc_verification` table where `status = 'verified'`
8. WHEN KYC validation passes THEN the system SHALL create `payout_management` records for each winner with status `pending_approval`
9. WHEN payout records are created THEN the system SHALL create a snapshot of eligibility data including queue position, tenure start date, total payments, and lifetime payment total in the `eligibility_check` JSONB field
10. WHEN payout records are created THEN the system SHALL send a confirmation notification to the admin and log the action in the audit trail

### Requirement 3: Payout Record Creation

**User Story:** As a compliance officer, I want all payout decisions to be recorded in the database, so that we have a complete audit trail for financial and legal purposes.

#### Acceptance Criteria

1. WHEN a winner is selected THEN the system SHALL create a record in the `payout_management` table with a unique `payout_id`
2. WHEN creating a payout record THEN the system SHALL set `amount = 100000.00` and `currency = 'USD'`
3. WHEN creating a payout record THEN the system SHALL set `status = 'pending_approval'` initially
4. WHEN creating a payout record THEN the system SHALL store the complete eligibility check data in the `eligibility_check` JSONB field including revenue snapshot, queue position, tenure data, and selection criteria
5. WHEN creating a payout record THEN the system SHALL initialize the `approval_workflow` JSONB array with the first approval step
6. WHEN creating a payout record THEN the system SHALL store the winner's queue position from `active_member_queue_view` in the `queue_position` field
7. WHEN creating a payout record THEN the system SHALL initialize the `audit_trail` JSONB array with the creation event including timestamp, actor, and action

### Requirement 4: Payment Method Validation

**User Story:** As a member, I want to provide my bank account details for receiving payouts, so that I can receive my reward via ACH transfer.

#### Acceptance Criteria

1. WHEN a member is selected as a winner THEN the system SHALL verify that the member has valid bank details stored in the `bank_details` JSONB field of `payout_management`
2. WHEN bank details are missing THEN the system SHALL set payout status to `pending_bank_info` and send a notification to the member
3. WHEN bank details are provided THEN the system SHALL validate that they include `account_holder_name`, `routing_number`, `account_number`, and `account_type` (checking/savings)
4. WHEN bank details are validated THEN the system SHALL verify the routing number format (9 digits) and account number format
5. WHEN payment method is set to 'ach' THEN the system SHALL store the bank details in encrypted format in the `bank_details` JSONB field
6. WHEN payment method is set to 'check' THEN the system SHALL retrieve the member's primary address from `user_addresses` table where `is_primary = true` using columns `street_address`, `address_line_2`, `city`, `state`, `postal_code`, `country_code`
7. WHEN payment method validation fails THEN the system SHALL log the error and notify the member with specific instructions

### Requirement 5: Tax Compliance and Withholding

**User Story:** As a compliance officer, I want the system to handle tax withholding and 1099 form generation, so that we comply with IRS regulations.

#### Acceptance Criteria

1. WHEN a payout is approved THEN the system SHALL check if the member has a W-9 form on file in the `tax_forms` table where `form_type = 'W-9'` AND `status = 'approved'`
2. WHEN W-9 is missing THEN the system SHALL set payout status to `pending_tax_info` and send a notification to the member
3. WHEN calculating payout amount THEN the system SHALL apply backup withholding (24%) IF the member has not provided a valid TIN
4. WHEN calculating payout amount THEN the system SHALL store withholding details in the `tax_withholding` JSONB field including `withholding_rate`, `withheld_amount`, and `net_payout_amount`
5. WHEN a payout is completed THEN the system SHALL create a 1099-MISC record in the `tax_forms` table for the tax year
6. WHEN creating a 1099-MISC THEN the system SHALL populate `income_details` with payout amount in box 3 (Other Income)
7. WHEN the tax year ends THEN the system SHALL generate and file 1099-MISC forms for all members who received payouts >= $600 in that year

### Requirement 6: Approval Workflow

**User Story:** As a system administrator, I want payouts to require multi-level approval, so that large payments are properly authorized before processing.

#### Acceptance Criteria

1. WHEN a payout record is created THEN the system SHALL initialize an approval workflow with status `pending_approval`
2. WHEN the payout amount is >= $100,000 THEN the system SHALL require approval from at least 2 authorized administrators
3. WHEN an administrator reviews a payout THEN the system SHALL record their decision (approve/reject) in the `approval_workflow` JSONB array with timestamp and reason
4. WHEN all required approvals are obtained THEN the system SHALL update the payout status to `approved` and schedule for processing
5. WHEN any approval is rejected THEN the system SHALL update the payout status to `rejected` and record the rejection reason
6. WHEN a payout is rejected THEN the system SHALL send notifications to relevant stakeholders and log the decision in the audit trail
7. WHEN approval workflow is complete THEN the system SHALL update the `approval_workflow` JSONB field with final status and all approver details

### Requirement 7: Physical Payment Processing with Retention Fee

**User Story:** As a finance manager, I want to track and manage physical payout processing with automatic retention fee deduction, so that I can ensure members receive their net rewards and their next year is covered.

#### Acceptance Criteria

1. WHEN calculating payout amount THEN the system SHALL deduct $300 retention fee from the $100,000 gross payout resulting in $99,700 net payout (before tax withholding)
2. WHEN a payout is approved THEN the system SHALL update the status to `ready_for_payment` and prepare payment instructions with net amount
3. WHEN payment method is 'ach' THEN the system SHALL generate a payment instruction document with bank details and net amount for the finance team to process
4. WHEN payment method is 'check' THEN the system SHALL generate a check request with member's mailing address from `user_addresses` table and net amount
5. WHEN payment instructions are generated THEN the system SHALL store the breakdown in the `processing` JSONB field including gross amount ($100,000), retention fee ($300), tax withholding (if applicable), and net amount
6. WHEN a finance manager marks payment as sent THEN the system SHALL update the status to `payment_sent` and set the `scheduled_date` to the expected arrival date
7. WHEN a finance manager confirms payment completion THEN the system SHALL update the status to `completed` and store the completion timestamp
8. WHEN a payment is marked as completed THEN the system SHALL generate a receipt PDF showing the retention fee deduction and store the URL in the `receipt_url` field
9. WHEN a payment fails or is returned THEN the system SHALL update the status to `payment_failed`, log the error in the `processing` JSONB field, and notify administrators
10. WHEN a payment requires correction THEN the system SHALL update the status to `requires_manual_review` and allow finance team to update bank details or payment method

### Requirement 8: Queue Management After Payout

**User Story:** As a system administrator, I want members who receive payouts to be properly managed in the queue, so that they don't receive duplicate payouts and the queue remains accurate.

#### Acceptance Criteria

1. WHEN a payout is completed THEN the system SHALL create a record in `payout_management` table with `status = 'completed'` for the winner
2. WHEN a payout record has `status = 'completed'` THEN the `active_member_queue_view` SHALL automatically exclude the member from future winner selections via the EXISTS check on `payout_management`
3. WHEN a member receives a payout THEN the system SHALL store all payout details in the `payout_management` table including `user_id`, `queue_position`, `amount`, `currency`, `eligibility_check`, `approval_workflow`, `scheduled_date`, `payment_method`, `bank_details`, `tax_withholding`, `processing`, `receipt_url`, `internal_notes`, and `audit_trail`
4. WHEN the queue is queried after payout THEN the system SHALL verify that remaining members' positions are recalculated automatically by the view based on `tenure_start_date` (MIN of payment created_at)
5. WHEN a member receives a payout THEN the system SHALL create an entry in `user_audit_logs` recording the payout event with action type, timestamp, and details
6. WHEN multiple winners receive payouts in the same round THEN the system SHALL process them in a transaction to ensure data consistency
7. WHEN querying the queue THEN the system SHALL use the `active_member_queue_view` which automatically calculates positions using ROW_NUMBER() OVER (ORDER BY MIN(p.created_at) ASC, u.id ASC)

### Requirement 9: Notification System

**User Story:** As a member, I want to receive notifications about my payout status, so that I stay informed throughout the process.

#### Acceptance Criteria

1. WHEN a member is selected as a winner THEN the system SHALL send an email notification with congratulations and next steps
2. WHEN bank information is required THEN the system SHALL send an email with a secure link to provide banking details
3. WHEN tax information is required THEN the system SHALL send an email with instructions to complete W-9 form
4. WHEN a payout is approved THEN the system SHALL send an email notification with expected arrival date
5. WHEN a payout is completed THEN the system SHALL send an email with receipt and confirmation details
6. WHEN a payout fails THEN the system SHALL send an email notification with error details and support contact information
7. WHEN sending notifications THEN the system SHALL log all notification attempts in the `audit_trail` JSONB field

### Requirement 10: Monitoring and Reporting

**User Story:** As a system administrator, I want comprehensive monitoring and reporting capabilities, so that I can track payout operations and identify issues quickly.

#### Acceptance Criteria

1. WHEN the service starts THEN it SHALL expose health check endpoints at `/health` and `/ready`
2. WHEN processing payouts THEN the system SHALL emit metrics including payout count, success rate, failure rate, and processing time
3. WHEN errors occur THEN the system SHALL log detailed error information including stack traces, context, and affected user IDs
4. WHEN a payout round completes THEN the system SHALL generate a summary report including total amount paid, number of winners, and any issues encountered
5. WHEN queried THEN the system SHALL provide API endpoints to retrieve payout statistics including total payouts, pending approvals, and failed payments
6. WHEN monitoring payout status THEN the system SHALL provide a dashboard showing current payout round, eligible members, and approval status
7. WHEN compliance reports are needed THEN the system SHALL provide endpoints to export payout data in CSV format for accounting and tax purposes

### Requirement 11: Security and Access Control

**User Story:** As a security officer, I want the payout service to implement proper authentication and authorization, so that sensitive financial operations are protected.

#### Acceptance Criteria

1. WHEN accessing payout endpoints THEN the system SHALL require valid JWT authentication tokens
2. WHEN performing administrative actions THEN the system SHALL verify that the user has `admin` or `finance_manager` role
3. WHEN accessing member payout data THEN the system SHALL verify that the requester is either the member themselves or an authorized administrator
4. WHEN storing sensitive data THEN the system SHALL encrypt bank account details and tax information at rest
5. WHEN transmitting sensitive data THEN the system SHALL use TLS 1.3 or higher for all API communications
6. WHEN logging operations THEN the system SHALL NOT log sensitive information such as full bank account numbers or SSNs
7. WHEN rate limiting is applied THEN the system SHALL limit payout-related API calls to prevent abuse (e.g., 100 requests per 15 minutes per user)

### Requirement 12: Membership Management After Payout

**User Story:** As a system administrator, I want winners to be automatically removed from active membership 12 months after receiving their payout, so that they don't continue paying monthly fees indefinitely, but can rejoin if they choose to pay again.

#### Acceptance Criteria

1. WHEN a payout is completed THEN the system SHALL calculate the membership removal date as 12 months after the payout date
2. WHEN calculating removal date THEN the system SHALL store it in the `processing` JSONB field of `payout_management` with key `membership_removal_scheduled`
3. WHEN the daily membership removal job runs THEN the system SHALL query all payouts where `membership_removal_scheduled` date has passed and `membership_removed` is not true
4. WHEN a membership removal is due THEN the system SHALL call the subscription service API to cancel the member's subscription
5. WHEN a subscription is canceled THEN the system SHALL update the `processing` JSONB field setting `membership_removed = true` and `membership_removed_at` to the current timestamp
6. WHEN a canceled member makes a new payment THEN the subscription service SHALL notify the payout service to reactivate their membership
7. WHEN reactivating a membership THEN the system SHALL allow the member to re-enter the queue with a new `tenure_start_date` based on their new payment date
8. WHEN a member re-enters the queue THEN the `active_member_queue_view` SHALL automatically calculate their new queue position based on the new tenure start date
9. WHEN a member is removed from membership THEN the system SHALL send an email notification explaining the removal and option to rejoin
10. WHEN a member rejoins after removal THEN the system SHALL send a welcome back email and confirm their new queue position

### Requirement 13: Disaster Recovery and Idempotency

**User Story:** As a system administrator, I want the payout service to handle failures gracefully, so that no duplicate payments are made and all operations can be safely retried.

#### Acceptance Criteria

1. WHEN processing a payout THEN the system SHALL use the `payout_id` as an idempotency key to prevent duplicate payments
2. WHEN a payment request is retried THEN the system SHALL check if a payment with the same `payout_id` already exists and return the existing result
3. WHEN the service crashes during processing THEN the system SHALL be able to resume from the last known state without data loss
4. WHEN database transactions are used THEN the system SHALL ensure atomicity for all payout-related operations
5. WHEN external API calls fail THEN the system SHALL implement circuit breaker pattern to prevent cascading failures
6. WHEN data inconsistencies are detected THEN the system SHALL log the issue and trigger an alert for manual review
7. WHEN recovering from failure THEN the system SHALL verify data integrity by comparing `payout_management` records with actual payment provider transactions
