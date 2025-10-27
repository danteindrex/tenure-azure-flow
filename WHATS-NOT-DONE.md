# What Hasn't Been Done - Better Auth Integration

**Date:** 2025-10-27
**Status:** Profile UI Complete | Database Schema CRITICAL ISSUE | Supabase Migration Pending

---

## 🚨 CRITICAL ISSUE: DATABASE SCHEMA INCOMPLETE

### The Problem

When you tried to run `npx drizzle-kit push`, it warned about **deleting 6 tables and 33 columns** with data. This means your Drizzle schema files are incomplete compared to your live database.

### Missing Tables (6)
1. `admin` - Admin user table (1 item)
2. `payload_migrations` - CMS migration tracking (1 item)
3. `payload_preferences` - CMS user preferences (29 items)
4. `payload_preferences_rels` - CMS relationships (35 items)
5. `admin_sessions` - Admin session tracking (2 items)
6. `admin_alerts` - Admin notifications (3 items)

### Missing Columns (33)
- **payout_management table:** queue_position, currency, eligibility_check, approval_workflow, tax_withholding, processing, receipt_url, internal_notes, audit_trail
- **user_audit_logs table:** admin_id, entity_id, action, old_values, new_values
- **kyc_verification table:** verification_method, provider_verification_id, verification_data, verified_at, reviewer_id, reviewer_notes, risk_score, risk_factors, ip_address, user_agent, geolocation
- **disputes table:** dispute_id, payment_id, reason, amount, currency, stripe_dispute_id, evidence, impact
- **admin_alerts table:** subject column (not null, no default, 3 items affected)

### What This Means

You have a **PayloadCMS admin system** or custom admin tables that aren't defined in your Drizzle schema files. If you run `drizzle-kit push` without adding these tables/columns to your schemas first, **YOU WILL LOSE DATA**.

### What Was Attempted

Ran `npx drizzle-kit introspect` which successfully connected and found:
- ✅ 46 tables
- ✅ 19 enums
- ✅ 53 policies

But it's unclear if it generated the schema files automatically.

### What You Need to Do

**Option 1: Manually add missing tables to schemas**

Create `drizzle/schema/admin.ts`:
```typescript
import { pgTable, uuid, text, timestamp, json } from 'drizzle-orm/pg-core'

export const admin = pgTable('admin', {
  // Add admin table columns
})

export const adminSessions = pgTable('admin_sessions', {
  // Add admin_sessions columns
})

export const adminAlerts = pgTable('admin_alerts', {
  id: uuid('id').primaryKey(),
  subject: text('subject').notNull(), // THIS IS CRITICAL - has data
  // ... other columns
})

export const payloadMigrations = pgTable('payload_migrations', {
  // Add payload_migrations columns
})

export const payloadPreferences = pgTable('payload_preferences', {
  // Add payload_preferences columns
})

export const payloadPreferencesRels = pgTable('payload_preferences_rels', {
  // Add payload_preferences_rels columns
})
```

Then update `drizzle/schema/index.ts` to export these tables.

**Option 2: Use generated schema from introspect**

Check if `drizzle-kit introspect` created a schema file (usually `schema.ts` in migrations or root).

**Option 3: Pull schema with a different tool**

Use `pg_dump` or another tool to extract the complete schema.

**Option 4: Query the database directly**

```sql
-- Get all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Get columns for a specific table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'admin';
```

---

## ✅ COMPLETED WORK

### 1. Profile Management UI
- ✅ [src/pages/dashboard/ProfileNew.tsx](src/pages/dashboard/ProfileNew.tsx) - Fully integrated with Better Auth
- ✅ Profile tab (edit name, phone, view details)
- ✅ Security tab (2FA, Passkeys)
- ✅ Sessions tab (list/revoke sessions)

### 2. Profile API Routes
- ✅ [app/api/profile/route.ts](app/api/profile/route.ts) - GET and PATCH
- ✅ Queries normalized tables (user_profiles, user_contacts, user_addresses, user_memberships)
- ✅ Bridges Better Auth session with your existing data structure

### 3. Session Management API Routes
- ✅ [app/api/auth/list-sessions/route.ts](app/api/auth/list-sessions/route.ts) - Lists all sessions
- ✅ [app/api/auth/revoke-session/route.ts](app/api/auth/revoke-session/route.ts) - Revokes sessions

### 4. Documentation
- ✅ [BETTER-AUTH-UI-INTEGRATION.md](BETTER-AUTH-UI-INTEGRATION.md) - Complete implementation guide

