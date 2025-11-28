# Status System Analysis & Migration Plan

## 1. Current Database Status Fields Analysis

### 1.1 ENUM Types in Database (18 total)

| ENUM Name | Values | Used By Table.Column |
|-----------|--------|---------------------|
| `enum_users_status` | Pending, Onboarded | `users.status` |
| `membership_status` | Inactive, Active, Suspended, Cancelled, Won, Paid | `user_memberships.member_status` |
| `enum_user_memberships_verification_status` | PENDING, VERIFIED, FAILED, SKIPPED | `user_memberships.verification_status` |
| `enum_user_subscriptions_status` | active, past_due, canceled, incomplete, trialing, unpaid | `user_subscriptions.status` |
| `enum_user_payments_status` | succeeded, pending, failed, refunded, canceled | `user_payments.status` |
| `payout_status` | pending_approval, approved, scheduled, processing, completed, failed, cancelled | `payout_management.status` (varchar) |
| `kyc_verification_status` | pending, in_review, verified, rejected, expired | `kyc_verification.status` (varchar) |
| `admin_role` | super_admin, admin, moderator | `admin_accounts.role` |
| `admin_status` | active, inactive, suspended | `admin_accounts.status` |
| `action_type` | login, logout, create, update, delete, view, export | `audit_logs.action` |
| `subscription_status` | active, inactive, cancelled, past_due, trialing | `subscriptions.status` |
| `transaction_status` | pending, completed, failed, refunded | `transactions.status` |
| `member_status` (duplicate!) | UNVERIFIED, PROSPECT, ACTIVE, PENDING | NOT USED (orphan) |
| `user_status` | active, inactive, suspended, pending | NOT USED (orphan) |
| `dispute_type` | charge_dispute, fraudulent, duplicate, etc. | `disputes.type` (varchar) |
| `transaction_risk_level` | low, medium, high, critical | `transaction_monitoring` |
| `signup_session_status` | active, completed, expired | signup sessions |
| `better_auth_invitation_status` | pending, accepted, declined, expired | org invitations |

### 1.2 VARCHAR/TEXT Status Columns (NOT using ENUMs)

| Table | Column | Current Values | Notes |
|-------|--------|----------------|-------|
| `admin` | `status` | 'active' | Duplicate of admin_accounts |
| `admin_alerts` | `status` | 'new', etc. | Alert states |
| `audit_logs` | `status` | 'success', etc. | Log status |
| `billing_schedules` | `status` | 'scheduled', etc. | Billing states |
| `disputes` | `status` | 'needs_response', etc. | Dispute workflow |
| `kyc_verification` | `status` | pending, in_review, verified, rejected, expired | Should use ENUM |
| `newsfeedposts` | `status` | 'Published', etc. | Content states |
| `payout_management` | `status` | payout_status values | Should use ENUM |
| `payouts` | `status` | 'pending', etc. | Legacy table |
| `tax_forms` | `status` | 'pending', etc. | Tax workflow |
| `transaction_monitoring` | `status` | 'pending_review', etc. | Review states |

---

## 2. Current Access Control Flow

### 2.1 Dashboard Access Check Flow

```
User Request → pages/dashboard/index.tsx
    ↓
    Check session (useSession)
    ↓
    No session → redirect /login
    ↓
    Has session → fetch /api/onboarding/status
    ↓
    OnboardingService.getUserOnboardingStatus(userId)
    ↓
    Checks in this order:
    1. betterAuthUser.status === 'Suspended' → /suspended
    2. !emailVerified → /signup?step=2
    3. !hasProfile → /signup?step=3
    4. !isPhoneVerified → /signup?step=4
    5. !hasActiveSubscription → /signup?step=5
    6. betterAuthUser.status === 'Active' → /dashboard ✓
    7. else (Pending, Inactive) → /signup?step=5
```

### 2.2 Status Checks in Code

| File | Check | Action |
|------|-------|--------|
| `src/lib/onboarding.ts:111` | `status === 'Suspended'` | Block dashboard, redirect /suspended |
| `src/lib/onboarding.ts:133` | `status === 'Active'` | Allow dashboard access |
| `pages/dashboard/index.tsx:37` | `!canAccessDashboard` | Redirect to nextRoute |
| `pages/dashboard/settings.tsx:34` | `!canAccessDashboard` | Redirect to nextRoute |
| `app/api/auth/check-user-status/route.ts:22` | `verificationStatus === 'VERIFIED'` | Return isVerified |
| `services/payout-service/.../winner-selector.ts:163` | `kycResult[0].status !== 'verified'` | Block payout |
| `services/payout-service/.../winner-selector.ts:195` | `status !== 'active' && status !== 'trialing'` | Block payout |

