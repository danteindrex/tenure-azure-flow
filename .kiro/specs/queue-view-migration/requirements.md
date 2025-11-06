# Queue View Migration - Requirements Document

## Introduction

This specification outlines the migration from a table-based queue system (`membership_queue` table) to a view-based queue system that dynamically calculates queue positions from existing user, subscription, and payment data. This eliminates the need for manual queue reorganization and provides a single source of truth.

## Requirements

### Requirement 1: Database View Creation

**User Story:** As a system architect, I want to replace the `membership_queue` table with a database view, so that queue positions are always accurate and automatically calculated.

#### Acceptance Criteria

1. WHEN the migration is complete THEN a database view named `active_member_queue_view` SHALL exist
2. WHEN querying the view THEN it SHALL return all active members ordered by tenure (first payment date)
3. WHEN a member's subscription status changes THEN the view SHALL automatically reflect the change without manual updates
4. WHEN calculating queue position THEN the system SHALL use `ROW_NUMBER()` ordered by first payment date ASC and user_id ASC
5. IF two members have the same first payment date THEN the system SHALL use user_id as a tie-breaker

### Requirement 2: Service Layer Updates

**User Story:** As a backend developer, I want all services to query the view instead of the table, so that the system uses the new architecture consistently.

#### Acceptance Criteria

1. WHEN the subscription service queries queue data THEN it SHALL use the `active_member_queue_view`
2. WHEN the tenure service queries queue data THEN it SHALL use the `active_member_queue_view`
3. WHEN the admin service queries queue data THEN it SHALL use the `active_member_queue_view`
4. WHEN the main API queries queue data THEN it SHALL use the `active_member_queue_view`
5. WHEN any service needs queue position THEN it SHALL NOT perform manual position calculations

### Requirement 3: Remove Queue Reorganization Logic

**User Story:** As a system maintainer, I want to remove all queue reorganization code, so that the codebase is simpler and less error-prone.

#### Acceptance Criteria

1. WHEN a user is removed from the system THEN no queue position updates SHALL be triggered
2. WHEN the `removeFromQueue()` function is called THEN it SHALL only update subscription status (not delete records)
3. WHEN a subscription is canceled THEN the member SHALL automatically be excluded from the view
4. WHEN reviewing the codebase THEN no manual `queue_position - 1` UPDATE queries SHALL exist
5. IF queue reorganization code exists THEN it SHALL be removed or deprecated

### Requirement 4: Drizzle Schema Updates

**User Story:** As a database administrator, I want the Drizzle schema to reflect the new view-based architecture, so that the ORM matches the database structure.

#### Acceptance Criteria

1. WHEN the Drizzle schema is updated THEN it SHALL include the view definition
2. WHEN the Drizzle schema is updated THEN the `membershipQueue` table definition SHALL be removed or marked as deprecated
3. WHEN generating migrations THEN Drizzle SHALL create the view
4. WHEN the schema is introspected THEN it SHALL recognize the view as a queryable entity
5. IF the old table is kept for backward compatibility THEN it SHALL be clearly documented as deprecated

### Requirement 5: Payout Management Integration

**User Story:** As a payout processor, I want the system to track paid winners separately, so that they don't appear in the active queue but history is preserved.

#### Acceptance Criteria

1. WHEN a member receives a payout THEN a record SHALL be created in `payout_management` table
2. WHEN a member receives a payout THEN they SHALL be excluded from `active_member_queue_view`
3. WHEN querying past winners THEN the system SHALL use the `payout_management` table
4. WHEN a member has `payout_management.status = 'completed'` THEN they SHALL NOT appear in the active queue
5. IF a member's subscription is canceled after payout THEN their payout record SHALL remain intact

### Requirement 6: API Endpoint Updates

**User Story:** As a frontend developer, I want all queue-related API endpoints to return consistent data from the view, so that the UI displays accurate information.

#### Acceptance Criteria

1. WHEN calling `/api/queue` THEN it SHALL query `active_member_queue_view`
2. WHEN calling `/api/queue/statistics` THEN it SHALL calculate stats from the view
3. WHEN calling `/api/queue/:userId` THEN it SHALL return the user's position from the view
4. WHEN the API returns queue data THEN it SHALL include calculated position, tenure date, and payment stats
5. IF the API previously returned `queue_position` from the table THEN it SHALL now return the calculated position from the view