---

## ❌ NOT DONE

### 1. Database Schema Sync (BLOCKED)
**Status:** CRITICAL - Cannot proceed until schemas are complete
**Blocker:** Missing 6 tables and 33 columns in Drizzle schemas

**What needs to happen:**
1. Add missing PayloadCMS/admin tables to Drizzle schemas
2. Add missing columns to existing tables
3. Verify all schemas match live database
4. THEN run `drizzle-kit push` (or skip it if schemas already match)

**Estimated time:** 2-3 hours

---

### 2. Replace Supabase Auth Throughout App
**Status:** NOT STARTED
**Estimated time:** 3-4 hours

**Files using Supabase Auth (19 files):**

#### Critical Auth Files (6):
1. [src/pages/Login.tsx](src/pages/Login.tsx) - `supabase.auth.signInWithPassword()`
2. [src/pages/SignUp.tsx](src/pages/SignUp.tsx) - `supabase.auth.signUp()`
3. [src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx) - `useUser()`, `useSupabaseClient()`
4. [pages/auth/callback.tsx](pages/auth/callback.tsx) - OAuth callback handler
5. [pages/clear-cookies.tsx](pages/clear-cookies.tsx) - Cookie management
6. [src/pages/dashboard/Profile.tsx](src/pages/dashboard/Profile.tsx) - OLD profile page (can be deleted, replaced by ProfileNew.tsx)

#### Dashboard/Component Files (13):
7. src/pages/dashboard/Queue.tsx
8. src/pages/dashboard/Settings.tsx
9. src/pages/DashboardSimple.tsx
10. src/pages/dashboard/Analytics.tsx
11. src/pages/Dashboard.tsx
12. src/pages/dashboard/NewsFeed.tsx
13. src/pages/CompleteProfile.tsx
14. src/pages/dashboard/Transactions.tsx
15. src/pages/dashboard/Help.tsx
16. src/pages/dashboard/HistoryNew.tsx
17. src/pages/dashboard/Notifications.tsx
18. src/components/PageTracker.tsx
19. src/components/PaymentNotificationBanner.tsx

**What needs to be changed:**

Replace:
```typescript
// OLD - Supabase
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
const supabase = useSupabaseClient()
const user = useUser()

// Sign in
await supabase.auth.signInWithPassword({ email, password })

// Sign out
await supabase.auth.signOut()

// Update user
await supabase.auth.updateUser({ data: { ... } })
```

With:
```typescript
// NEW - Better Auth
import { authClient, useSession } from "@/lib/auth-client"
const { data: session } = useSession()
const user = session?.user

// Sign in
await authClient.signIn.email({ email, password })

// Sign out
await authClient.signOut()

// Update user
await authClient.updateUser({ ... })
```

---

### 3. Onboarding Middleware
**Status:** NOT STARTED
**Estimated time:** 30-60 minutes

**File to create:** `middleware.ts`

**Purpose:**
- Redirect incomplete users to onboarding
- Block dashboard access until onboarding complete
- Allow users to login and continue where they left off