---

## 3. Problems Identified

### 3.1 Redundancy Issues
1. **Two `member_status` ENUMs**: One with (UNVERIFIED, PROSPECT, ACTIVE, PENDING), another `membership_status` with (Inactive, Active, Suspended, Cancelled, Won, Paid)
2. **Two `user_status` concepts**: `enum_users_status` and orphan `user_status` ENUM
3. **VARCHAR vs ENUM inconsistency**: `payout_management.status` and `kyc_verification.status` use varchar but have ENUM values defined

### 3.2 Hardcoded Status Checks
All status checks are hardcoded strings scattered across:
- `src/lib/onboarding.ts` - Main access control
- `services/payout-service/*` - Winner eligibility
- `services/kyc-service/*` - KYC verification
- `pages/api/*` - Various API endpoints
- `app/api/*` - App router endpoints

### 3.3 No Centralized Access Control
- No middleware for status-based routing
- Each page implements its own access check
- No admin-configurable access rules

---

## 4. Proposed Solution: Unified Lookup Table System

### 4.1 Status Category Lookup Table

```sql
CREATE TABLE status_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- 'user_funnel', 'member_eligibility', etc.
  name VARCHAR(100) NOT NULL,              -- 'User Funnel Status'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Status Values Lookup Table

```sql
CREATE TABLE status_values (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES status_categories(id),
  code VARCHAR(50) NOT NULL,               -- 'active', 'pending', 'suspended'
  display_name VARCHAR(100) NOT NULL,      -- 'Active Member' (admin can change)
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',             -- Custom properties per status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, code)
);
```

### 4.3 Access Control Rules Table

```sql
CREATE TABLE access_control_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Conditions (all must match)
  user_funnel_status_ids INTEGER[],        -- Which user statuses can access
  member_status_ids INTEGER[],             -- Which member statuses can access
  subscription_status_ids INTEGER[],       -- Which subscription statuses can access
  kyc_status_ids INTEGER[],                -- Which KYC statuses can access

  -- Additional conditions
  requires_email_verified BOOLEAN DEFAULT false,
  requires_phone_verified BOOLEAN DEFAULT false,
  requires_profile_complete BOOLEAN DEFAULT false,
  requires_active_subscription BOOLEAN DEFAULT false,

  -- Action
  allowed_routes TEXT[],                   -- Routes this rule allows access to
  redirect_route VARCHAR(255),             -- Where to redirect if denied

  -- Priority (higher = checked first)
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Route Protection Table

