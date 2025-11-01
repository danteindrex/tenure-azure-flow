# Complete User Journey Analysis: Tenure Azure Flow

## Overview
This document provides a comprehensive analysis of what happens when a user completes the entire signup and onboarding process in the Tenure application.

---

## Step-by-Step User Journey

### **Step 1: Email & Password Registration**
**Location**: [SignUp.tsx:20](src/pages/SignUp.tsx#L20)

**What Happens**:
1. User visits `/signup`
2. User provides:
   - Email address
   - Password (with confirmation)
   - Agrees to terms and conditions
3. System creates user account via Better Auth
4. User record created with:
   - `status: 'Pending'`
   - `emailVerified: false`
5. Email verification code sent

**Database State**:
- ✅ User record in `users` table (status: `Pending`)
- ❌ No profile yet
- ❌ No phone contact
- ❌ No subscription

---

### **Step 2: Email Verification**
**Location**: [SignUp.tsx:20](src/pages/SignUp.tsx#L20)

**What Happens**:
1. User receives OTP via email
2. User enters 6-digit verification code
3. System verifies code via Better Auth
4. User's `emailVerified` flag set to `true`

**Database State**:
- ✅ User record (status: `Pending`, emailVerified: `true`)
- ❌ No profile yet
- ❌ No phone contact
- ❌ No subscription

---

### **Step 3: Personal Information & Address**
**Location**: [SignUp.tsx:20](src/pages/SignUp.tsx#L20) & [profiles/upsert.ts](pages/api/profiles/upsert.ts)

**What Happens**:
1. User provides personal information:
   - First name, last name, middle name
   - Date of birth
   - Street address, city, state, zip code, country
2. System calls `/api/profiles/upsert` to save data
3. Creates/updates multiple database records:
   - User profile
   - User address
   - User membership (initialized with `PENDING` status)

**Database State**:
- ✅ User record (status: `Pending`, emailVerified: `true`)
- ✅ User profile in `user_profiles` table
- ✅ User address in `user_addresses` table
- ✅ User membership in `user_memberships` (status: `PENDING`)
- ❌ No phone contact yet
- ❌ No subscription yet

---

### **Step 4: Phone Verification**
**Location**: [SignUp.tsx:788](src/pages/SignUp.tsx#L788)

**What Happens**:
1. User provides phone number with country code (default: +256 Uganda)
2. System sends OTP via Twilio
3. User enters verification code
4. System verifies OTP with Twilio
5. Phone contact created with `isVerified: true`
6. Onboarding progress updated

**Database State**:
- ✅ User record (status: `Pending`, emailVerified: `true`)
- ✅ User profile
- ✅ User address
- ✅ Phone contact in `user_contacts` (contactType: `phone`, isVerified: `true`)
- ✅ User membership
- ❌ No subscription yet

**Development Note**: There's a bypass option in development mode that skips phone verification.

---

### **Step 5: Payment (Stripe Checkout)**
**Location**: [SignUp.tsx:943](src/pages/SignUp.tsx#L943) & [create-checkout.ts](pages/api/subscriptions/create-checkout.ts)

**What Happens**:
1. User clicks "Proceed to Payment"
2. System calls `/api/subscriptions/create-checkout`
3. Checkout API:
   - Ensures user record exists in database
   - Calls external subscription service
   - Creates Stripe checkout session with:
     - Initial setup fee
     - Recurring monthly subscription
     - Success URL: `/dashboard?session_id={CHECKOUT_SESSION_ID}`
     - Cancel URL: `/signup?canceled=true`
4. User redirected to Stripe hosted checkout page
5. User completes payment with credit card

**Stripe Checkout Configuration**:
- **Line Items**:
  - Setup fee (one-time)
  - Monthly subscription (recurring)
- **Payment Mode**: Subscription with setup fee
- **Metadata**: Contains userId for webhook processing

**Database State** (Before Payment):
- ✅ User record (status: `Pending`)
- ✅ User profile, address, phone, membership
- ❌ No subscription yet
- ❌ Still cannot access dashboard

---

## 🎉 **What Happens After Successful Payment**

### **Stripe Webhook Processing**
**Location**: [webhook.controller.ts](services/subscription-service/src/controllers/webhook.controller.ts) & [stripe.service.ts](services/subscription-service/src/services/stripe.service.ts)

When payment succeeds, Stripe sends a `checkout.session.completed` webhook event.

#### **1. User Status Activation**
**Code**: [stripe.service.ts:141-146](services/subscription-service/src/services/stripe.service.ts#L141-L146)

```sql
UPDATE users
SET status = 'Active', updated_at = NOW()
WHERE id = $1
```

The user's status changes from `Pending` → `Active`

#### **2. Subscription Record Created**
**Code**: [stripe.service.ts:167-183](services/subscription-service/src/services/stripe.service.ts#L167-L183)

Creates entry in `user_subscriptions` table:
- `provider`: 'stripe'
- `provider_subscription_id`: Stripe subscription ID
- `provider_customer_id`: Stripe customer ID
- `status`: 'active'
- `current_period_start`: Subscription start date
- `current_period_end`: Subscription end date

#### **3. Billing Schedule Created**
**Code**: [stripe.service.ts:186-199](services/subscription-service/src/services/stripe.service.ts#L186-L199)

Creates entry in `user_billing_schedules` table:
- `billing_cycle`: 'MONTHLY'
- `next_billing_date`: End of current period
- `amount`: Recurring monthly amount
- `is_active`: true

#### **4. Payment Method Stored**
**Code**: [stripe.service.ts:202-221](services/subscription-service/src/services/stripe.service.ts#L202-L221)

Creates entry in `user_payment_methods` table:
- `method_type`: 'card'
- `is_default`: true
- `metadata`: Contains Stripe payment details

#### **5. Queue Position Assigned**
**Code**: [stripe.service.ts:224-248](services/subscription-service/src/services/stripe.service.ts#L224-L248)

Creates entry in `membership_queue` table:
```sql
INSERT INTO membership_queue (
  user_id,
  queue_position,  -- Auto-incremented to next available position
  joined_queue_at,
  is_eligible,     -- true
  subscription_active,  -- true
  total_months_subscribed,  -- 0 (initial)
  lifetime_payment_total,   -- 0.00 (initial)
  last_payment_date,
  created_at
)
```

**This is critical**: User is now in the membership queue and eligible for future payouts!

#### **6. Payment Transaction Recorded**
Creates payment transaction record for the initial setup fee.

#### **7. Main App Notification** (Optional)
**Code**: [stripe.service.ts:149-164](services/subscription-service/src/services/stripe.service.ts#L149-L164)

Attempts to notify main app via `/api/onboarding/update-progress` that payment completed.

---

## 📊 **Final Database State After Complete Process**

After successful payment completion, the database contains:

### ✅ **users** table
```
id: uuid
authUserId: "Better Auth user ID"
email: "user@example.com"
emailVerified: true
status: "Active"  ← Changed from "Pending"
createdAt: timestamp
updatedAt: timestamp
```

### ✅ **user_profiles** table
```
userId: uuid
firstName: "John"
lastName: "Doe"
middleName: "Smith"
dateOfBirth: "1990-01-01"
```

### ✅ **user_contacts** table
```
userId: uuid
contactType: "phone"
contactValue: "+256XXXXXXXXX"
isPrimary: true
isVerified: true
```

### ✅ **user_addresses** table
```
userId: uuid
addressType: "primary"
streetAddress: "123 Main St"
city: "Kampala"
state: "Central"
postalCode: "12345"
countryCode: "UG"
isPrimary: true
```

### ✅ **user_memberships** table
```
userId: uuid
joinDate: "2025-01-01"
tenure: "0"
verificationStatus: "PENDING"
```

### ✅ **user_subscriptions** table ← **NEW**
```
userId: uuid
provider: "stripe"
providerSubscriptionId: "sub_xxxxx"
providerCustomerId: "cus_xxxxx"
status: "active"
currentPeriodStart: timestamp
currentPeriodEnd: timestamp
```

### ✅ **user_billing_schedules** table ← **NEW**
```
userId: uuid
subscriptionId: uuid
billingCycle: "MONTHLY"
nextBillingDate: timestamp (30 days from now)
amount: 25.00
currency: "USD"
isActive: true
```

### ✅ **user_payment_methods** table ← **NEW**
```
userId: uuid
methodType: "card"
providerPaymentMethodId: "sub_xxxxx"
isDefault: true
metadata: { stripe details }
```

### ✅ **membership_queue** table ← **NEW**
```
userId: uuid
queuePosition: 156 (auto-incremented)
joinedQueueAt: timestamp
isEligible: true
subscriptionActive: true
totalMonthsSubscribed: 0
lifetimePaymentTotal: 0.00
lastPaymentDate: timestamp
```

---

## 🚪 **Dashboard Access Granted**

### **Onboarding Status Check**
**Location**: [onboarding.ts:44-142](src/lib/onboarding.ts#L44-L142)

After payment, when user tries to access any page, the system checks:

```typescript
const status = await OnboardingService.getUserOnboardingStatus(userId)

// Check conditions:
if (user.status === 'Active' && status.hasActiveSubscription) {
  status.step = 'dashboard'
  status.canAccessDashboard = true  // ← USER CAN NOW ACCESS DASHBOARD
  status.nextRoute = '/dashboard'
  status.nextStep = 6 // Completed
}
```

**Conditions for Dashboard Access**:
1. ✅ `user.status === 'Active'` (set by webhook)
2. ✅ `hasActiveSubscription === true` (subscription record exists)

### **Dashboard Features Available**
**Location**: [Dashboard.tsx](src/pages/Dashboard.tsx)

Once on the dashboard, user can see:

1. **Membership Information**:
   - Member ID
   - Queue position
   - Tenure start date
   - Subscription status

2. **Payment Information**:
   - Last payment date
   - Next payment due date
   - Total amount paid
   - Payment status

3. **Dashboard Statistics**:
   - Total revenue in fund
   - Potential winners count
   - Days until next draw
   - Fund status (progress toward payout threshold)
   - Time requirement status

4. **Queue Information**:
   - Current queue position
   - Estimated time to potential payout
   - Number of members ahead

5. **Activity Feed**:
   - Recent system updates
   - Payment confirmations
   - Queue movements
   - Fund milestones

6. **Navigation to Other Features**:
   - Profile settings
   - Payment history
   - Help/support
   - Notifications

---

## 🔄 **Recurring Payments**

### **Monthly Billing**
After the initial payment, Stripe automatically charges the user monthly based on the subscription:

1. **Automatic Charge**: Stripe charges card on file
2. **Invoice Created**: Stripe creates invoice
3. **Webhook Sent**: `invoice.payment_succeeded` event
4. **System Updates**:
   - `totalMonthsSubscribed` incremented
   - `lifetimePaymentTotal` increased
   - `lastPaymentDate` updated
   - Payment transaction recorded
   - Queue statistics updated

### **Failed Payment Handling**
If monthly payment fails:
- Webhook: `invoice.payment_failed`
- System logs warning
- User notified via email
- Subscription may be marked as `past_due`

---

## 📋 **Business Logic After Completion**

### **Queue Eligibility**
**Location**: [business-logic.ts](src/lib/business-logic.ts)

User is now eligible for payout when:
1. ✅ `subscriptionActive === true`
2. ✅ `isEligible === true` (set during queue enrollment)
3. Fund reaches minimum threshold ($100,000)
4. 12+ months since business launch (already passed: Jan 1, 2024)
5. Queue position becomes eligible based on rules

### **Payout Conditions**
From business rules documentation:

**Fund Must Reach**: $100,000 minimum
- Fund grows from monthly subscriptions
- $25/month per member
- Need ~4,000 active members to reach threshold

**Time Must Pass**: 12 months from launch
- Launch: January 1, 2024
- Already satisfied as of current date

**Queue Position Matters**:
- Members selected sequentially by queue position
- Lower queue position = sooner payout eligibility
- New user gets next available position

---

## 🎯 **Summary: Complete Journey Outcome**

After completing all 5 steps:

### ✅ **User Achievements**
1. ✅ Created authenticated account
2. ✅ Verified email address
3. ✅ Completed personal profile
4. ✅ Verified phone number
5. ✅ Paid initial setup fee
6. ✅ Active monthly subscription
7. ✅ **Assigned queue position**
8. ✅ **Dashboard access granted**
9. ✅ **Eligible for future payouts**

### 💰 **Financial Status**
- **Paid**: Initial setup fee (one-time)
- **Recurring**: $25/month subscription (automatic)
- **Queue Position**: Assigned sequential number
- **Lifetime Total**: Starts at $0, increases monthly

### 🎫 **Membership Status**
- **Status**: `Active`
- **Type**: Paid member
- **Queue**: Enrolled and eligible
- **Subscription**: Active recurring billing
- **Benefits**: Full dashboard access, queue participation

### 📍 **What Happens Next**
1. User can access full dashboard immediately
2. Monthly subscriptions charged automatically
3. Queue position maintained as long as subscription active
4. When fund reaches $100,000 and member's queue position becomes eligible:
   - Member notified
   - Payout processed
   - Member receives $10,000 payment
   - Member exits queue
   - Continues monthly subscription for future rounds

---

## 🔐 **Security & Data Flow**

### **Authentication Flow**
1. Better Auth handles authentication
2. Session stored securely
3. API routes protected by session checks
4. Middleware validates user status

### **Payment Security**
1. No credit card data stored locally
2. All payments handled by Stripe
3. PCI compliance maintained
4. Webhook signature verification required

### **Data Integrity**
1. Database transactions ensure consistency
2. Failed webhook processing logged
3. Retry mechanisms for external services
4. Audit trail maintained for all actions

---

## 🚨 **Edge Cases & Error Handling**

### **Payment Fails After Checkout**
- Webhook not received or fails
- User stuck in "Pending" status
- Manual intervention required
- Support team can verify payment and update status manually

### **Duplicate Queue Entries**
- Prevented by database constraints
- `ON CONFLICT DO UPDATE` used in queue insertion
- Ensures single queue entry per user

### **Session Expires During Signup**
- User must re-authenticate
- Progress preserved in database
- Onboarding status endpoint determines correct step
- User redirected to appropriate step

### **OAuth Users (Google, etc.)**
- Skip email verification (already verified by provider)
- Start at Step 3 (Personal Info)
- Profile pre-filled from OAuth data
- Faster onboarding flow

---

## 📊 **Metrics & Tracking**

Throughout the journey, system tracks:
- Page visits (audit log)
- Signup events (audit log)
- Verification attempts
- Payment events
- Queue enrollment
- Dashboard access

All logged via [audit.ts](src/lib/audit.ts) for analytics and debugging.

---

## 🎓 **Key Takeaways**

1. **5-Step Process**: Email → Verify → Profile → Phone → Payment
2. **Critical Webhook**: Payment completion triggers queue enrollment
3. **Status Change**: `Pending` → `Active` unlocks dashboard
4. **Queue Position**: Automatically assigned on payment success
5. **Recurring Revenue**: Monthly subscriptions build the fund
6. **Dashboard Access**: Immediate after payment success
7. **Payout Eligibility**: Activated immediately, pending fund threshold

The entire system is designed as a **subscription-based membership queue** where:
- Members pay monthly to stay in queue
- Fund builds from subscriptions
- Payouts distributed when thresholds met
- Queue position determines payout order

**End Result**: User is now a fully active, paying member with a queue position and dashboard access! 🎉
