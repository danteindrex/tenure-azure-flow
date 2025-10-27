# Drizzle + Better Auth Migration Plan

## Current Schema Analysis

Based on your SQL migrations, here's your complete database schema:

### Existing Tables (29 total)

#### 1. **Core User Tables** (from `complete_normalization.sql`)
```
users                      - Core user identity
user_profiles              - Personal information
user_contacts              - Contact information
user_addresses             - Address information
user_memberships           - Membership data
```

#### 2. **Settings Tables** (from `user_settings_tables.sql`)
```
user_settings                    - General preferences
user_notification_preferences    - Notification settings
user_security_settings           - Security & 2FA config
user_payment_settings            - Payment preferences
user_privacy_settings            - Privacy controls
user_appearance_settings         - UI/UX preferences
```

#### 3. **Financial Tables** (from `create_subscription_tables.sql`)
```
user_subscriptions         - Stripe subscriptions
user_payments             - Payment transactions
user_payment_methods      - Saved payment methods
user_billing_schedules    - Billing cycles
user_agreements           - Terms & conditions
```

#### 4. **Queue & Notifications** (from `create-queue-table.sql`, `create-notifications-tables.sql`)
```
membership_queue          - Tenure queue management
queue                     - Alternative queue table (check for duplicates!)
notifications             - User notifications
notification_preferences  - Notification settings (duplicate!)
notification_templates    - Email/notification templates
```

#### 5. **Audit & Admin**
```
system_audit_logs         - System-level audit trail
user_audit_logs           - User action logs
admin                     - Admin users (referenced in RLS)
member                    - Legacy member table (may need migration)
```

---

## ⚠️ Schema Issues Identified

### 1. **Duplicate Tables**
- `membership_queue` vs `queue` - Same purpose!
- `user_notification_preferences` vs `notification_preferences` - Overlapping!

### 2. **Inconsistent Naming**
- Some tables use `user_` prefix (normalized schema)
- Some tables don't (`queue`, `notifications`, `payment`, `subscription`)

### 3. **Legacy References**
- `member` table exists (old schema)
- `queue` references `member(member_id)`
- New schema references `users(id)`

### 4. **Missing Better Auth Tables**
- No `session` table for Better Auth
- No `account` table for OAuth providers
- No `verification` table for email/phone codes
- No `passkey` table for WebAuthn
- No `two_factor` table for TOTP codes

---

## Migration Strategy

### Phase 1: Consolidate Existing Schema ✅

**Goal:** Fix duplicates and inconsistencies BEFORE adding Better Auth

#### Actions:
1. **Choose One Queue Table**
   - Keep: `membership_queue` (more descriptive name)
   - Drop: `queue` (or migrate data if it has records)

2. **Choose One Notification Preferences**
   - Keep: `user_notification_preferences` (matches settings pattern)
   - Drop: `notification_preferences` (or merge fields)

3. **Standardize Table Names**
   - Rename `notifications` → `user_notifications` (consistency)
   - Rename `subscription` → `user_subscriptions` (if not already done)
   - Rename `payment` → `user_payments` (if not already done)

4. **Migrate Legacy Member References**
   - Update `queue.memberid` to reference `users(id)` instead of `member(member_id)`
   - Or create mapping table: `member_user_mapping`

---

### Phase 2: Add Better Auth Tables ✅

**Goal:** Add Better Auth tables alongside existing schema (NO BREAKING CHANGES)

#### New Tables to Add:

**1. Better Auth Core (auth.users replacement)**
```typescript
// Better Auth "user" table - extends your existing users table
user (
  id UUID PRIMARY KEY,           // Links to existing users.id
  name TEXT,                     // From user_profiles.first_name + last_name
  email TEXT UNIQUE,             // From users.email
  emailVerified BOOLEAN,         // From users.email_verified
  password TEXT,                 // Migrated from auth.users.encrypted_password
  image TEXT,                    // New field (avatar URL)
  createdAt TIMESTAMP,           // From users.created_at
  updatedAt TIMESTAMP            // From users.updated_at
)
```

**Strategy:**
- ✅ Don't drop `users` table
- ✅ Create `user` table as Better Auth identity
- ✅ Link both: `users.user_id → user.id` (foreign key)
- ✅ Gradually migrate code to use `user` table

**2. Session Management**
```typescript
session (
  id UUID PRIMARY KEY,
  userId UUID → user(id),      // References Better Auth user
  expiresAt TIMESTAMP,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TIMESTAMP
)
```

**3. OAuth Accounts**
```typescript
account (
  id UUID PRIMARY KEY,
  userId UUID → user(id),
  accountId TEXT,              // Google ID, GitHub ID, etc.
  providerId TEXT,             // 'google', 'github', etc.
  accessToken TEXT,
  refreshToken TEXT,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP
)
```