**Implementation:**
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers
  })

  // If user is logged in but hasn't completed onboarding
  if (session?.user && !session.user.onboardingCompleted) {
    const currentStep = session.user.onboardingStep || 1

    // Allow onboarding routes
    if (request.nextUrl.pathname.startsWith('/onboarding')) {
      return NextResponse.next()
    }

    // Redirect to current onboarding step
    return NextResponse.redirect(
      new URL(`/onboarding/step-${currentStep}`, request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*']
}
```

---

### 4. Integrate Existing 5-Step Onboarding
**Status:** NOT STARTED
**Estimated time:** 1-2 hours

**What you have:**
- Existing 5-step onboarding flow (you mentioned this)
- Phone verification required
- Email verification required
- Stripe checkout required

**What needs to be done:**
1. Update onboarding to use Better Auth session
2. Update `onboardingStep` field after each step:
   ```typescript
   await authClient.updateUser({
     onboardingStep: 2  // Update as user progresses
   })
   ```
3. Mark complete after Stripe checkout:
   ```typescript
   await authClient.updateUser({
     onboardingStep: 5,
     onboardingCompleted: true
   })
   ```
4. Store phone in `user_contacts` table (already exists)
5. Mark phone as verified after verification:
   ```typescript
   await db.update(userContacts)
     .set({ isVerified: true })
     .where(eq(userContacts.userId, userId))
   ```

---

### 5. Phone Verification Service
**Status:** NOT STARTED
**Estimated time:** 1-2 hours

**Options:**
- Twilio (Recommended)
- AWS SNS
- Vonage (Nexmo)

**Environment variables needed:**
```env
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+15551234567
```

**API route to create:** `app/api/verify/send-code/route.ts`

```typescript
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  // Save code to verification_codes table
  await db.insert(verificationCodes).values({
    phone,
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  })

  // Send SMS
  await client.messages.create({
    body: `Your verification code is: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  })

  return NextResponse.json({ success: true })
}
```

**API route to create:** `app/api/verify/check-code/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { phone, code } = await req.json()

  // Check code
  const verification = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.phone, phone),
      eq(verificationCodes.code, code),
      gt(verificationCodes.expiresAt, new Date())
    )
  })

  if (!verification) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  // Mark phone as verified in user_contacts
  await db.update(userContacts)
    .set({ isVerified: true })
    .where(and(
      eq(userContacts.contactValue, phone),
      eq(userContacts.contactType, 'phone')
    ))

  // Delete verification code
  await db.delete(verificationCodes).where(eq(verificationCodes.id, verification.id))

  return NextResponse.json({ success: true })
}
```

---

### 6. Testing
**Status:** NOT STARTED
**Estimated time:** 2-3 hours

**Test ProfileNew.tsx:**
- [ ] Profile loads with correct data
- [ ] Edit and save profile works
- [ ] Name syncs to Better Auth user.name
- [ ] Phone syncs to user_contacts table
- [ ] 2FA enable shows QR code
- [ ] 2FA disable works
- [ ] Add passkey triggers WebAuthn
- [ ] Delete passkey works
- [ ] Sessions list displays
- [ ] Revoke session works

**Test Onboarding:**
- [ ] New users redirect to onboarding
- [ ] Step 1: Phone + password signup
- [ ] Step 2: Phone verification
- [ ] Step 3: Personal info + email
- [ ] Step 4: Email verification
- [ ] Step 5: Stripe checkout
- [ ] onboardingCompleted = true after Stripe
- [ ] Dashboard accessible after completion

**Test Middleware:**
- [ ] Incomplete users redirected to onboarding
- [ ] Users can logout and login to continue
- [ ] Completed users access dashboard normally

---

## SUMMARY

### What Works
- ✅ ProfileNew.tsx integrated with Better Auth
- ✅ Profile API routes
- ✅ Session management APIs
- ✅ Documentation complete

### Critical Blockers
1. **Database schema incomplete** - MUST fix before pushing any schema changes
2. **Supabase still used throughout app** - 19 files need updates

### Work Remaining
1. Fix database schemas (2-3 hours)
2. Replace Supabase Auth (3-4 hours)
3. Create onboarding middleware (30-60 min)
4. Integrate onboarding with Better Auth (1-2 hours)
5. Add phone verification service (1-2 hours)
6. Testing (2-3 hours)

**Total estimated time:** 10-16 hours

---

## RECOMMENDED NEXT STEPS

1. **FIRST:** Fix the database schema issue
   - Add missing PayloadCMS/admin tables
   - Add missing columns to existing tables
   - Verify schemas match database

2. **SECOND:** Replace Supabase Auth in critical files
   - Login.tsx
   - SignUp.tsx
   - DashboardLayout.tsx

3. **THIRD:** Create onboarding middleware

4. **FOURTH:** Integrate onboarding flow

5. **FIFTH:** Add phone verification

6. **SIXTH:** Test everything

---

## IMPORTANT NOTES

- **DO NOT run `drizzle-kit push` until schemas are fixed**
- ProfileNew.tsx is ready to use once Supabase is replaced
- Your existing database architecture is good (normalized tables)
- Better Auth is configured correctly
- The issue is just incomplete schema definitions

---

## FILES REFERENCE

**Completed:**
- src/pages/dashboard/ProfileNew.tsx
- app/api/profile/route.ts
- app/api/auth/list-sessions/route.ts
- app/api/auth/revoke-session/route.ts
- BETTER-AUTH-UI-INTEGRATION.md

**To Create:**
- drizzle/schema/admin.ts (or find introspected schema)
- middleware.ts
- app/api/verify/send-code/route.ts
- app/api/verify/check-code/route.ts

**To Update:**
- 19 files still using Supabase Auth
- Existing onboarding flow (integrate with Better Auth)
