# Profile UI Implementation Summary

**Date:** 2025-10-27
**Status:** ✅ Profile Management UI Created | ⏳ Phone Onboarding Flow Pending

---

## ✅ COMPLETED WORK

### 1. Database Schema Updates

**File:** `drizzle/schema/auth.ts`

Added phone authentication and onboarding tracking to the Better Auth user table:

```typescript
export const user = pgTable('user', {
  // ... existing fields
  phone: text('phone').unique(),
  phoneVerified: boolean('phoneVerified').notNull().default(false),

  // Onboarding step tracking (1-5)
  onboardingStep: integer('onboardingStep').notNull().default(1),
  onboardingCompleted: boolean('onboardingCompleted').notNull().default(false),
  // ... existing fields
})
```

**Onboarding Steps:**
1. Phone Number & Password
2. Phone Verification
3. Personal Information & Email
4. Email Verification
5. Stripe Checkout

### 2. Profile Management UI

**File:** `src/pages/dashboard/ProfileNew.tsx`

Created a comprehensive profile management page with **3 tabs**:

#### **Tab 1: Profile**
- User avatar with initials
- Full name editing
- Email display (read-only)
- Phone number editing
- Verification status badges
- Member since date
- Edit/Save/Cancel functionality

#### **Tab 2: Security**

**Two-Factor Authentication (2FA)**
- Enable/Disable 2FA
- QR Code display for authenticator apps
- Backup codes generation (10 codes)
- Download backup codes
- Copy individual codes to clipboard
- Step-by-step setup wizard

**Passkeys (WebAuthn)**
- List of registered passkeys
- Device name and registration date
- Add new passkey button
- Delete passkey functionality
- Empty state message

#### **Tab 3: Sessions**
- List of active sessions across devices
- Session details:
  - Browser and OS info
  - IP address
  - Location
  - Last active timestamp
- "Current" session badge
- Revoke session button (for non-current sessions)

### 3. UI Features

**Design:**
- Follows existing light ocean blue theme
- Uses existing shadcn/ui components (Card, Tabs, Badge, Button, Input)
- Responsive layout (mobile-first)
- Loading states with spinner
- Toast notifications for user feedback

**Icons:**
- User, Mail, Phone (Profile)
- Shield, Smartphone, Key (Security)
- Monitor, LogOut (Sessions)
- QrCode, Copy, Download, Trash2 (Actions)

**States:**
- Loading state with Loader2 spinner
- Editing mode toggle
- Saving state with disabled buttons
- Form validation ready

---

## ⏳ PENDING WORK

### 1. Phone-Based Onboarding Flow

Create a multi-step signup process that replaces the current Supabase-based flow:

**Step 1: Phone Number & Password**
- Phone number input with country code selector
- Password input with strength meter
- Create account button
- Link to login if already have account

**Step 2: Phone Verification**
- SMS OTP input (6 digits)
- Resend code button
- Countdown timer (60 seconds)
- Verify button

**Step 3: Personal Information & Email**
- First name, Last name
- Email address input
- Optional: Date of birth, Address
- Continue button

**Step 4: Email Verification**
- Email OTP input or link verification
- Resend email button
- Verify button

**Step 5: Stripe Checkout**
- Subscription plan selection
- Stripe payment form
- Complete signup button

**After Completion:**
- Set `onboardingCompleted = true`
- Set `onboardingStep = 5`
- Redirect to dashboard

### 2. Onboarding Middleware

**File to Create:** `middleware.ts`

```typescript
// Check user onboarding status
// If not completed, redirect to /onboarding/step-{n}
// Allow access to /onboarding/* without completion
// Block /dashboard/* until onboarding complete
```

### 3. Better Auth Integration

**Current Status:** UI is built with placeholder functions

**Need to Integrate:**