**4. Email/Phone Verification**
```typescript
verification (
  id UUID PRIMARY KEY,
  identifier TEXT,             // email or phone
  value TEXT,                  // verification code
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP
)
```

**5. Passkeys (WebAuthn)**
```typescript
passkey (
  id UUID PRIMARY KEY,
  userId UUID → user(id),
  name TEXT,                   // "MacBook Pro", "iPhone 15"
  credentialId TEXT UNIQUE,
  publicKey TEXT,
  counter BIGINT,
  deviceType TEXT,             // "platform" or "cross-platform"
  backedUp BOOLEAN,
  transports TEXT[],           // ["usb", "nfc", "ble"]
  createdAt TIMESTAMP,
  lastUsedAt TIMESTAMP
)
```

**6. Two-Factor Authentication**
```typescript
two_factor (
  id UUID PRIMARY KEY,
  userId UUID → user(id),
  secret TEXT,                 // TOTP secret (encrypted)
  backupCodes TEXT[],          // Encrypted backup codes
  method TEXT,                 // "totp", "sms", "email"
  verified BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP,
  verifiedAt TIMESTAMP
)
```

**Note:** This complements your existing `user_security_settings.two_factor_enabled`

---

### Phase 3: Extend with Advanced Features ✅

**7. Organizations (Team Management)**
```typescript
organization (
  id UUID PRIMARY KEY,
  name TEXT,
  slug TEXT UNIQUE,
  logo TEXT,
  metadata JSONB,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
)

organization_member (
  id UUID PRIMARY KEY,
  organizationId UUID → organization(id),
  userId UUID → user(id),
  role TEXT,                   // "owner", "admin", "member"
  permissions JSONB,
  invitedBy UUID,
  joinedAt TIMESTAMP,
  createdAt TIMESTAMP
)

organization_invitation (
  id UUID PRIMARY KEY,
  organizationId UUID → organization(id),
  email TEXT,
  role TEXT,
  invitedBy UUID,
  token TEXT UNIQUE,
  expiresAt TIMESTAMP,
  acceptedAt TIMESTAMP,
  createdAt TIMESTAMP
)
```

---

## Complete Drizzle Schema Structure

### File Organization
```
drizzle/
├── schema/
│   ├── index.ts                          # Export all schemas
│   ├── auth.ts                           # Better Auth tables
│   ├── users.ts                          # User core tables
│   ├── settings.ts                       # User settings tables
│   ├── financial.ts                      # Subscriptions, payments
│   ├── membership.ts                     # Queue, memberships
│   ├── notifications.ts                  # Notifications
│   ├── organizations.ts                  # Team management
│   └── audit.ts                          # Audit logs
├── migrations/                           # Auto-generated migrations
└── drizzle.config.ts                     # Drizzle configuration
```

---

## Table Relationship Map

