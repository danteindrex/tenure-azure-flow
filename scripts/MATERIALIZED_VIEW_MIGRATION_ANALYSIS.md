# Materialized View Migration Analysis for Tenure Service

## Executive Summary

The tenure service currently uses a **regular view** (`active_member_queue_view`) that dynamically calculates queue positions in real-time. This analysis evaluates migrating to a **materialized view** with a refresh function to improve performance.

---

## Current Implementation Analysis

### View: `active_member_queue_view`

**Location:** [migrations/create_queue_view.sql](migrations/create_queue_view.sql#L53-L131)

**Type:** Regular View (Dynamic Query)

**Purpose:** Calculates member queue positions based on tenure (first payment date)

### What It Does

1. **Joins 5 tables:**
   - `users` (Better Auth user table)
   - `user_profiles` (names)
   - `user_subscriptions` (subscription status)
   - `user_payments` (payment history)
   - `payout_management` (winner exclusion)

2. **Calculates 18 columns including:**
   - `tenure_start_date` - MIN(payment.created_at)
   - `lifetime_payment_total` - SUM(payment.amount)
   - `total_successful_payments` - COUNT(payments)
   - `queue_position` - ROW_NUMBER() ordered by tenure
   - `is_eligible`, `meets_time_requirement` - eligibility flags

3. **Business Logic:**
   - Only includes active subscriptions
   - Only counts successful payments > $0
   - Excludes past winners (completed payouts)
   - Orders by earliest payment date (tenure)

### Current Performance

According to the exploration report:
- **Single user lookup:** 50-150ms
- **Full queue scan:** 1-3 seconds
- **Query execution:** Runs on EVERY access

### Supporting Functions

1. **`get_queue_statistics()`** - Returns 7 aggregated metrics
   - Total members, eligible members, total revenue
   - Potential winners (calculated from $100K threshold)
   - Oldest/newest member dates

2. **`get_user_queue_position(user_id)`** - Fast single user lookup
   - Returns position, tenure date, payment stats

### Indexes (5 critical)

```sql
idx_user_payments_created_at_status       -- For tenure calculation
idx_user_payments_user_status_date        -- Composite for view queries
idx_user_subscriptions_status_active      -- Active subscription filtering
idx_payout_management_user_status         -- Winner exclusion
idx_user_profiles_names                   -- Name searches
```

---

## Materialized View Benefits Research

### Performance Improvements

- **50-60% faster queries** for read-heavy workloads
- **Pre-computed results** eliminate JOIN and aggregation overhead
- **Indexable** - can add additional indexes on materialized view columns
- **Reduces disk I/O** and CPU usage on source tables

### Trade-offs

| Aspect | Regular View | Materialized View |
|--------|--------------|-------------------|
| **Query Speed** | Slower (re-executes) | Faster (cached) |
| **Data Freshness** | Real-time | Stale until refresh |
| **Storage** | No storage | Physical storage required |
| **Indexes** | On base tables only | Can index view columns |
| **Concurrency** | No locking | Locks during refresh (unless CONCURRENTLY) |

---

## Migration Strategy: Regular View → Materialized View

### Option 1: Simple Materialized View (Recommended for MVP)

**Create the materialized view:**

```sql
CREATE MATERIALIZED VIEW active_member_queue_matview AS
SELECT
  -- User identification
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,

  -- Profile information
  up.first_name,
  up.last_name,
  up.middle_name,
  CONCAT_WS(' ', up.first_name, up.middle_name, up.last_name) as full_name,

  -- Subscription details
  s.id as subscription_id,
  s.status as subscription_status,
  s.provider_subscription_id,

  -- Payment statistics
  MIN(p.created_at) as tenure_start_date,
  MAX(p.created_at) as last_payment_date,
  COUNT(p.id) FILTER (WHERE p.status = 'succeeded') as total_successful_payments,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded'), 0) as lifetime_payment_total,

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

  -- Metadata
  NOW() as calculated_at

FROM users u
INNER JOIN user_subscriptions s ON s.user_id = u.id
INNER JOIN user_payments p ON p.user_id = u.id
LEFT JOIN user_profiles up ON up.user_id = u.id

WHERE
  s.status = 'active'
  AND p.status = 'succeeded'
  AND p.amount > 0
  AND NOT EXISTS(
    SELECT 1 FROM payout_management pm
    WHERE pm.user_id = u.id
    AND pm.status = 'completed'
  )

GROUP BY
  u.id, u.email, u.created_at,
  up.first_name, up.last_name, up.middle_name,
  s.id, s.status, s.provider_subscription_id

ORDER BY
  MIN(p.created_at) ASC,
  u.id ASC;
```

**Add required unique index for concurrent refresh:**

```sql
CREATE UNIQUE INDEX idx_queue_matview_user_id
ON active_member_queue_matview(user_id);
```

**Add performance indexes:**

```sql
CREATE INDEX idx_queue_matview_position
ON active_member_queue_matview(queue_position);

CREATE INDEX idx_queue_matview_tenure
ON active_member_queue_matview(tenure_start_date);

CREATE INDEX idx_queue_matview_eligible
ON active_member_queue_matview(is_eligible, queue_position);
```

---

### Refresh Function (Concurrent)

```sql
CREATE OR REPLACE FUNCTION refresh_active_member_queue()
RETURNS void AS $$
BEGIN
  -- Concurrent refresh allows reads during refresh
  -- Requires unique index on user_id
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_member_queue_matview;

  -- Log the refresh
  RAISE NOTICE 'Queue materialized view refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;
```

**Pros of CONCURRENTLY:**
- No read blocking - users can query during refresh
- Zero downtime

**Cons of CONCURRENTLY:**
- Slower refresh (more overhead)
- Requires unique index
- Can cause table bloat over time

---

### Option 2: Standard Refresh (Faster, but blocks reads)

```sql
CREATE OR REPLACE FUNCTION refresh_active_member_queue_fast()
RETURNS void AS $$
BEGIN
  -- Standard refresh - faster but locks the view
  REFRESH MATERIALIZED VIEW active_member_queue_matview;

  RAISE NOTICE 'Queue materialized view refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;
```

**Use this when:**
- Refresh happens during low-traffic periods
- Speed is more important than availability
- You can tolerate brief read blocking

---

## Refresh Strategies

### 1. Scheduled Refresh (Recommended)

Use `pg_cron` or external scheduler:

```sql
-- Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule refresh every 5 minutes
SELECT cron.schedule(
  'refresh-queue-view',           -- job name
  '*/5 * * * *',                  -- every 5 minutes
  'SELECT refresh_active_member_queue();'
);

-- For hourly refresh at :00
SELECT cron.schedule(
  'refresh-queue-view',
  '0 * * * *',                    -- every hour at :00
  'SELECT refresh_active_member_queue();'
);
```

### 2. Event-Driven Refresh

Create triggers on source tables:

```sql
CREATE OR REPLACE FUNCTION trigger_queue_refresh()
RETURNS trigger AS $$
BEGIN
  -- Use pg_notify to trigger async refresh
  PERFORM pg_notify('queue_refresh_needed', NOW()::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on payment success
CREATE TRIGGER payment_success_refresh
AFTER INSERT OR UPDATE ON user_payments
FOR EACH ROW
WHEN (NEW.status = 'succeeded')
EXECUTE FUNCTION trigger_queue_refresh();

-- Trigger on subscription status change
CREATE TRIGGER subscription_status_refresh
AFTER UPDATE ON user_subscriptions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trigger_queue_refresh();

-- Trigger on payout completion
CREATE TRIGGER payout_completion_refresh
AFTER INSERT OR UPDATE ON payout_management
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION trigger_queue_refresh();
```

**Worker process to handle notifications:**

```typescript
// Example worker (Node.js/TypeScript)
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

// Listen for refresh notifications
await client.query('LISTEN queue_refresh_needed');

client.on('notification', async (msg) => {
  if (msg.channel === 'queue_refresh_needed') {
    console.log('Queue refresh triggered at', msg.payload);

    // Refresh the materialized view
    await client.query('SELECT refresh_active_member_queue()');
  }
});
```

### 3. Hybrid: Schedule + Manual Trigger

```sql
-- Scheduled baseline refresh (every hour)
SELECT cron.schedule(
  'baseline-queue-refresh',
  '0 * * * *',
  'SELECT refresh_active_member_queue();'
);

-- Manual trigger function for immediate refresh
CREATE OR REPLACE FUNCTION force_queue_refresh()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_member_queue_matview;
  RETURN 'Queue refreshed at ' || NOW()::text;
END;
$$ LANGUAGE plpgsql;
```

Call manually when needed:

```sql
SELECT force_queue_refresh();
```

---

## Data Freshness Analysis

### Current System (Regular View)
- **Freshness:** Real-time (always current)
- **Staleness:** 0 seconds

### Proposed Materialized View

| Refresh Frequency | Max Staleness | Use Case |
|-------------------|---------------|----------|
| Every 1 minute | 60 seconds | High-accuracy needed |
| Every 5 minutes | 5 minutes | Recommended baseline |
| Every 15 minutes | 15 minutes | Low-traffic periods |
| Every 1 hour | 1 hour | Overnight/maintenance |

### When is Staleness Acceptable?

**Queue positions change when:**
1. New payment succeeds
2. Subscription status changes (active ↔ canceled)
3. Payout completes (user becomes winner)

**Business Impact Analysis:**
- Queue position is primarily informational
- Users don't expect real-time updates every second
- 5-minute staleness is likely acceptable
- Critical operations (payout selection) can force refresh

---

## Migration Plan

### Phase 1: Create Materialized View Alongside Existing View

```sql
-- 1. Create materialized view (doesn't replace regular view)
CREATE MATERIALIZED VIEW active_member_queue_matview AS
SELECT * FROM active_member_queue_view;

-- 2. Add unique index for concurrent refresh
CREATE UNIQUE INDEX idx_queue_matview_user_id
ON active_member_queue_matview(user_id);

-- 3. Add performance indexes
CREATE INDEX idx_queue_matview_position
ON active_member_queue_matview(queue_position);

CREATE INDEX idx_queue_matview_tenure
ON active_member_queue_matview(tenure_start_date);

-- 4. Create refresh function
CREATE OR REPLACE FUNCTION refresh_active_member_queue()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_member_queue_matview;
  RAISE NOTICE 'Queue refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Initial refresh
SELECT refresh_active_member_queue();
```

### Phase 2: Add Scheduled Refresh

```sql
-- Install pg_cron if not already installed
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule refresh every 5 minutes
SELECT cron.schedule(
  'refresh-queue-view',
  '*/5 * * * *',
  'SELECT refresh_active_member_queue();'
);
```

### Phase 3: Update Application Code

**Before (queries regular view):**
```typescript
const result = await db.query(`
  SELECT * FROM active_member_queue_view
  WHERE user_id = $1
`, [userId]);
```

**After (queries materialized view):**
```typescript
const result = await db.query(`
  SELECT * FROM active_member_queue_matview
  WHERE user_id = $1
`, [userId]);
```

**Update helper functions:**
```sql
-- Update get_user_queue_position to use matview
CREATE OR REPLACE FUNCTION get_user_queue_position(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  queue_position BIGINT,
  tenure_start_date TIMESTAMP WITH TIME ZONE,
  total_payments BIGINT,
  lifetime_total NUMERIC,
  is_eligible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.user_id,
    v.queue_position,
    v.tenure_start_date,
    v.total_successful_payments,
    v.lifetime_payment_total,
    v.is_eligible
  FROM active_member_queue_matview v  -- Changed from _view to _matview
  WHERE v.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update get_queue_statistics to use matview
CREATE OR REPLACE FUNCTION get_queue_statistics()
RETURNS TABLE (
  total_members BIGINT,
  eligible_members BIGINT,
  members_meeting_time_req BIGINT,
  total_revenue NUMERIC,
  oldest_member_date TIMESTAMP WITH TIME ZONE,
  newest_member_date TIMESTAMP WITH TIME ZONE,
  potential_winners INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE is_eligible = true)::BIGINT as eligible_members,
    COUNT(*) FILTER (WHERE meets_time_requirement = true)::BIGINT as members_meeting_time_req,
    COALESCE(SUM(lifetime_payment_total), 0)::NUMERIC as total_revenue,
    MIN(tenure_start_date) as oldest_member_date,
    MAX(tenure_start_date) as newest_member_date,
    LEAST(
      FLOOR(COALESCE(SUM(lifetime_payment_total), 0) / 100000)::INTEGER,
      COUNT(*) FILTER (WHERE is_eligible = true)::INTEGER
    ) as potential_winners
  FROM active_member_queue_matview;  -- Changed from _view to _matview
END;
$$ LANGUAGE plpgsql STABLE;
```

### Phase 4: Add Manual Refresh Endpoint (Optional)

```typescript
// API endpoint to force refresh
// pages/api/admin/refresh-queue.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add authentication check here
  // if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  try {
    await db.query('SELECT refresh_active_member_queue()');

    return res.status(200).json({
      success: true,
      message: 'Queue refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Queue refresh error:', error);
    return res.status(500).json({
      error: 'Failed to refresh queue',
      details: error.message
    });
  }
}
```

### Phase 5: Monitor and Test

```sql
-- Check last refresh time
SELECT calculated_at, COUNT(*) as member_count
FROM active_member_queue_matview
GROUP BY calculated_at;

-- Compare regular view vs materialized view
SELECT 'Regular View' as type, COUNT(*) as count FROM active_member_queue_view
UNION ALL
SELECT 'Materialized View' as type, COUNT(*) as count FROM active_member_queue_matview;

-- Check for data drift
SELECT
  rv.user_id,
  rv.queue_position as regular_position,
  mv.queue_position as matview_position
FROM active_member_queue_view rv
FULL OUTER JOIN active_member_queue_matview mv ON rv.user_id = mv.user_id
WHERE rv.queue_position IS DISTINCT FROM mv.queue_position
LIMIT 10;
```

### Phase 6: Cutover and Cleanup

Once confident:

```sql
-- Option A: Drop regular view and rename matview
DROP VIEW active_member_queue_view CASCADE;
ALTER MATERIALIZED VIEW active_member_queue_matview
RENAME TO active_member_queue_view;

-- Option B: Replace view with matview (keeps same name)
DROP VIEW IF EXISTS active_member_queue_view CASCADE;
CREATE MATERIALIZED VIEW active_member_queue_view AS
SELECT * FROM <original query>;
```

---

## Maintenance and Monitoring

### Table Bloat Management

Materialized views can suffer from table bloat due to frequent refreshes:

```sql
-- Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'active_member_queue_matview';

-- Periodic VACUUM (run weekly)
VACUUM ANALYZE active_member_queue_matview;

-- VACUUM FULL to reclaim space (requires exclusive lock)
-- Run during maintenance window
VACUUM FULL active_member_queue_matview;
```

### Monitoring Queries

```sql
-- Refresh history (if logged)
SELECT * FROM pg_stat_user_tables
WHERE relname = 'active_member_queue_matview';

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'active_member_queue_matview';

-- Query performance comparison
EXPLAIN ANALYZE
SELECT * FROM active_member_queue_matview WHERE queue_position <= 10;

EXPLAIN ANALYZE
SELECT * FROM active_member_queue_view WHERE queue_position <= 10;
```

---

## Recommendations

### ✅ Recommended Approach

1. **Create materialized view** with CONCURRENT refresh capability
2. **Schedule refresh every 5 minutes** using pg_cron
3. **Add manual refresh endpoint** for admin operations
4. **Keep both views initially** for A/B comparison
5. **Monitor performance** for 1-2 weeks
6. **Cutover application code** gradually
7. **Drop regular view** once stable

### Refresh Frequency Recommendations

| Scenario | Frequency | Rationale |
|----------|-----------|-----------|
| **Production (default)** | 5 minutes | Balance freshness vs. performance |
| **High traffic hours** | 3 minutes | More frequent updates during peak |
| **Overnight** | 15 minutes | Less frequent when usage is low |
| **Manual trigger** | On-demand | After critical operations (payouts) |

### Storage Considerations

- Materialized view will require storage (estimate based on member count)
- ~1KB per row × number of members
- Example: 10,000 members = ~10MB
- Add 50% for indexes = ~15MB total

---

## Risk Assessment

### Low Risk
- ✅ Materialized view runs alongside regular view initially
- ✅ No breaking changes during migration
- ✅ Easy rollback (just switch queries back)

### Medium Risk
- ⚠️ Refresh failures could leave stale data
- ⚠️ Concurrent refresh requires unique index (already planned)
- ⚠️ Table bloat over time (mitigated by periodic VACUUM)

### Mitigation Strategies

1. **Monitoring:** Set up alerts for refresh failures
2. **Fallback:** Keep regular view as backup during migration
3. **Testing:** Load test refresh performance with production data size
4. **Maintenance:** Schedule weekly VACUUM ANALYZE

---

## Performance Projections

### Current Performance (Regular View)
- Single user query: **50-150ms**
- Full queue scan: **1-3 seconds**
- Statistics query: **1-2 seconds**

### Projected Performance (Materialized View)
- Single user query: **10-30ms** (5x faster)
- Full queue scan: **200-500ms** (6x faster)
- Statistics query: **100-300ms** (10x faster)

### Refresh Performance
- Concurrent refresh: **3-10 seconds** (depends on member count)
- Standard refresh: **1-3 seconds** (faster but blocks reads)

---

## Next Steps

1. **Review this analysis** with team
2. **Decide on refresh frequency** (recommend: 5 minutes)
3. **Choose refresh strategy** (recommend: CONCURRENT with pg_cron)
4. **Create migration script** (Phase 1-6 plan above)
5. **Test in staging** environment
6. **Monitor performance** metrics
7. **Gradual rollout** to production

---

## Files to Create/Modify

### New Migration File
- `migrations/create_queue_materialized_view.sql`

### Modified Files
- `services/subscription-service/src/models/queue.model.ts` - Update queries
- `pages/api/queue/index.ts` - Update to use matview
- `pages/api/queue/statistics.ts` - Update to use matview

### New Files (Optional)
- `pages/api/admin/refresh-queue.ts` - Manual refresh endpoint
- `scripts/monitor-queue-matview.sql` - Monitoring queries

---

## Conclusion

Migrating from a regular view to a materialized view is **highly recommended** for the tenure service queue system. The benefits include:

- **50-60% performance improvement** for read queries
- **Reduced database load** on source tables
- **Better scalability** as member count grows
- **Minimal risk** with phased migration approach

The 5-minute refresh schedule provides an excellent balance between data freshness and system performance. With proper monitoring and maintenance, this migration will significantly improve the user experience.
