# Queue View Migration - Design Document

## Overview

This document outlines the technical design for migrating from a table-based queue system to a view-based queue system. The new architecture eliminates manual queue reorganization by dynamically calculating positions from existing data.

### Current Architecture Problems

1. **Manual Reorganization**: Every removal triggers updates to all subsequent positions
2. **Data Duplication**: Queue data duplicates information already in subscriptions/payments
3. **Stale Data Risk**: Positions can become out of sync with actual tenure
4. **Performance Issues**: Mass updates lock the table and slow down operations
5. **Complexity**: Reorganization logic adds unnecessary code complexity

### Proposed Solution Benefits

1. **Zero Reorganization**: Positions calculated on-demand, always accurate
2. **Single Source of Truth**: Derived from authoritative subscription/payment data
3. **Better Performance**: One DELETE vs thousands of UPDATEs
4. **Simpler Code**: Remove all reorganization logic
5. **Scalability**: Works efficiently with millions of members

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Main API     │  │ Subscription │  │ Tenure       │      │
│  │ Service      │  │ Service      │  │ Service      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Database View  │
                    │ active_member_  │
                    │  queue_view     │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌──────▼──────┐   ┌──────▼──────┐
    │   users   │    │user_        │   │user_        │
    │           │    │subscriptions│   │payments     │
    └───────────┘    └─────────────┘   └─────────────┘
```

### Data Flow

**Old System (Table-Based):**
```
User Cancels → Remove from queue → Update 9,999 positions → Done
                                    (500ms - 2s)
```

**New System (View-Based):**
```
User Cancels → Update subscription status → View auto-excludes → Done
                                            (5-10ms)
```

---

## Components and Interfaces

### 1. Database View Definition

```sql
CREATE OR REPLACE VIEW active_member_queue_view AS
SELECT 
  -- User identification
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  
  -- Profile information
  up.first_name,
  up.last_name,
  CONCAT(up.first_name, ' ', up.last_name) as full_name,
  
  -- Subscription status
  s.id as subscription_id,
  s.status as subscription_status,
  s.stripe_subscription_id,
  
  -- Payment statistics
  MIN(p.created_at) as tenure_start_date,
  MAX(p.created_at) as last_payment_date,
  COUNT(p.id) FILTER (WHERE p.status = 'succeeded') as total_successful_payments,
  SUM(p.amount) FILTER (WHERE p.status = 'succeeded') as lifetime_payment_total,
  
  -- Payout status
  EXISTS(
    SELECT 1 FROM payout_management pm 
    WHERE pm.user_id = u.id 
    AND pm.status = 'completed'
  ) as has_received_payout,
  
  -- Calculated queue position
  ROW_NUMBER() OVER (
    ORDER BY MIN(p.created_at) ASC, u.id ASC
  ) as queue_position,
  
  -- Eligibility flags
  (s.status = 'active') as is_eligible,
  (COUNT(p.id) FILTER (WHERE p.status = 'succeeded') >= 12) as meets_time_requirement,
  
  -- Timestamps
  NOW() as calculated_at

FROM users u
INNER JOIN user_subscriptions s ON s.user_id = u.id
INNER JOIN user_payments p ON p.user_id = u.id
LEFT JOIN user_profiles up ON up.user_id = u.id

WHERE 
  -- Only active subscriptions
  s.status = 'active'
  
  -- Only successful payments
  AND p.status = 'succeeded'
  
  -- Exclude zero-amount payments
  AND p.amount > 0
  
  -- Exclude past winners
  AND NOT EXISTS(
    SELECT 1 FROM payout_management pm 
    WHERE pm.user_id = u.id 
    AND pm.status = 'completed'
  )

GROUP BY 
  u.id, 
  u.email, 
  u.created_at,
  up.first_name, 
  up.last_name, 
  s.id,
  s.status,
  s.stripe_subscription_id

ORDER BY 
  MIN(p.created_at) ASC, 
  u.id ASC;
```

### 2. Required Indexes

```sql
-- Optimize payment date lookups
CREATE INDEX IF NOT EXISTS idx_user_payments_created_at 
ON user_payments(created_at) 
WHERE status = 'succeeded';

-- Optimize subscription status lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
ON user_subscriptions(status) 
WHERE status = 'active';

-- Optimize payout lookups
CREATE INDEX IF NOT EXISTS idx_payout_management_user_status 
ON payout_management(user_id, status) 
WHERE status = 'completed';

