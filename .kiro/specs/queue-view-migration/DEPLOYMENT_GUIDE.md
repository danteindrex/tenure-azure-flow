# Queue View Migration - Deployment Guide

## 🎯 Overview

This guide provides step-by-step instructions for deploying the view-based queue system. The migration is designed to be safe with zero downtime and full rollback capability.

---

## ✅ Pre-Deployment Checklist

Before starting, ensure:

- [ ] All code changes have been reviewed
- [ ] You have database backup
- [ ] You have tested the migration SQL on a development database
- [ ] You have access to production database
- [ ] You have rollback plan ready
- [ ] Team is notified of deployment

---

## 📋 Deployment Steps

### Step 1: Backup Current Database

```bash
# Create a backup of the current database
pg_dump $DATABASE_URL > backup_before_queue_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backup_before_queue_migration_*.sql
```

### Step 2: Test Migration on Development/Staging

```bash
# Connect to development database
psql $DEV_DATABASE_URL

# Or use the connection string from .env.local
psql "postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
```

```sql
-- Run the migration
\i migrations/create_queue_view.sql

-- Verify view was created
SELECT COUNT(*) FROM active_member_queue_view;

-- Check sample data
SELECT 
  user_id,
  email,
  queue_position,
  tenure_start_date,
  total_successful_payments,
  lifetime_payment_total
FROM active_member_queue_view
ORDER BY queue_position
LIMIT 10;

-- Verify statistics function
SELECT * FROM get_queue_statistics();

-- Test performance
EXPLAIN ANALYZE
SELECT * FROM active_member_queue_view
ORDER BY queue_position;
```

### Step 3: Compare View Results with Old Table

```sql
-- Compare queue positions
SELECT 
  'View' as source,
  user_id,
  queue_position
FROM active_member_queue_view
ORDER BY queue_position
LIMIT 20;

-- vs

SELECT 
  'Table' as source,
  user_id,
  queue_position
FROM membership_queue
WHERE subscription_active = true
ORDER BY queue_position
LIMIT 20;

-- They should match!
```

### Step 4: Deploy Code Changes

```bash
# The code changes are already complete in:
# - src/types/queue.ts
# - services/subscription-service/src/models/queue.model.ts
# - services/subscription-service/src/services/stripe.service.ts
# - services/Tenure-queue/src/models/QueueModel.js
# - pages/api/queue/index.ts

# Deploy to staging first
git add .
git commit -m "feat: migrate to view-based queue system"
git push origin staging

# Deploy services
cd services/subscription-service
npm run build
npm run deploy:staging

cd ../Tenure-queue
npm run build
npm run deploy:staging

# Deploy main app
cd ../..
npm run build
npm run deploy:staging
```

### Step 5: Test Staging Environment

```bash
# Test queue API
curl https://staging.yourapp.com/api/queue

# Test queue statistics
curl https://staging.yourapp.com/api/queue/statistics

# Test specific user
curl https://staging.yourapp.com/api/queue/USER_ID

# Test subscription cancellation (should auto-exclude from queue)
# Cancel a test subscription and verify user disappears from queue
```

### Step 6: Run Migration on Production

```bash
# Connect to production database
psql $PRODUCTION_DATABASE_URL

# Or use Supabase dashboard SQL editor
# https://supabase.com/dashboard/project/exneyqwvvckzxqzlknxv/sql
```

```sql
-- Run the migration
\i migrations/create_queue_view.sql

-- Verify success
SELECT 
  'Migration Status' as info,
  COUNT(*) as total_members,
  MIN(queue_position) as first_position,
  MAX(queue_position) as last_position
FROM active_member_queue_view;
```

### Step 7: Deploy Code to Production

```bash
# Deploy to production
git push origin main

# Deploy services
cd services/subscription-service
npm run deploy:production

cd ../Tenure-queue
npm run deploy:production

# Deploy main app
cd ../..
npm run deploy:production
```

### Step 8: Monitor Production

```bash
# Monitor logs
tail -f logs/production.log

# Check for errors
grep -i "error" logs/production.log | grep -i "queue"

# Monitor database performance
psql $PRODUCTION_DATABASE_URL
```

```sql
-- Check view query performance
EXPLAIN ANALYZE
SELECT * FROM active_member_queue_view
ORDER BY queue_position
LIMIT 100;

-- Monitor active queries
SELECT 
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE query LIKE '%active_member_queue_view%'
AND state = 'active';
```