### Requirement 7: Admin Service Updates

**User Story:** As an administrator, I want the admin panel to display queue data from the view, so that I see real-time accurate positions.

#### Acceptance Criteria

1. WHEN viewing the queue in the admin panel THEN it SHALL display data from `active_member_queue_view`
2. WHEN the admin panel shows queue statistics THEN they SHALL be calculated from the view
3. WHEN an admin searches for a member THEN the search SHALL query the view
4. WHEN the admin panel displays member details THEN it SHALL show their calculated queue position
5. IF the admin panel has queue management features THEN they SHALL work with the view-based system

### Requirement 8: Backward Compatibility

**User Story:** As a system operator, I want a safe migration path with rollback capability, so that we can revert if issues arise.

#### Acceptance Criteria

1. WHEN the migration runs THEN it SHALL create the view without dropping the old table immediately
2. WHEN the migration is complete THEN both the table and view SHALL exist temporarily
3. WHEN testing is complete THEN a separate migration SHALL drop the old table
4. WHEN rolling back THEN the system SHALL be able to revert to the table-based approach
5. IF data exists in the old table THEN it SHALL be preserved during migration

### Requirement 9: Performance Optimization

**User Story:** As a performance engineer, I want the view to be optimized with proper indexes, so that queries remain fast at scale.

#### Acceptance Criteria

1. WHEN the view is created THEN proper indexes SHALL exist on `user_payments.created_at`
2. WHEN the view is created THEN proper indexes SHALL exist on `user_subscriptions.status`
3. WHEN querying the view with 10,000+ members THEN response time SHALL be under 100ms
4. WHEN the view is queried frequently THEN database query plans SHALL use indexes efficiently
5. IF performance degrades THEN a materialized view option SHALL be available

### Requirement 10: Data Integrity

**User Story:** As a data analyst, I want the view to accurately reflect business rules, so that queue positions are fair and correct.

#### Acceptance Criteria

1. WHEN calculating queue position THEN only members with `subscription_status = 'active'` SHALL be included
2. WHEN calculating queue position THEN only successful payments (`status = 'succeeded'`) SHALL be counted
3. WHEN calculating tenure THEN the system SHALL use the earliest successful payment date
4. WHEN a member has received a payout THEN they SHALL be excluded from the active queue
5. IF a member's subscription is reactivated THEN they SHALL rejoin the queue with their original tenure date

---

## Success Criteria

The migration is considered successful when:

1. ✅ All services query the view instead of the table
2. ✅ Queue positions are calculated dynamically and accurately
3. ✅ No manual reorganization code exists
4. ✅ Performance is equal to or better than the table-based approach
5. ✅ All tests pass with the new view-based system
6. ✅ The old `membership_queue` table can be safely dropped
7. ✅ Payout processing integrates seamlessly with the view
8. ✅ Admin panel displays accurate real-time queue data

---

## Out of Scope

The following are explicitly out of scope for this migration:

- ❌ Changes to payment processing logic
- ❌ Changes to subscription management
- ❌ UI/UX redesign of queue display
- ❌ Implementation of payout processing (separate feature)
- ❌ Changes to authentication or authorization
- ❌ Migration of historical queue data (preserved in payout_management)

---

## Dependencies

This migration depends on:

1. Existing `users` table with user data
2. Existing `user_subscriptions` table with subscription status
3. Existing `user_payments` table with payment history
4. Existing `payout_management` table for winner tracking
5. PostgreSQL database with view support
6. Drizzle ORM for schema management

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| View query performance | High | Add proper indexes, test with large datasets |
| Service downtime during migration | Medium | Use blue-green deployment, keep old table temporarily |
| Data inconsistency | High | Thorough testing, validation queries |
| Rollback complexity | Medium | Keep old table until migration is verified |
| Breaking changes in APIs | High | Version APIs, update all consumers simultaneously |

---

## Timeline Estimate

- **Phase 1: Database View Creation** - 2 hours
- **Phase 2: Service Layer Updates** - 4 hours
- **Phase 3: API Endpoint Updates** - 3 hours
- **Phase 4: Admin Service Updates** - 2 hours
- **Phase 5: Testing and Validation** - 4 hours
- **Phase 6: Deployment and Monitoring** - 2 hours
- **Phase 7: Old Table Removal** - 1 hour

**Total Estimated Time:** 18 hours (2-3 days)