```typescript
// 2FA
import { twoFactor } from '@/lib/auth-client'
await twoFactor.enable({ password })
await twoFactor.disable({ password })

// Passkeys
import { passkey } from '@/lib/auth-client'
await passkey.addPasskey({ name: 'iPhone 15 Pro' })
await passkey.listPasskeys()
await passkey.deletePasskey({ id })

// Sessions
import { session } from '@/lib/auth-client'
await session.listSessions()
await session.revokeSession({ id })
```

### 4. Replace Supabase Auth

**Files to Update:**
- `src/pages/dashboard/Profile.tsx` → Replace with `ProfileNew.tsx`
- `src/components/DashboardLayout.tsx` → Replace Supabase hooks with Better Auth
- `src/pages/Login.tsx` → Update to Better Auth
- `src/pages/SignUp.tsx` → Replace with phone-based onboarding
- All files using `useSupabaseClient()` and `useUser()` from Supabase

**Migration Steps:**
1. Update all auth hooks to Better Auth
2. Replace session management
3. Update logout functionality
4. Replace profile update logic

### 5. Phone Verification Service

**Options:**
- **Twilio** (Recommended)
- **AWS SNS**
- **Vonage (Nexmo)**

**Implementation:**
```typescript
// API Route: /api/auth/send-phone-verification
export async function POST(req: Request) {
  const { phone } = await req.json()

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000)

  // Send via Twilio
  await twilioClient.messages.create({
    to: phone,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: `Your verification code is: ${code}`
  })

  // Store in verification table with expiry
  await db.insert(verification).values({
    identifier: phone,
    value: code.toString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  })
}
```

---

## 📦 COMPONENTS CREATED

### Pages:
- ✅ `src/pages/dashboard/ProfileNew.tsx` - Complete profile management

### Components (Created but not yet used):
- ✅ `src/components/profile/ProfileTabs.tsx` - Tab wrapper
- ✅ `src/components/profile/ProfileTab.tsx` - Profile info component

**Note:** These components can be deleted since we created the all-in-one `ProfileNew.tsx` instead.

---

## 🎯 NEXT STEPS (Priority Order)

### High Priority:
1. **Apply Database Migration**
   - Run `npx drizzle-kit push` (currently waiting for input)
   - Select "+ account create table" option
   - Verify `phone`, `phoneVerified`, `onboardingStep`, `onboardingCompleted` columns added

2. **Create Phone Onboarding Flow**
   - Create `/pages/onboarding/` directory
   - Build 5-step wizard component
   - Integrate phone verification service (Twilio)
   - Integrate Stripe checkout