### Step 9: Validate Production Deployment

```bash
# Test all queue endpoints
curl https://api.yourapp.com/api/queue
curl https://api.yourapp.com/api/queue/statistics

# Test in browser
# - Login to dashboard
# - View queue page
# - Verify positions are correct
# - Test subscription cancellation
```

### Step 10: Monitor for 24-48 Hours

- Watch error logs
- Monitor database CPU/memory
- Check API response times
- Verify queue positions are accurate
- Test subscription flows

---

## 🔄 Rollback Procedure

If issues arise, follow these steps:

### Option 1: Quick Rollback (Revert Code Only)

```bash
# Revert code deployment
git revert HEAD
git push origin main

# Redeploy services with old code
cd services/subscription-service
git checkout HEAD~1
npm run deploy:production

cd ../Tenure-queue
git checkout HEAD~1
npm run deploy:production
```

The old `membership_queue` table still exists, so old code will work immediately.

### Option 2: Full Rollback (Drop View)

```sql
-- Connect to database
psql $PRODUCTION_DATABASE_URL

-- Drop the view
DROP VIEW IF EXISTS active_member_queue_view CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_queue_statistics();
DROP FUNCTION IF EXISTS get_user_queue_position(UUID);

-- Verify old table still works
SELECT COUNT(*) FROM membership_queue;
```

Then revert code as in Option 1.

---

## 🐛 Troubleshooting

### Issue: View Returns No Data

```sql
-- Check if users have active subscriptions
SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active';

-- Check if users have successful payments
SELECT COUNT(*) FROM user_payments WHERE status = 'succeeded';

-- Check view definition
\d+ active_member_queue_view
```

### Issue: Slow Query Performance

```sql
-- Check if indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('user_payments', 'user_subscriptions', 'payout_management');

-- Analyze tables
ANALYZE user_payments;
ANALYZE user_subscriptions;
ANALYZE payout_management;

-- Re-run query with EXPLAIN
EXPLAIN ANALYZE SELECT * FROM active_member_queue_view;
```

### Issue: Queue Positions Don't Match

```sql
-- Compare view with old table
SELECT 
  v.user_id,
  v.queue_position as view_position,
  t.queue_position as table_position,
  v.tenure_start_date,
  t.joined_queue_at
FROM active_member_queue_view v
FULL OUTER JOIN membership_queue t ON v.user_id = t.user_id
WHERE v.queue_position != t.queue_position
OR v.user_id IS NULL
OR t.user_id IS NULL;
```

### Issue: API Errors

```bash
# Check service logs
docker logs subscription-service
docker logs tenure-service

# Check for database connection issues
psql $DATABASE_URL -c "SELECT 1"

# Verify view permissions
psql $DATABASE_URL -c "SELECT * FROM active_member_queue_view LIMIT 1"
```

---

## 📊 Success Metrics

After deployment, verify:

- ✅ Queue API response time < 100ms
- ✅ All queue positions are sequential (1, 2, 3, ...)
- ✅ Canceled subscriptions don't appear in queue
- ✅ Past winners are excluded
- ✅ Queue ordered by tenure (first payment date)
- ✅ No errors in logs
- ✅ Database CPU usage normal
- ✅ All tests passing

---

## 🎉 Post-Deployment

### Week 1: Monitor and Validate

- Monitor daily for any issues
- Compare queue data with old table
- Verify all business rules working
- Check performance metrics

### Week 2: Cleanup (Optional)

After confirming everything works:

```sql
-- Backup old table one more time
CREATE TABLE membership_queue_backup AS SELECT * FROM membership_queue;

-- Drop old table (ONLY after thorough testing!)
-- DROP TABLE membership_queue;

-- Or keep it archived
ALTER TABLE membership_queue RENAME TO membership_queue_deprecated;
```

---

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review logs for error messages
3. Compare view results with old table
4. Use rollback procedure if needed
5. Contact team for assistance

---

## ✅ Deployment Checklist

- [ ] Backup created
- [ ] Migration tested on dev/staging
- [ ] View results compared with old table
- [ ] Code deployed to staging
- [ ] Staging tested successfully
- [ ] Migration run on production
- [ ] Code deployed to production
- [ ] Production validated
- [ ] Monitoring in place
- [ ] Team notified of completion

---

**Status:** Ready for deployment
**Estimated Downtime:** Zero (backward compatible)
**Rollback Time:** < 5 minutes
**Risk Level:** Low (old table preserved)
