# Queue View Migration - Implementation Tasks

## Phase 1: Database Setup

- [x] 1. Create database view and indexes
  - Create `active_member_queue_view` with all required fields
  - Add indexes on `user_payments.created_at`, `user_subscriptions.status`
  - Add composite index for optimized view queries
  - Test view query performance with existing data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2_

- [x] 2. Create migration script
  - Write SQL migration file in `migrations/` directory
  - Include view creation, index creation, and rollback commands
  - Add comments explaining each step
  - Test migration on development database
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 3. Validate view data accuracy
  - Compare view results with current `membership_queue` table
  - Verify queue positions match tenure order
  - Check that all active members are included
  - Verify past winners are excluded
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

## Phase 2: Drizzle Schema Updates

- [x] 4. Update Drizzle schema for view
  - Add view definition to `drizzle/schema/membership.ts`
  - Create TypeScript interface for view output
  - Mark old `membershipQueue` table as deprecated
  - Generate new Drizzle migration
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Update TypeScript types
  - Create `ActiveMemberQueue` interface in `src/types/`
  - Update service types to use new interface
  - Remove old `Queue` interface references
  - Update API response types
  - _Requirements: 4.1, 4.2_

## Phase 3: Subscription Service Updates

- [x] 6. Update queue model in subscription service
  - Replace `membership_queue` queries with view queries in `services/subscription-service/src/models/queue.model.ts`
  - Implement `getUserQueuePosition()` method
  - Implement `getAllQueueMembers()` method
  - Implement `getNextWinners()` method
  - Implement `getQueueStatistics()` method
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 7. Remove reorganization logic from subscription service
  - Remove `removeFromQueue()` function
  - Remove position update logic from `queue.model.ts`
  - Update subscription cancellation to not call queue removal
  - Update tests to reflect new behavior
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Update Stripe webhook handlers
  - Remove queue removal calls from `services/subscription-service/src/services/stripe.service.ts`
  - Update subscription status changes to rely on view
  - Test webhook processing with new logic
  - _Requirements: 2.1, 3.2, 3.3_

## Phase 4: Tenure Service Updates

- [x] 9. Update tenure service queue model
  - Replace all `membership_queue` queries with view queries in `services/Tenure-queue/src/models/QueueModel.js`
  - Update `getAllQueueMembers()` to query view
  - Update `getQueueMemberById()` to query view
  - Update `getQueueStatistics()` to use view data
  - _Requirements: 2.2, 2.5_

- [ ] 10. Remove unused methods from tenure service
  - Remove `updateQueuePosition()` method
  - Remove `addMemberToQueue()` method
  - Remove `removeMemberFromQueue()` method
  - Remove `recalculateQueuePositions()` method
  - Update controller to remove deleted method calls
  - _Requirements: 3.1, 3.4_

- [ ] 11. Update tenure service controllers
  - Update `queueController.js` to use new model methods
  - Remove endpoints for manual position updates
  - Update response formats to match new data structure
  - _Requirements: 2.2, 6.1, 6.2_

## Phase 5: Main API Updates

- [x] 12. Update queue API endpoints
  - Update `pages/api/queue/index.ts` to query view
  - Update `pages/api/queue/statistics.ts` to use view
  - Update `pages/api/queue/[userId].ts` to query view
  - Remove any manual position calculation logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 13. Update business logic service
  - Update `src/lib/business-logic.ts` to use view data
  - Update winner selection logic to query view
  - Update payout eligibility checks to use view
  - _Requirements: 2.4, 5.1, 5.2, 5.3_

## Phase 6: Admin Service Updates

- [ ] 14. Update admin service collections
  - Update `services/admin/home-solutions-admin/src/collections/QueueEntries.ts` to query view
  - Update admin panel queries to use view
  - Update queue display components
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 15. Update admin dashboard metrics
  - Update `services/admin/home-solutions-admin/src/api/metrics/dashboard.ts` to use view
  - Update queue statistics calculations
  - Update member search to query view
  - _Requirements: 7.2, 7.3_

## Phase 7: Frontend Updates

- [ ] 16. Update dashboard queue display
  - Update `src/pages/dashboard/Queue.tsx` to use new API responses
  - Update queue position display logic
  - Update member list rendering
  - Test UI with new data structure
  - _Requirements: 6.4, 7.4_

- [ ] 17. Update dashboard components
  - Update `src/components/DashboardLayout.tsx` if needed
  - Update any queue-related components
  - Update TypeScript interfaces for props
  - _Requirements: 6.4_

## Phase 8: Testing

- [ ] 18. Write unit tests for view queries
  - Test `getUserQueuePosition()` returns correct data
  - Test `getAllQueueMembers()` ordering
  - Test `getNextWinners()` selection logic
  - Test `getQueueStatistics()` calculations
  - _Requirements: All requirements_