3. **Create Onboarding Middleware**
   - Check `onboardingCompleted` status
   - Redirect incomplete users to correct step
   - Allow /onboarding/* routes for incomplete users

### Medium Priority:
4. **Integrate Better Auth APIs**
   - Replace TODO comments in `ProfileNew.tsx`
   - Connect 2FA enable/disable
   - Connect passkey add/delete/list
   - Connect session list/revoke

5. **Replace Supabase Auth**
   - Update `DashboardLayout.tsx`
   - Update `Login.tsx`
   - Update all files using Supabase auth hooks
   - Test auth flow end-to-end

### Low Priority:
6. **Add Profile Image Upload**
   - Integrate file upload (Uploadthing or S3)
   - Image cropping UI
   - Update avatar in profile

7. **Add Account Settings Tab**
   - Delete account functionality
   - Export user data
   - Account linking (Google, etc.)

---

## 🧪 TESTING CHECKLIST

### Profile Tab:
- [ ] Edit profile information
- [ ] Save changes successfully
- [ ] Cancel editing restores original data
- [ ] Loading state displays correctly
- [ ] Saving state disables buttons
- [ ] Toast notifications appear

### Security Tab (2FA):
- [ ] Enable 2FA shows QR code
- [ ] QR code can be scanned
- [ ] Backup codes are generated
- [ ] Copy code to clipboard works
- [ ] Download backup codes works
- [ ] Complete setup enables 2FA
- [ ] Disable 2FA works
- [ ] Cancel 2FA setup works

### Security Tab (Passkeys):
- [ ] Empty state displays
- [ ] Add passkey button works
- [ ] Passkeys list displays
- [ ] Delete passkey works

### Sessions Tab:
- [ ] Sessions list displays
- [ ] Current session is marked
- [ ] Revoke session works
- [ ] Session details are accurate

---

## 🛠️ TECHNICAL NOTES

### Database Schema Migration:
```sql
-- New columns to be added to "user" table:
ALTER TABLE "user" ADD COLUMN "phone" TEXT UNIQUE;
ALTER TABLE "user" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
```

### Better Auth Configuration:
The existing `lib/auth.ts` needs no changes - it already has:
- ✅ Passkey plugin configured
- ✅ TwoFactor plugin configured
- ✅ Email verification configured
- ⚠️ Need to add phone plugin

**Add to `lib/auth.ts`:**
```typescript
import { phoneNumber } from 'better-auth/plugins'

export const auth = betterAuth({
  // ... existing config
  plugins: [
    // ... existing plugins
    phoneNumber({
      sendVerificationCode: async ({ phoneNumber, code }) => {
        // Send SMS via Twilio
      }
    })
  ]
})
```

### Session Management:
Better Auth stores sessions in the `session` table with:
- Device info (userAgent)
- IP address
- Location (need to add IP geolocation service)
- Last active timestamp

### 2FA Backup Codes:
- Generate 10 random codes
- Hash before storing in database
- Allow one-time use only
- Regenerate after use

---

## 📝 ENVIRONMENT VARIABLES NEEDED

```env
# Existing (already configured)
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=re_5RuYtBi8_GsNZLnhCyMqErrJMHsc1UaeC
EMAIL_FROM=noreply@yourdomain.com

# New (need to add)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+15551234567

STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional (for IP geolocation)
IPGEOLOCATION_API_KEY=your-key
```

---

## 📊 FILE STRUCTURE

```
src/
├── pages/
│   ├── dashboard/
│   │   ├── Profile.tsx (OLD - to be replaced)
│   │   └── ProfileNew.tsx (NEW ✅)
│   ├── onboarding/ (TO CREATE)
│   │   ├── Step1Phone.tsx
│   │   ├── Step2PhoneVerify.tsx
│   │   ├── Step3PersonalInfo.tsx
│   │   ├── Step4EmailVerify.tsx
│   │   └── Step5StripeCheckout.tsx
│   ├── Login.tsx (TO UPDATE)
│   └── SignUp.tsx (TO REPLACE)
├── components/
│   └── profile/ (Can be deleted)
│       ├── ProfileTabs.tsx
│       └── ProfileTab.tsx
├── lib/
│   ├── auth.ts (TO UPDATE - add phone plugin)
│   └── auth-client.ts (Already configured ✅)
└── middleware.ts (TO CREATE)

drizzle/
└── schema/
    └── auth.ts (UPDATED ✅)
```

---

## ✅ SUMMARY

**What's Done:**
- ✅ Database schema updated with phone + onboarding fields
- ✅ Complete profile management UI with 3 tabs
- ✅ 2FA management UI (QR code, backup codes)
- ✅ Passkey management UI
- ✅ Session management UI
- ✅ Light theme design matching existing UI

**What's Next:**
- ⏳ Apply database migration (drizzle-kit push)
- ⏳ Create 5-step phone onboarding flow
- ⏳ Integrate Twilio for SMS verification
- ⏳ Add Stripe checkout integration
- ⏳ Create onboarding middleware
- ⏳ Replace Supabase Auth with Better Auth throughout app

**Estimated Time to Complete:**
- Onboarding flow: 4-6 hours
- Better Auth integration: 2-3 hours
- Twilio/Stripe setup: 1-2 hours
- Testing & bug fixes: 2-3 hours
- **Total:** ~10-15 hours