```
┌─────────────────────────────────────────────────────────────┐
│                    BETTER AUTH LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  user (Better Auth identity)                                │
│    ├─→ session (user sessions)                             │
│    ├─→ account (OAuth providers)                           │
│    ├─→ passkey (WebAuthn credentials)                      │
│    └─→ two_factor (TOTP secrets)                           │
└─────────────────────────────────────────────────────────────┘
                          ↓ user_id reference
┌─────────────────────────────────────────────────────────────┐
│                  YOUR APPLICATION LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  users (app user wrapper)                                   │
│    ├─→ user_profiles (name, DOB)                           │
│    ├─→ user_contacts (phone, email, emergency)             │
│    ├─→ user_addresses (home, billing)                      │
│    ├─→ user_memberships (join date, tenure)                │
│    │                                                         │
│    ├─→ user_settings (preferences)                         │
│    ├─→ user_security_settings (2FA enabled flag)           │
│    ├─→ user_notification_preferences                       │
│    ├─→ user_payment_settings                               │
│    ├─→ user_privacy_settings                               │
│    ├─→ user_appearance_settings                            │
│    │                                                         │
│    ├─→ user_subscriptions (Stripe)                         │
│    ├─→ user_payments (transactions)                        │
│    ├─→ user_payment_methods (saved cards)                  │
│    ├─→ user_billing_schedules                              │
│    │                                                         │
│    ├─→ membership_queue (tenure queue)                     │
│    ├─→ user_notifications (inbox)                          │
│    ├─→ user_agreements (terms accepted)                    │
│    │                                                         │
│    └─→ user_audit_logs (user actions)                      │
└─────────────────────────────────────────────────────────────┘
                          ↓ user_id reference
┌─────────────────────────────────────────────────────────────┐
│               ORGANIZATION LAYER (NEW)                       │
├─────────────────────────────────────────────────────────────┤
│  organization                                               │
│    ├─→ organization_member (users in org)                  │
│    └─→ organization_invitation (pending invites)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Timeline

### Week 1: Schema Consolidation
- [ ] **Day 1-2:** Audit database for duplicate tables
  - Run queries to check if `queue` has data
  - Check if `notification_preferences` is in use
  - Identify which table is source of truth

- [ ] **Day 3-4:** Create consolidation migration
  - Merge duplicate table data
  - Drop unused tables
  - Update foreign key references

- [ ] **Day 5:** Test consolidated schema
  - Run all application queries
  - Check for broken references
  - Validate data integrity

### Week 2: Better Auth Setup
- [ ] **Day 1:** Install dependencies
  ```bash
  npm install better-auth drizzle-orm drizzle-kit
  npm install @node-rs/argon2  # Password hashing
  npm install resend           # Email service
  ```

- [ ] **Day 2-3:** Create Drizzle schema files
  - Map all existing tables to Drizzle
  - Add Better Auth tables
  - Add new feature tables (passkeys, 2FA, orgs)

- [ ] **Day 4:** Generate and review migrations
  ```bash
  npx drizzle-kit generate:pg
  # Review migrations before applying!
  ```

- [ ] **Day 5:** Apply migrations to staging
  ```bash
  npx drizzle-kit push:pg
  ```

### Week 3: Data Migration
- [ ] **Day 1-2:** Migrate auth.users → user table
  - Copy user data from Supabase auth
  - Migrate password hashes (bcrypt compatible)
  - Link to existing `users` table

- [ ] **Day 3:** Migrate OAuth accounts
  - Copy from auth.identities → account table

- [ ] **Day 4:** Initialize new tables
  - Create default settings for existing users
  - Generate 2FA secrets where `user_security_settings.two_factor_enabled = true`

- [ ] **Day 5:** Validation & testing
  - Verify all data migrated
  - Check foreign key integrity
  - Test sample queries

### Week 4: Application Integration
- [ ] **Day 1-2:** Update authentication code
  - Replace Supabase auth calls with Better Auth
  - Configure email service (Resend)
  - Set up Better Auth API routes

- [ ] **Day 3-4:** Update database queries
  - Convert Supabase client queries to Drizzle
  - Type-safe query building
  - Test all CRUD operations

- [ ] **Day 5:** Deploy and monitor
  - Deploy to staging
  - Run integration tests
  - Monitor for errors

---

## Key Decisions Needed

### 1. **Queue Tables: Keep Which One?**

**Option A: Keep `membership_queue`** (RECOMMENDED)
- ✅ Better naming (descriptive)
- ✅ Matches normalized schema pattern
- ✅ Uses UUID for user_id
- ⚠️ Need to check if `queue` has unique data

**Option B: Keep `queue`**
- ✅ Already has triggers and functions set up
- ⚠️ References legacy `member` table
- ⚠️ Uses BIGSERIAL id (not UUID)

**Recommendation:** Keep `membership_queue`, migrate data from `queue` if needed

---

### 2. **Notification Preferences: Consolidate**

**Tables:**
- `user_notification_preferences` (6 settings tables pattern)
- `notification_preferences` (notifications migration)

**Strategy:**
```sql
-- Merge into user_notification_preferences
INSERT INTO user_notification_preferences (user_id, ...)
SELECT user_id, ... FROM notification_preferences
ON CONFLICT (user_id) DO UPDATE SET ...;

-- Drop duplicate
DROP TABLE notification_preferences;
```

---

### 3. **User Table Strategy**

**Option A: Dual Tables (RECOMMENDED for safety)**
```
user (Better Auth identity) ←──┐
                                ├── Both reference same user
users (Application wrapper) ────┘
```

**Benefits:**
- ✅ No breaking changes
- ✅ Gradual migration
- ✅ Can rollback easily

**Option B: Single Table (future goal)**
```
user (merged Better Auth + app fields)
```

**Benefits:**
- ✅ Simpler schema
- ✅ No synchronization needed
- ⚠️ Requires careful migration

**Recommendation:** Start with Option A, migrate to Option B later

---

### 4. **2FA Implementation**

You already have `user_security_settings.two_factor_enabled`. Options:

**Option A: Keep Both Tables**
```
user_security_settings (
  two_factor_enabled BOOLEAN,  // UI toggle
  ...
)

