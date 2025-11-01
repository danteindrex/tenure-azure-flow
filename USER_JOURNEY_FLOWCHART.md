# User Journey Flowchart - Tenure Azure Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          START: User Visits /signup                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Email & Password Registration                              │
├─────────────────────────────────────────────────────────────────────┤
│  Input: email, password, confirmPassword, agreeToTerms              │
│  Action: Better Auth creates user account                           │
│  Database: users (status: Pending, emailVerified: false)            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Email Verification                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Input: 6-digit OTP code                                            │
│  Action: Better Auth verifies email                                 │
│  Database: users (emailVerified: true)                              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Personal Information & Address                             │
├─────────────────────────────────────────────────────────────────────┤
│  Input: firstName, lastName, middleName, dateOfBirth                │
│         streetAddress, city, state, zipCode, country                │
│  Action: POST /api/profiles/upsert                                  │
│  Database:                                                           │
│    - user_profiles (personal info)                                  │
│    - user_addresses (address)                                       │
│    - user_memberships (status: PENDING)                             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Phone Verification                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Input: phoneCountryCode, phoneNumber, OTP code                     │
│  Action: Twilio sends/verifies OTP                                  │
│  Database: user_contacts (contactType: phone, isVerified: true)     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Payment (Stripe Checkout)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Action: POST /api/subscriptions/create-checkout                    │
│          → Calls subscription service                               │
│          → Creates Stripe checkout session                          │
│  User redirected to: Stripe hosted checkout page                    │
│  Payment: Initial setup fee + Monthly subscription                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
                      ┌──────────┴──────────┐
                      │  User Pays Stripe   │
                      └──────────┬──────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STRIPE WEBHOOK: checkout.session.completed                         │
├─────────────────────────────────────────────────────────────────────┤
│  Webhook Handler: services/subscription-service/                    │
│                   controllers/webhook.controller.ts                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 1. UPDATE USER STATUS                                          ││
│  │    UPDATE users SET status = 'Active'                          ││
│  │    ✅ Pending → Active                                         ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 2. CREATE SUBSCRIPTION RECORD                                  ││
│  │    INSERT INTO user_subscriptions                              ││
│  │    - provider: stripe                                          ││
│  │    - status: active                                            ││
│  │    - subscription & customer IDs                               ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 3. CREATE BILLING SCHEDULE                                     ││
│  │    INSERT INTO user_billing_schedules                          ││
│  │    - billingCycle: MONTHLY                                     ││
│  │    - nextBillingDate: +30 days                                 ││
│  │    - amount: $25                                               ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 4. STORE PAYMENT METHOD                                        ││
│  │    INSERT INTO user_payment_methods                            ││
│  │    - methodType: card                                          ││
│  │    - isDefault: true                                           ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 5. ASSIGN QUEUE POSITION ⭐ CRITICAL                           ││
│  │    INSERT INTO membership_queue                                ││
│  │    - queuePosition: auto-incremented                           ││
│  │    - isEligible: true                                          ││
│  │    - subscriptionActive: true                                  ││
│  │    - joinedQueueAt: NOW()                                      ││
│  │    ✅ USER NOW IN QUEUE FOR PAYOUTS                            ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 6. RECORD PAYMENT TRANSACTION                                  ││
│  │    INSERT INTO payment_transactions                            ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Stripe Redirects to: /dashboard?session_id={CHECKOUT_SESSION_ID}  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ONBOARDING STATUS CHECK                                            │
├─────────────────────────────────────────────────────────────────────┤
│  API: GET /api/onboarding/status                                    │
│  Service: OnboardingService.getUserOnboardingStatus()               │
│                                                                      │
│  Checks:                                                             │
│    ✅ user.status === 'Active'                                      │
│    ✅ hasActiveSubscription === true                                │
│                                                                      │
│  Result:                                                             │
│    canAccessDashboard: true                                         │
│    nextRoute: '/dashboard'                                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  🎉 DASHBOARD ACCESS GRANTED                                        │
├─────────────────────────────────────────────────────────────────────┤
│  User Status: ACTIVE                                                │
│  Subscription: ACTIVE                                               │
│  Queue Position: ASSIGNED                                           │
│  Dashboard Features:                                                │
│    • View membership info                                           │
│    • View queue position                                            │
│    • Track payment history                                          │
│    • Monitor fund progress                                          │
│    • See payout eligibility                                         │
│    • Access profile settings                                        │
│    • View notifications                                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ONGOING: MONTHLY BILLING CYCLE                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Every 30 days:                                                     │
│    1. Stripe auto-charges card on file                             │
│    2. Webhook: invoice.payment_succeeded                           │
│    3. Update: totalMonthsSubscribed++                              │
│    4. Update: lifetimePaymentTotal += $25                          │
│    5. Update: lastPaymentDate = NOW()                              │
│    6. Maintain: queue position & eligibility                       │
│                                                                      │
│  Fund Building:                                                     │
│    • Each payment contributes to payout fund                       │
│    • Goal: Reach $100,000 minimum threshold                        │
│    • Current: Displayed on dashboard                               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FUTURE: PAYOUT ELIGIBILITY                                         │
├─────────────────────────────────────────────────────────────────────┤
│  When conditions met:                                               │
│    ✅ Fund reaches $100,000                                         │
│    ✅ 12+ months since launch (Jan 1, 2024) - already met          │
│    ✅ User's queue position becomes eligible                        │
│    ✅ Subscription remains active                                   │
│                                                                      │
│  Then:                                                               │
│    • User notified of payout eligibility                           │
│    • $10,000 payout processed                                      │
│    • User exits current queue round                                │
│    • Continues subscription for future rounds                      │
└─────────────────────────────────────────────────────────────────────┘