```sql
CREATE TABLE protected_routes (
  id SERIAL PRIMARY KEY,
  route_pattern VARCHAR(255) NOT NULL,     -- '/dashboard/*', '/settings'
  access_rule_id INTEGER REFERENCES access_control_rules(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Status Mapping (Current → New Lookup System)

### 5.1 User Funnel Status (users.status)

| Current ENUM | Lookup Code | Display Name | Access Level |
|--------------|-------------|--------------|--------------|
| Pending | `pending` | Pending | Onboarding only |
| Onboarded | `onboarded` | Onboarded | Full access |
| (new) | `suspended` | Suspended | Blocked |

### 5.2 Member Eligibility Status (user_memberships.member_status)

| Current ENUM | Lookup Code | Display Name | Description |
|--------------|-------------|--------------|-------------|
| Inactive | `inactive` | Inactive | No active subscription |
| Active | `active` | Active | Paying member |
| Suspended | `suspended` | Suspended | Temporarily blocked |
| Cancelled | `cancelled` | Cancelled | Voluntarily left |
| Won | `won` | Won | Selected for payout |
| Paid | `paid` | Paid | Received payout |

### 5.3 Subscription Status (user_subscriptions.status)

| Current ENUM | Lookup Code | Display Name |
|--------------|-------------|--------------|
| active | `active` | Active |
| trialing | `trialing` | Trial Period |
| past_due | `past_due` | Past Due |
| canceled | `canceled` | Canceled |
| incomplete | `incomplete` | Incomplete |
| unpaid | `unpaid` | Unpaid |

### 5.4 KYC Status (kyc_verification.status)

| Current Value | Lookup Code | Display Name |
|---------------|-------------|--------------|
| pending | `pending` | Pending Review |
| in_review | `in_review` | Under Review |
| verified | `verified` | Verified |
| rejected | `rejected` | Rejected |
| expired | `expired` | Expired |

### 5.5 Payout Status (payout_management.status)

| Current Value | Lookup Code | Display Name |
|---------------|-------------|--------------|
| pending_approval | `pending_approval` | Pending Approval |
| approved | `approved` | Approved |
| scheduled | `scheduled` | Scheduled |
| processing | `processing` | Processing |
| completed | `completed` | Completed |
| failed | `failed` | Failed |
| cancelled | `cancelled` | Cancelled |

---

## 6. Middleware Implementation Plan

### 6.1 Create Next.js Middleware

Location: `/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get session token
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (!sessionToken) {
    // Public routes that don't need auth
    const publicRoutes = ['/', '/login', '/signup', '/reset-password'];
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Call internal API to check access
  const accessCheck = await fetch(
    new URL('/api/access-control/check', request.url),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ pathname }),
    }
  );

  if (!accessCheck.ok) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { allowed, redirectTo } = await accessCheck.json();

  if (!allowed && redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 6.2 Access Control Check API

Location: `/pages/api/access-control/check.ts`

```typescript
export default async function handler(req, res) {
  const session = await auth.api.getSession({ headers: req.headers });
  const { pathname } = req.body;

  if (!session?.user) {
    return res.json({ allowed: false, redirectTo: '/login' });
  }

  // Get user's current statuses
  const userStatuses = await getUserStatuses(session.user.id);

  // Get access rules from database
  const accessRules = await getAccessRules(pathname);

  // Check if any rule allows access
  const allowedRule = accessRules.find(rule =>
    matchesRule(userStatuses, rule)
  );

  if (allowedRule) {
    return res.json({ allowed: true });
  }

  // Find redirect rule
  const redirectRule = accessRules.find(rule => rule.redirect_route);

  return res.json({
    allowed: false,
    redirectTo: redirectRule?.redirect_route || '/login'
  });
}
```

---

## 7. Migration Steps

### Phase 1: Create Lookup Tables (Non-Breaking)
1. Create `status_categories` table
2. Create `status_values` table
3. Populate with current ENUM values
4. Create `access_control_rules` table
5. Create `protected_routes` table

### Phase 2: Add Foreign Key Columns (Non-Breaking)
1. Add `status_id` columns to tables (nullable)
2. Backfill status_id based on current ENUM values
3. Create indexes on new columns

### Phase 3: Update Application Code
1. Create status utility functions
2. Update OnboardingService to use lookup tables
3. Update status checks in services
4. Create middleware for route protection

### Phase 4: Migrate to Lookup Tables (Breaking)
1. Make status_id columns NOT NULL
2. Add foreign key constraints
3. Remove old ENUM columns (or keep for compatibility)
4. Update all hardcoded status checks

### Phase 5: Admin Dashboard
1. Create status management UI
2. Create access control rules UI
3. Create route protection UI

---

## 8. Files to Modify

### Core Files
- `src/lib/onboarding.ts` - Replace hardcoded checks with DB lookups
- `pages/api/onboarding/status.ts` - Use new access control API
- `middleware.ts` (new) - Centralized route protection

### Service Files
- `services/payout-service/src/services/winner-selector.service.ts`
- `services/payout-service/src/services/eligibility-checker.service.ts`
- `services/kyc-service/src/controllers/kyc.controller.ts`

### Schema Files
- `drizzle/schema/` - Add new lookup table schemas
- `drizzle/migrations/` - Add migration files

### New Files Needed
- `src/lib/status-utils.ts` - Status lookup utilities
- `src/lib/access-control.ts` - Access control utilities
- `pages/api/access-control/check.ts` - Access check API
- `pages/api/admin/status-management.ts` - Admin API for status config

---

## 9. Developer Dashboard Requirements

### 9.1 Status Management Section
- View all status categories
- Edit display names (not codes)
- Enable/disable statuses
- Reorder statuses

### 9.2 Access Control Rules Section
- Create/edit access rules
- Set status conditions
- Set additional requirements
- Define allowed routes
- Set redirect destinations

### 9.3 Route Protection Section
- View all protected routes
- Assign access rules to routes
- Test route access for specific users

### 9.4 Audit Log
- Track all status changes
- Track access rule changes
- Track access denied events