two_factor (
  secret TEXT,                 // Better Auth TOTP secret
  backupCodes TEXT[],
  ...
)
```

**When `two_factor_enabled = true`:**
1. Check if `two_factor` record exists
2. If not, create one (setup flow)
3. If yes, verify code on login

**Option B: Merge into user_security_settings**
- Add Better Auth columns to existing table
- No need for separate `two_factor` table

**Recommendation:** Option A (Better Auth handles complex 2FA logic)

---

## Breaking Change Prevention

### ✅ Safe Migration Principles

1. **Never drop tables immediately**
   - Add new tables alongside old ones
   - Dual-write to both (transition period)
   - Verify new tables working
   - Then drop old tables

2. **Keep existing column names**
   - Don't rename `users.email` → `user.email`
   - Create new table, link with FK
   - Application uses new table gradually

3. **Maintain foreign key integrity**
   - All existing FKs stay valid
   - New tables reference existing user_id
   - No orphaned records

4. **Row Level Security (RLS)**
   - Copy RLS policies to new tables
   - Test policies before enabling
   - Ensure users can only access own data

5. **Triggers and functions**
   - Update triggers to work with new schema
   - Test trigger execution
   - Monitor for errors

---

## Testing Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Document all existing queries
- [ ] List all foreign key relationships
- [ ] Identify tables with RLS policies

### During Migration
- [ ] Run migrations in transaction (can rollback)
- [ ] Verify row counts match (old vs new tables)
- [ ] Check foreign key constraints valid
- [ ] Test RLS policies work

### Post-Migration
- [ ] All existing features still work
- [ ] User login/logout functional
- [ ] Settings pages load correctly
- [ ] Payment processing works
- [ ] Queue positions accurate
- [ ] Notifications sending
- [ ] Audit logs recording

### New Features
- [ ] 2FA enrollment flow
- [ ] 2FA verification on login
- [ ] Passkey enrollment
- [ ] Passkey authentication
- [ ] OAuth providers work
- [ ] Session management UI
- [ ] Organization creation (if enabled)

---

## Rollback Plan

### If Migration Fails

**Step 1: Stop application**
```bash
# Stop Next.js
pm2 stop tenure-app

# OR if using Vercel
vercel --prod rollback
```

**Step 2: Rollback database**
```sql
BEGIN;

-- Drop Better Auth tables
DROP TABLE IF EXISTS passkey CASCADE;
DROP TABLE IF EXISTS two_factor CASCADE;
DROP TABLE IF EXISTS verification CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS user CASCADE;

-- Restore any renamed/dropped tables from backup
-- (This is why we backup first!)

COMMIT;
```

**Step 3: Restore application code**
```bash
git revert <migration-commit>
npm install
npm run build
```

**Step 4: Restart application**
```bash
pm2 restart tenure-app
```

---

## Cost Impact

### Development Time
- Week 1 (Consolidation): 20-25 hours
- Week 2 (Better Auth Setup): 25-30 hours
- Week 3 (Data Migration): 30-35 hours
- Week 4 (Integration): 25-30 hours
- **Total: 100-120 hours**

### Infrastructure
- No additional costs (same database)
- Email service: $0-20/month (Resend free tier)
- No vendor lock-in fees

### Risk Assessment
- **Low Risk:** Adding new tables (no breaking changes)
- **Medium Risk:** Migrating auth from Supabase to Better Auth
- **High Risk:** Consolidating duplicate tables (if data exists)

---

## Next Steps

### Immediate Actions (Before Coding)

1. **[ ] Answer Key Questions:**
   - Do `queue` and `membership_queue` both have data?
   - Is `notification_preferences` being used?
   - Are there users in `member` table not in `users`?

2. **[ ] Run Analysis Queries:**
   ```sql
   -- Check for data in queue tables
   SELECT 'queue' as table_name, COUNT(*) FROM queue
   UNION ALL
   SELECT 'membership_queue', COUNT(*) FROM membership_queue;

   -- Check notification preferences
   SELECT 'user_notification_preferences', COUNT(*) FROM user_notification_preferences
   UNION ALL
   SELECT 'notification_preferences', COUNT(*) FROM notification_preferences;

   -- Check member vs users
   SELECT 'member', COUNT(*) FROM member
   UNION ALL
   SELECT 'users', COUNT(*) FROM users;
   ```

3. **[ ] Get Stakeholder Approval:**
   - Review migration timeline
   - Approve downtime window (user re-login required)
   - Confirm budget for development time

---

## Final Recommendation

### ✅ **Proceed with Migration - Here's Why:**

1. **Your schema is ready** - You have comprehensive tables already
2. **2FA infrastructure exists** - Just needs Better Auth integration
3. **Clean separation** - Auth layer + Application layer design is sound
4. **Low risk** - We're adding, not replacing (can rollback)
5. **High reward** - Passkeys, full 2FA, organizations, type-safety

### 📋 **Action Plan Summary:**

**Phase 1 (Week 1):** Consolidate duplicates → Clean schema
**Phase 2 (Week 2):** Add Better Auth tables → No breaking changes
**Phase 3 (Week 3):** Migrate data → Populate new tables
**Phase 4 (Week 4):** Update code → Switch to Better Auth

**Estimated Completion:** 4 weeks
**Risk Level:** Medium
**Benefit:** High (future-proof auth system)

---

**Ready to proceed?**

Next step: Run the analysis queries above and tell me the results. Then I'll generate the exact Drizzle schema files for you.
