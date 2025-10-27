# Next Steps - Better Auth Integration

**Status:** Profile UI Complete | Database Needs 2 Columns | Supabase Migration Pending

---

## 🎯 IMMEDIATE NEXT STEP

### Run the SQL Migration (5 minutes)

**File:** [RUN-THIS-SQL.md](RUN-THIS-SQL.md)

This adds ONLY two columns to your Better Auth `user` table:
- `onboardingStep` (INTEGER, DEFAULT 1)
- `onboardingCompleted` (BOOLEAN, DEFAULT false)

**How to run:**
1. Open Supabase SQL Editor
2. Copy SQL from [RUN-THIS-SQL.md](RUN-THIS-SQL.md)
3. Run it
4. Done!

**Important:** The drizzle-kit warning about "6 missing tables" is a red herring. Those are PayloadCMS admin tables that you don't manage with Drizzle. You can safely ignore them.

---

## 📋 REMAINING WORK

### 1. Replace Supabase Auth (3-4 hours)

**Priority Order:**

#### Phase 1: Critical Auth Files (1-2 hours)
1. **[src/pages/Login.tsx](src/pages/Login.tsx)**
   ```typescript
   // Replace:
   await supabase.auth.signInWithPassword({ email, password })

   // With:
   await authClient.signIn.email({ email, password })
   ```

2. **[src/pages/SignUp.tsx](src/pages/SignUp.tsx)**
   ```typescript
   // Replace:
   await supabase.auth.signUp({ email, password })

   // With:
   await authClient.signUp.email({ email, password })
   ```

3. **[src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx)**
   ```typescript
   // Replace:
   import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
   const user = useUser()
   const supabase = useSupabaseClient()

   // With:
   import { useSession } from '@/lib/auth-client'
   const { data: session } = useSession()
   const user = session?.user
   ```

#### Phase 2: Dashboard Files (1-2 hours)
4-19. Update remaining 16 files:
- src/pages/dashboard/Queue.tsx
- src/pages/dashboard/Settings.tsx
- src/pages/dashboard/Profile.tsx (DELETE this old file, use ProfileNew.tsx)
- src/pages/DashboardSimple.tsx
- src/pages/dashboard/Analytics.tsx
- src/pages/Dashboard.tsx
- src/pages/dashboard/NewsFeed.tsx
- src/pages/CompleteProfile.tsx
- src/pages/dashboard/Transactions.tsx
- src/pages/dashboard/Help.tsx
- src/pages/dashboard/HistoryNew.tsx
- src/pages/dashboard/Notifications.tsx
- src/components/PageTracker.tsx
- src/components/PaymentNotificationBanner.tsx
- pages/auth/callback.tsx
- pages/clear-cookies.tsx

**Quick Reference:**
```typescript
// OLD (Supabase)
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
const user = useUser()
const supabase = useSupabaseClient()

// Check auth
if (!user) return null

// Get user data
const email = user.email
const userId = user.id

// NEW (Better Auth)
import { useSession } from '@/lib/auth-client'
const { data: session, isPending } = useSession()
const user = session?.user

// Check auth
if (isPending) return <Loading />
if (!session) return null

// Get user data
const email = user.email
const userId = user.id
```

---

### 2. Create Onboarding Middleware (30 minutes)

**File to create:** `middleware.ts` (in project root)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Get Better Auth session
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
  // Protect dashboard and profile pages
  matcher: ['/dashboard/:path*', '/profile/:path*']
}
```

---

### 3. Integrate Existing 5-Step Onboarding (1-2 hours)

You mentioned you already have the 5-step onboarding. Update it to:

#### Step 1: Phone + Password Signup
```typescript
// After user signs up
await authClient.signUp.email({
  email,
  password,
  name: fullName
})

// Store phone in user_contacts
await db.insert(userContacts).values({
  userId: newUserId,
  contactType: 'phone',
  contactValue: phone,
  isPrimary: true,
  isVerified: false
})

// Set onboarding step
await authClient.updateUser({
  onboardingStep: 2
})
```

#### Step 2: Verify Phone
```typescript
// After phone verification succeeds
await db.update(userContacts)
  .set({ isVerified: true })
  .where(and(
    eq(userContacts.userId, userId),
    eq(userContacts.contactType, 'phone'),
    eq(userContacts.isPrimary, true)
  ))