```

## State Transitions Summary

### User Status States
```
PENDING ──────────[Payment Success]──────────> ACTIVE
   │                                              │
   │                                              │
   └──[No dashboard access]            [Full dashboard access]──┘
```

### Database Records Timeline
```
STEP 1: users
         └─ status: Pending, emailVerified: false

STEP 2: users (updated)
         └─ emailVerified: true

STEP 3: users
         ├─ user_profiles
         ├─ user_addresses
         └─ user_memberships (status: PENDING)

STEP 4: users
         ├─ user_profiles
         ├─ user_addresses
         ├─ user_memberships
         └─ user_contacts (phone, verified)

STEP 5 (Payment): users
         ├─ user_profiles
         ├─ user_addresses
         ├─ user_memberships
         └─ user_contacts

WEBHOOK (After Payment): users (status: Active)
         ├─ user_profiles
         ├─ user_addresses
         ├─ user_memberships
         ├─ user_contacts
         ├─ user_subscriptions ⭐ NEW
         ├─ user_billing_schedules ⭐ NEW
         ├─ user_payment_methods ⭐ NEW
         └─ membership_queue ⭐ NEW (Queue Position Assigned!)
```

## Critical Success Indicators

### ✅ Registration Complete When:
- [x] User record created
- [x] Email verified
- [x] Profile completed
- [x] Phone verified
- [x] Payment processed
- [x] Webhook executed successfully
- [x] User status = Active
- [x] Subscription = Active
- [x] Queue position assigned

### 🎯 User Can Access Dashboard When:
```javascript
user.status === 'Active' && hasActiveSubscription === true
```

### 💰 User Is Eligible For Payouts When:
- [x] Queue position assigned
- [x] Subscription active
- [x] Fund >= $100,000
- [x] Time >= 12 months (already met)
- [x] Queue position becomes eligible

## Data Flow Architecture

```
┌─────────────┐
│   Browser   │
│  (SignUp)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐       ┌──────────────┐
│  Better     │◄─────►│  PostgreSQL  │
│  Auth API   │       │   Database   │
└──────┬──────┘       └──────────────┘
       │
       ▼
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│  Checkout   │──────►│ Subscription │──────►│    Stripe    │
│  API        │       │   Service    │       │     API      │
└─────────────┘       └──────┬───────┘       └──────┬───────┘
                             │                      │
                             │                      │
                             ▼                      │
                      ┌──────────────┐              │
                      │  PostgreSQL  │              │
                      │   Database   │              │
                      └──────────────┘              │
                             ▲                      │
                             │                      │
                             │      Webhook         │
                             └──────────────────────┘
```

## Key Takeaways

1. **5 Sequential Steps**: Email → Verify → Profile → Phone → Payment
2. **Critical Webhook**: Payment success webhook activates everything
3. **Status Change**: Pending → Active is the gate to dashboard
4. **Queue Position**: Automatically assigned via webhook
5. **Immediate Access**: Dashboard available right after payment
6. **Recurring Model**: Monthly subscriptions build the payout fund
7. **Payout Ready**: User immediately eligible (pending fund threshold)

**Result**: User becomes a fully active, paying member with queue position and dashboard access! 🎉