- [ ] 19. Write integration tests
  - Test subscription cancellation excludes from view
  - Test payment creation updates view
  - Test payout completion excludes from view
  - Test view performance with large datasets
  - _Requirements: 3.3, 9.3, 10.5_

- [ ] 20. Performance testing
  - Benchmark view query with 1,000 members
  - Benchmark view query with 10,000 members
  - Compare performance with old table approach
  - Identify any slow queries
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

## Phase 9: Documentation

- [ ] 21. Update API documentation
  - Document new queue API endpoints
  - Document view schema and fields
  - Add examples of view queries
  - Update Postman collection
  - _Requirements: All requirements_

- [ ] 22. Update service README files
  - Update subscription service README
  - Update tenure service README
  - Update admin service README
  - Add migration guide
  - _Requirements: All requirements_

- [ ] 23. Create troubleshooting guide
  - Document common issues and solutions
  - Add performance optimization tips
  - Include rollback procedures
  - Add monitoring recommendations
  - _Requirements: 8.4, 9.5_

## Phase 10: Deployment

- [ ] 24. Deploy to staging environment
  - Run database migration on staging
  - Deploy updated services to staging
  - Verify all functionality works
  - Monitor for errors
  - _Requirements: 8.1, 8.2_

- [ ] 25. Validate staging deployment
  - Test queue display in UI
  - Test API endpoints
  - Test subscription cancellation flow
  - Test payout processing (if implemented)
  - Compare results with production
  - _Requirements: 8.3, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 26. Deploy to production
  - Schedule maintenance window (if needed)
  - Run database migration on production
  - Deploy updated services to production
  - Monitor system health
  - Verify queue data accuracy
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 27. Monitor production deployment
  - Monitor view query performance
  - Monitor API response times
  - Check error logs
  - Verify queue positions are correct
  - Monitor database CPU and memory
  - _Requirements: 9.3, 9.4_

## Phase 11: Cleanup

- [ ] 28. Remove old reorganization code
  - Delete unused functions from codebase
  - Remove old queue position update logic
  - Clean up commented-out code
  - Update code comments
  - _Requirements: 3.4, 3.5_

- [ ] 29. Deprecate old table (wait 1 week)
  - Add deprecation notice to table
  - Monitor for any remaining usage
  - Backup table data
  - Prepare drop table migration
  - _Requirements: 4.3, 4.5, 8.2_

- [ ] 30. Drop old membership_queue table
  - Create final backup of table
  - Run drop table migration
  - Remove table from Drizzle schema
  - Update all documentation
  - Verify system still works
  - _Requirements: 4.2, 4.3, 8.3_

---

## Rollback Tasks (If Needed)

- [ ] R1. Revert service deployments
  - Rollback subscription service to previous version
  - Rollback tenure service to previous version
  - Rollback main API to previous version
  - Rollback admin service to previous version
  - _Requirements: 8.4_

- [ ] R2. Revert database changes
  - Drop the view if causing issues
  - Restore old table if needed
  - Revert to previous migration state
  - _Requirements: 8.4_

- [ ] R3. Verify rollback success
  - Test all queue functionality
  - Verify data integrity
  - Check system performance
  - Monitor for errors
  - _Requirements: 8.4_

---

## Success Criteria Checklist

- [ ] ✅ All services query the view instead of the table
- [ ] ✅ Queue positions are calculated dynamically and accurately
- [ ] ✅ No manual reorganization code exists in codebase
- [ ] ✅ View query performance is under 100ms for 10,000+ members
- [ ] ✅ All unit and integration tests pass
- [ ] ✅ Old `membership_queue` table has been dropped
- [ ] ✅ Payout processing works with view-based system
- [ ] ✅ Admin panel displays accurate real-time queue data
- [ ] ✅ Documentation is complete and up-to-date
- [ ] ✅ No errors in production logs related to queue

---

## Estimated Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Database Setup | 1-3 | 2 hours |
| Phase 2: Drizzle Schema | 4-5 | 1 hour |
| Phase 3: Subscription Service | 6-8 | 3 hours |
| Phase 4: Tenure Service | 9-11 | 2 hours |
| Phase 5: Main API | 12-13 | 2 hours |
| Phase 6: Admin Service | 14-15 | 2 hours |
| Phase 7: Frontend | 16-17 | 1 hour |
| Phase 8: Testing | 18-20 | 3 hours |
| Phase 9: Documentation | 21-23 | 2 hours |
| Phase 10: Deployment | 24-27 | 2 hours |
| Phase 11: Cleanup | 28-30 | 1 hour |

**Total Estimated Time:** 21 hours (3 days)

---

## Notes

- Each task should be completed and tested before moving to the next
- Keep the old `membership_queue` table for at least 1 week after deployment
- Monitor performance closely during and after deployment
- Have rollback plan ready at all times
- Update this task list as work progresses