// Move to next step
await authClient.updateUser({
  onboardingStep: 3
})
```

#### Step 3: Personal Info + Email
```typescript
// Save to user_profiles
await db.insert(userProfiles).values({
  userId,
  firstName,
  lastName,
  dateOfBirth
})

// Save email to user_contacts
await db.insert(userContacts).values({
  userId,
  contactType: 'email',
  contactValue: email,
  isPrimary: true,
  isVerified: false
})

// Update Better Auth user email
await authClient.updateUser({
  email,
  onboardingStep: 4
})
```

#### Step 4: Verify Email
```typescript
// After email verification
await db.update(userContacts)
  .set({ isVerified: true })
  .where(and(
    eq(userContacts.userId, userId),
    eq(userContacts.contactType, 'email')
  ))

await authClient.updateUser({
  onboardingStep: 5
})
```

#### Step 5: Stripe Checkout
```typescript
// After Stripe payment succeeds
await authClient.updateUser({
  onboardingStep: 5,
  onboardingCompleted: true  // 🎉 Done!
})

// User can now access dashboard
```

---

### 4. Phone Verification Service (1-2 hours)

**Option 1: Twilio (Recommended)**

```bash
npm install twilio
```

**Environment variables:**
```env
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+15551234567
```

**Create:** `app/api/verify/send-code/route.ts`

```typescript
import twilio from 'twilio'
import { db } from '@/drizzle/db'
import { verificationCodes } from '@/drizzle/schema'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  // Save to database
  await db.insert(verificationCodes).values({
    phone,
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  })

  // Send SMS via Twilio
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )

  await client.messages.create({
    body: `Your verification code is: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  })

  return NextResponse.json({ success: true })
}
```

**Create:** `app/api/verify/check-code/route.ts`

```typescript
import { db } from '@/drizzle/db'
import { verificationCodes, userContacts } from '@/drizzle/schema'
import { eq, and, gt } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json()

  // Find verification code
  const verification = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.phone, phone),
      eq(verificationCodes.code, code),
      gt(verificationCodes.expiresAt, new Date())
    )
  })

  if (!verification) {
    return NextResponse.json(
      { error: 'Invalid or expired code' },
      { status: 400 }
    )
  }

  // Mark phone as verified
  await db.update(userContacts)
    .set({ isVerified: true })
    .where(and(
      eq(userContacts.contactValue, phone),
      eq(userContacts.contactType, 'phone')
    ))

  // Delete used code
  await db.delete(verificationCodes)
    .where(eq(verificationCodes.id, verification.id))

  return NextResponse.json({ success: true })
}
```

---

### 5. Testing (2-3 hours)

#### Test Profile Management
- [ ] Load ProfileNew.tsx
- [ ] Edit name and phone
- [ ] Save changes
- [ ] Enable 2FA
- [ ] Add passkey
- [ ] View sessions
- [ ] Revoke session

#### Test Onboarding Flow
- [ ] New user signup (Step 1)
- [ ] Phone verification (Step 2)
- [ ] Personal info + email (Step 3)
- [ ] Email verification (Step 4)
- [ ] Stripe checkout (Step 5)
- [ ] onboardingCompleted = true
- [ ] Dashboard accessible

#### Test Middleware
- [ ] Incomplete users redirected
- [ ] Users can logout/login to continue
- [ ] Completed users access dashboard

---

## 📊 PROGRESS TRACKER

### Completed ✅
- [x] ProfileNew.tsx with Better Auth integration
- [x] Profile API routes (GET/PATCH)
- [x] Session management APIs (list/revoke)
- [x] 2FA, Passkeys, Sessions UI
- [x] Documentation (BETTER-AUTH-UI-INTEGRATION.md, WHATS-NOT-DONE.md)
- [x] SQL migration script (RUN-THIS-SQL.md)

### In Progress ⏳
- [ ] Run SQL migration (YOU - 5 minutes)

### Not Started ❌
- [ ] Replace Supabase Auth (3-4 hours)
- [ ] Create onboarding middleware (30 minutes)
- [ ] Integrate onboarding with Better Auth (1-2 hours)
- [ ] Phone verification service (1-2 hours)
- [ ] Testing (2-3 hours)

**Total remaining: ~8-13 hours**

---

## 🔥 QUICK WIN PATH

Want to see results fast? Here's the quickest path to a working system:

### Day 1 (2-3 hours)
1. ✅ Run SQL migration (5 min)
2. ✅ Replace Login.tsx (30 min)
3. ✅ Replace SignUp.tsx (30 min)
4. ✅ Replace DashboardLayout.tsx (30 min)
5. ✅ Test login/signup works (30 min)

**Result:** Users can login with Better Auth!

### Day 2 (2-3 hours)
1. ✅ Create middleware (30 min)
2. ✅ Update onboarding Step 5 to set `onboardingCompleted = true` (30 min)
3. ✅ Test middleware blocks dashboard (15 min)
4. ✅ Replace remaining dashboard files (1-2 hours)

**Result:** Onboarding enforcement works!

### Day 3 (2-3 hours)
1. ✅ Add Twilio phone verification (1-2 hours)
2. ✅ Update onboarding steps 1-4 to use Better Auth fields (30 min)
3. ✅ End-to-end testing (30 min)

**Result:** Complete Better Auth integration!

---

## 📚 KEY FILES REFERENCE

**Documentation:**
- [BETTER-AUTH-UI-INTEGRATION.md](BETTER-AUTH-UI-INTEGRATION.md) - Complete implementation guide
- [WHATS-NOT-DONE.md](WHATS-NOT-DONE.md) - Detailed breakdown of remaining work
- [RUN-THIS-SQL.md](RUN-THIS-SQL.md) - SQL migration to run
- [NEXT-STEPS.md](NEXT-STEPS.md) - This file

**Completed Code:**
- [src/pages/dashboard/ProfileNew.tsx](src/pages/dashboard/ProfileNew.tsx) - Profile management UI
- [app/api/profile/route.ts](app/api/profile/route.ts) - Profile API
- [app/api/auth/list-sessions/route.ts](app/api/auth/list-sessions/route.ts) - Session list API
- [app/api/auth/revoke-session/route.ts](app/api/auth/revoke-session/route.ts) - Session revoke API

**Auth Configuration:**
- [lib/auth.ts](lib/auth.ts) - Server-side Better Auth
- [lib/auth-client.ts](lib/auth-client.ts) - Client-side Better Auth
- [drizzle/schema/auth.ts](drizzle/schema/auth.ts) - Better Auth tables

**Your Existing Tables:**
- [drizzle/schema/users.ts](drizzle/schema/users.ts) - Normalized user tables

**To Create:**
- `middleware.ts` - Onboarding enforcement
- `app/api/verify/send-code/route.ts` - Phone verification SMS
- `app/api/verify/check-code/route.ts` - Phone code verification

---

## 💡 TIPS

### Debugging Auth Issues
```typescript
// Check current session
import { useSession } from '@/lib/auth-client'
const { data: session, isPending } = useSession()
console.log('Session:', session)

// Check onboarding status
console.log('Onboarding step:', session?.user?.onboardingStep)
console.log('Onboarding complete:', session?.user?.onboardingCompleted)
```

### Testing Middleware
```typescript
// Manually set onboarding status for testing
await authClient.updateUser({
  onboardingStep: 3,
  onboardingCompleted: false
})

// This user should be redirected to /onboarding/step-3
```

### Testing Phone Verification
Use Twilio test credentials for free testing:
- Test phone numbers don't send real SMS
- Use code: `123456` for all test phones
- See: https://www.twilio.com/docs/iam/test-credentials

---

## 🆘 NEED HELP?

### Common Issues

**"Session is null"**
- Check if user is logged in: `await authClient.getSession()`
- Verify Better Auth API route is accessible: `/api/auth/session`
- Check cookies are being sent: credentials: 'include'

**"onboardingStep undefined"**
- Run the SQL migration from [RUN-THIS-SQL.md](RUN-THIS-SQL.md)
- Verify columns exist: `SELECT * FROM "user" LIMIT 1`

**"Can't update profile"**
- Check `/api/profile` route is working
- Verify user has a record in `users` table linked to Better Auth
- Check Drizzle query logs for errors

**"Middleware not triggering"**
- Verify middleware.ts is in project root
- Check matcher config includes your routes
- Test with: `console.log('Middleware running')`

---

## 🎉 YOU'RE ALMOST THERE!

The hard work is done. ProfileNew.tsx is fully integrated with Better Auth. All that's left is:

1. Run one SQL command (5 min)
2. Replace Supabase imports with Better Auth imports (3-4 hours)
3. Add middleware and phone verification (2-3 hours)
4. Test everything (2-3 hours)

**Total: ~8-13 hours of work remaining**

You've got this! 💪