-- Composite index for view query
CREATE INDEX IF NOT EXISTS idx_payments_user_status_date 
ON user_payments(user_id, status, created_at) 
WHERE status = 'succeeded';
```

### 3. Materialized View (Optional - For Large Scale)

```sql
-- For 100,000+ members, use materialized view
CREATE MATERIALIZED VIEW active_member_queue_materialized AS
SELECT * FROM active_member_queue_view;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_queue_materialized_user_id 
ON active_member_queue_materialized(user_id);

CREATE INDEX idx_queue_materialized_position 
ON active_member_queue_materialized(queue_position);

-- Refresh strategy (choose one):

-- Option 1: Manual refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY active_member_queue_materialized;

-- Option 2: Scheduled refresh (via cron job)
-- Every hour: 0 * * * *

-- Option 3: Trigger-based refresh (on subscription/payment changes)
CREATE OR REPLACE FUNCTION refresh_queue_view()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_member_queue_materialized;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_queue_on_subscription
AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_queue_view();
```

---

## Data Models

### View Output Schema

```typescript
interface ActiveMemberQueue {
  // User identification
  user_id: string;
  email: string;
  user_created_at: Date;
  
  // Profile
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  
  // Subscription
  subscription_id: string;
  subscription_status: 'active' | 'canceled' | 'past_due';
  stripe_subscription_id: string | null;
  
  // Payment statistics
  tenure_start_date: Date;
  last_payment_date: Date;
  total_successful_payments: number;
  lifetime_payment_total: number;
  
  // Payout status
  has_received_payout: boolean;
  
  // Queue position
  queue_position: number;
  
  // Eligibility
  is_eligible: boolean;
  meets_time_requirement: boolean;
  
  // Metadata
  calculated_at: Date;
}
```

### Drizzle Schema Update

```typescript
// drizzle/schema/membership.ts

import { pgView } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Remove or deprecate the old table
// export const membershipQueue = pgTable('membership_queue', { ... });

// Define the view
export const activeMemberQueueView = pgView('active_member_queue_view').as((qb) => {
  return qb
    .select({
      userId: users.id,
      email: users.email,
      userCreatedAt: users.createdAt,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      fullName: sql<string>`CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName})`,
      subscriptionId: userSubscriptions.id,
      subscriptionStatus: userSubscriptions.status,
      stripeSubscriptionId: userSubscriptions.stripeSubscriptionId,
      tenureStartDate: sql<Date>`MIN(${userPayments.createdAt})`,
      lastPaymentDate: sql<Date>`MAX(${userPayments.createdAt})`,
      totalSuccessfulPayments: sql<number>`COUNT(${userPayments.id}) FILTER (WHERE ${userPayments.status} = 'succeeded')`,
      lifetimePaymentTotal: sql<number>`SUM(${userPayments.amount}) FILTER (WHERE ${userPayments.status} = 'succeeded')`,
      hasReceivedPayout: sql<boolean>`EXISTS(SELECT 1 FROM ${payoutManagement} WHERE ${payoutManagement.userId} = ${users.id} AND ${payoutManagement.status} = 'completed')`,
      queuePosition: sql<number>`ROW_NUMBER() OVER (ORDER BY MIN(${userPayments.createdAt}) ASC, ${users.id} ASC)`,
      isEligible: sql<boolean>`${userSubscriptions.status} = 'active'`,
      meetsTimeRequirement: sql<boolean>`COUNT(${userPayments.id}) FILTER (WHERE ${userPayments.status} = 'succeeded') >= 12`,
      calculatedAt: sql<Date>`NOW()`
    })
    .from(users)
    .innerJoin(userSubscriptions, eq(userSubscriptions.userId, users.id))
    .innerJoin(userPayments, eq(userPayments.userId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(
      and(
        eq(userSubscriptions.status, 'active'),
        eq(userPayments.status, 'succeeded'),
        gt(userPayments.amount, 0),
        notExists(
          qb.select().from(payoutManagement)
            .where(
              and(
                eq(payoutManagement.userId, users.id),
                eq(payoutManagement.status, 'completed')
              )
            )
        )
      )
    )
    .groupBy(
      users.id,
      users.email,
      users.createdAt,
      userProfiles.firstName,
      userProfiles.lastName,
      userSubscriptions.id,
      userSubscriptions.status,
      userSubscriptions.stripeSubscriptionId
    )
    .orderBy(
      sql`MIN(${userPayments.createdAt}) ASC`,
      users.id
    );
});
```

---

## Service Layer Updates

### 1. Queue Model (services/subscription-service/src/models/queue.model.ts)

**BEFORE:**
```typescript
export class QueueModel {
  static async removeFromQueue(userId: number): Promise<void> {
    // Get position
    const positionResult = await pool.query(
      'SELECT queue_position FROM membership_queue WHERE user_id = $1',
      [userId]
    );
    
    // Delete user
    await pool.query(
      'DELETE FROM membership_queue WHERE user_id = $1',
      [userId]
    );
    
    // Reorganize (SLOW!)
    await pool.query(
      'UPDATE membership_queue SET queue_position = queue_position - 1 WHERE queue_position > $1',
      [removedPosition]
    );
  }
}
```

**AFTER:**
```typescript
export class QueueModel {
  // Get queue position for a user
  static async getUserQueuePosition(userId: string): Promise<ActiveMemberQueue | null> {
    const query = `
      SELECT * FROM active_member_queue_view
      WHERE user_id = $1
    `;
    const result = await pool.query<ActiveMemberQueue>(query, [userId]);
    return result.rows[0] || null;
  }
  
  // Get all active queue members
  static async getAllQueueMembers(limit?: number, offset?: number): Promise<ActiveMemberQueue[]> {
    const query = `
      SELECT * FROM active_member_queue_view
      ORDER BY queue_position ASC
      ${limit ? `LIMIT $1` : ''}
      ${offset ? `OFFSET $2` : ''}
    `;
    const params = [limit, offset].filter(Boolean);
    const result = await pool.query<ActiveMemberQueue>(query, params);
    return result.rows;
  }
  
  // Get next winners
  static async getNextWinners(count: number): Promise<ActiveMemberQueue[]> {
    const query = `
      SELECT * FROM active_member_queue_view
      WHERE is_eligible = true
      ORDER BY queue_position ASC
      LIMIT $1
    `;
    const result = await pool.query<ActiveMemberQueue>(query, [count]);
    return result.rows;
  }
  
  // Get queue statistics
  static async getQueueStatistics(): Promise<QueueStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total_members,
        COUNT(*) FILTER (WHERE is_eligible = true) as eligible_members,
        COUNT(*) FILTER (WHERE meets_time_requirement = true) as members_meeting_time_req,
        SUM(lifetime_payment_total) as total_revenue,
        MIN(tenure_start_date) as oldest_member_date,
        MAX(tenure_start_date) as newest_member_date
      FROM active_member_queue_view
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
  
  // NO MORE removeFromQueue() - not needed!
  // Subscription cancellation automatically excludes from view
}
```

### 2. Tenure Service Updates (services/Tenure-queue/src/models/QueueModel.js)

**Replace all queries:**
```javascript
class QueueModel {
  async getAllQueueMembers() {
    const { data, error } = await this.supabase
      .from('active_member_queue_view')  // Changed from 'membership_queue'
      .select('*')
      .order('queue_position', { ascending: true });
    
    if (error) throw error;
    return data;
  }
  
  async getQueueMemberById(userId) {
    const { data, error } = await this.supabase
      .from('active_member_queue_view')  // Changed from 'membership_queue'
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getQueueStatistics() {
    // Query the view for statistics
    const { data: queueData, error } = await this.supabase
      .from('active_member_queue_view')
      .select('*');
    
    if (error) throw error;
    
    return {
      totalMembers: queueData.length,
      eligibleMembers: queueData.filter(m => m.is_eligible).length,
      totalRevenue: queueData.reduce((sum, m) => sum + m.lifetime_payment_total, 0),
      oldestMemberDate: queueData[0]?.tenure_start_date,
      newestMemberDate: queueData[queueData.length - 1]?.tenure_start_date
    };
  }
  
  // REMOVE: updateQueuePosition() - not needed
  // REMOVE: addMemberToQueue() - automatic via view
  // REMOVE: removeMemberFromQueue() - automatic via view
  // REMOVE: recalculateQueuePositions() - automatic via view
}
```

### 3. API Endpoint Updates (pages/api/queue/index.ts)

```typescript
// pages/api/queue/index.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { limit, offset, search } = req.query;
      
      let query = `SELECT * FROM active_member_queue_view`;
      const params: any[] = [];
      
      if (search) {
        query += ` WHERE email ILIKE $1 OR full_name ILIKE $1`;
        params.push(`%${search}%`);
      }
      
      query += ` ORDER BY queue_position ASC`;
      
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(parseInt(limit as string));
      }
      
      if (offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(parseInt(offset as string));
      }
      
      const result = await pool.query(query, params);
      
      res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

---

## Error Handling

### View Query Failures

```typescript
try {
  const queue = await QueueModel.getAllQueueMembers();
} catch (error) {
  if (error.code === '42P01') {
    // View doesn't exist
    logger.error('active_member_queue_view not found. Run migrations.');
    throw new Error('Queue system not initialized');
  }
  throw error;
}
```

### Performance Degradation

```typescript
// Monitor query performance
const startTime = Date.now();
const queue = await QueueModel.getAllQueueMembers();
const duration = Date.now() - startTime;

if (duration > 100) {
  logger.warn(`Slow queue query: ${duration}ms. Consider materialized view.`);
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('QueueModel', () => {
  it('should return queue ordered by tenure', async () => {
    const queue = await QueueModel.getAllQueueMembers();
    
    // Verify ordering
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].tenure_start_date >= queue[i-1].tenure_start_date).toBe(true);
    }
  });
  
  it('should exclude canceled subscriptions', async () => {
    const queue = await QueueModel.getAllQueueMembers();
    
    queue.forEach(member => {
      expect(member.subscription_status).toBe('active');
    });
  });
  
  it('should exclude past winners', async () => {
    const queue = await QueueModel.getAllQueueMembers();
    
    queue.forEach(member => {
      expect(member.has_received_payout).toBe(false);
    });
  });
});
```

### Integration Tests

```typescript
describe('Queue View Integration', () => {
  it('should automatically update when subscription canceled', async () => {
    // Get initial position
    const initialQueue = await QueueModel.getAllQueueMembers();
    const userPosition = initialQueue.findIndex(m => m.user_id === testUserId);
    
    // Cancel subscription
    await cancelSubscription(testUserId);
    
    // Verify user removed from queue
    const updatedQueue = await QueueModel.getAllQueueMembers();
    const newPosition = updatedQueue.findIndex(m => m.user_id === testUserId);
    
    expect(newPosition).toBe(-1); // Not found
    expect(updatedQueue.length).toBe(initialQueue.length - 1);
  });
});
```

### Performance Tests

```typescript
describe('Queue Performance', () => {
  it('should query 10,000 members in under 100ms', async () => {
    const startTime = Date.now();
    const queue = await QueueModel.getAllQueueMembers();
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(100);
    expect(queue.length).toBeGreaterThan(0);
  });
});
```

---

## Deployment Strategy

### Phase 1: Create View (No Breaking Changes)
1. Run migration to create view
2. Keep old table intact
3. Add indexes for performance
4. Test view queries

### Phase 2: Update Services (Parallel Running)
1. Update subscription service to use view
2. Update tenure service to use view
3. Update API endpoints to use view
4. Keep old code as fallback

### Phase 3: Validation (Monitor Both)
1. Compare view results with table results
2. Monitor performance metrics
3. Verify data accuracy
4. Test edge cases

### Phase 4: Cutover (Switch to View)
1. Deploy all service updates
2. Monitor for errors
3. Verify queue positions
4. Check performance

### Phase 5: Cleanup (Remove Old Code)
1. Remove reorganization logic
2. Deprecate old table
3. Update documentation
4. Remove unused code

### Phase 6: Final Cleanup (Drop Table)
1. Backup old table data
2. Drop `membership_queue` table
3. Remove table from Drizzle schema
4. Update all documentation

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback**: Revert service deployments to use old table
2. **Data Integrity**: Old table still exists with current data
3. **View Removal**: Drop view if causing issues
4. **Code Revert**: Git revert to previous working state

---

## Monitoring and Metrics

### Key Metrics to Track

1. **Query Performance**
   - View query duration (target: < 100ms)
   - Number of queries per minute
   - Slow query alerts

2. **Data Accuracy**
   - Queue position consistency
   - Member count accuracy
   - Tenure date correctness

3. **System Health**
   - Database CPU usage
   - Index hit rate
   - Connection pool utilization

### Alerts

```typescript
// Alert if view query is slow
if (queryDuration > 100) {
  alerting.warn('Slow queue view query', { duration: queryDuration });
}

// Alert if queue count drops unexpectedly
if (currentCount < previousCount * 0.9) {
  alerting.error('Queue member count dropped significantly');
}
```

---

## Documentation Updates

1. Update API documentation with new endpoints
2. Update service README files
3. Create migration guide for developers
4. Update database schema documentation
5. Create troubleshooting guide

---

## Conclusion

This view-based architecture provides:
- ✅ **Zero reorganization overhead**
- ✅ **Always accurate positions**
- ✅ **Better performance**
- ✅ **Simpler codebase**
- ✅ **Easier to maintain**

The migration is low-risk with a clear rollback path and can be done incrementally without downtime.
