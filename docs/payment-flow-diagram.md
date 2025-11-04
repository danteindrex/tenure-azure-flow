# Payment Flow Diagram

This diagram shows how payment data flows through the Tenure system from signup to Stripe and across different database tables.

```mermaid
flowchart TB
    %% User Actions
    User([User on SignUp Page<br/>Step 5])

    %% Frontend Layer
    SignUpPage[SignUp.tsx<br/>Step 5: Payment]

    %% Main App API Layer
    CreateCheckoutAPI[/api/subscriptions/create-checkout.ts<br/>Main App API/]

    %% Subscription Service Layer
    SubService[Subscription Service<br/>subscription-service]
    StripeController[SubscriptionController<br/>createCheckoutSession]
    StripeService[StripeService<br/>createCheckoutSession]

    %% External Services
    StripeAPI{{Stripe API<br/>stripe.checkout.sessions.create}}
    StripeCheckout[Stripe Hosted Checkout Page]
    StripeWebhook{{Stripe Webhook<br/>checkout.session.completed}}

    %% Webhook Processing
    WebhookController[WebhookController<br/>handleStripeWebhook]
    WebhookHandler[StripeService<br/>handleCheckoutComplete]

    %% Database Tables - Better Auth
    subgraph BetterAuthDB[Better Auth Tables]
        UserTable[(users table<br/>Better Auth)]
    end

    %% Database Tables - Normalized Schema
    subgraph NormalizedDB[Normalized Database Tables]
        UserProfiles[(user_profiles<br/>name, dob)]
        UserContacts[(user_contacts<br/>phone, email)]
        UserAddresses[(user_addresses<br/>address info)]
        UserMemberships[(user_memberships<br/>join_date, tenure)]
    end

    %% Database Tables - Financial
    subgraph FinancialDB[Financial Tables]
        UserSubscriptions[(user_subscriptions<br/>stripe_subscription_id<br/>status, periods)]
        UserPayments[(user_payments<br/>payment_id, invoice_id<br/>amount, status)]
        UserPaymentMethods[(user_payment_methods<br/>card info, default)]
        UserBillingSchedules[(user_billing_schedules<br/>next_billing_date<br/>amount, cycle)]
        UserAgreements[(user_agreements<br/>TOS, payment auth)]
    end

    %% Database Tables - Queue
    subgraph QueueDB[Queue Tables]
        MembershipQueue[(membership_queue<br/>position, eligible<br/>months_subscribed<br/>lifetime_total)]
    end

    %% Flow Steps
    User -->|1. Reviews fees & checks consent box| SignUpPage
    SignUpPage -->|1a. Validates payment consent| SignUpPage
    SignUpPage -->|2. POST /api/subscriptions/create-checkout<br/>userId, successUrl, cancelUrl| CreateCheckoutAPI

    CreateCheckoutAPI -->|3. Verify session| UserTable
    UserTable -->|Session valid| CreateCheckoutAPI

    CreateCheckoutAPI -->|4. Forward request| SubService
    SubService --> StripeController
    StripeController --> StripeService

    StripeService -->|5. Query user data| UserProfiles
    StripeService -->|Query contacts| UserContacts

    StripeService -->|6. Check existing subscription| UserSubscriptions
    UserSubscriptions -->|No active sub| StripeService

    StripeService -->|7. Create/Get Stripe Customer| StripeAPI
    StripeAPI -->|Customer ID| StripeService

    StripeService -->|8. Create Checkout Session<br/>$275 setup + $25/month| StripeAPI
    StripeAPI -->|Session URL + ID| StripeService

    StripeService -->|9. Return checkout URL| CreateCheckoutAPI
    CreateCheckoutAPI -->|10. Return to frontend| SignUpPage

    SignUpPage -->|11. Redirect user| StripeCheckout
    StripeCheckout -->|12. User pays with card| StripeAPI

    StripeAPI -->|13. Payment successful<br/>Send webhook event| StripeWebhook
    StripeWebhook -->|14. POST /api/webhooks/stripe<br/>checkout.session.completed| WebhookController

    WebhookController -->|15. Verify signature| StripeAPI
    WebhookController -->|16. Process event| WebhookHandler

    %% Webhook creates all records
    WebhookHandler -->|17a. Update status to Active| UserTable
    WebhookHandler -->|17b. Create subscription record| UserSubscriptions
    WebhookHandler -->|17c. Create billing schedule| UserBillingSchedules
    WebhookHandler -->|17d. Store payment method| UserPaymentMethods
    WebhookHandler -->|17e. Create payment record<br/>$300 initial payment| UserPayments
    WebhookHandler -->|17f. Add to queue<br/>position, stats| MembershipQueue
    WebhookHandler -->|17g. Create agreements<br/>TOS, payment auth| UserAgreements

    %% Recurring Payments
    StripeAPI -.->|Monthly: invoice.payment_succeeded| StripeWebhook
    StripeWebhook -.->|Process recurring payment| WebhookHandler
    WebhookHandler -.->|Update payment record<br/>$25 monthly| UserPayments
    WebhookHandler -.->|Update queue stats<br/>months++, lifetime_total| MembershipQueue
    WebhookHandler -.->|Update billing schedule| UserBillingSchedules

    %% Styling
    classDef userAction fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef frontend fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef api fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef external fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef db fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef webhook fill:#fff9c4,stroke:#f57f17,stroke-width:2px

    class User userAction
    class SignUpPage frontend
    class CreateCheckoutAPI api
    class SubService,StripeController,StripeService service
    class StripeAPI,StripeCheckout external
    class UserTable,UserProfiles,UserContacts,UserAddresses,UserMemberships,UserSubscriptions,UserPayments,UserPaymentMethods,UserBillingSchedules,UserAgreements,MembershipQueue db
    class StripeWebhook,WebhookController,WebhookHandler webhookt
```

## Payment Flow Summary

### Initial Payment Setup ($300)
1. **User initiates payment** on SignUp Step 5
2. **Frontend calls** `/api/subscriptions/create-checkout`
3. **Main app verifies** session in Better Auth `users` table
4. **Request forwarded** to Subscription Service
5. **Service queries** user data from `user_profiles` and `user_contacts`
6. **Service checks** for existing subscription in `user_subscriptions`
7. **Stripe Customer** created or retrieved via Stripe API
8. **Checkout Session** created with:
   - $275 one-time setup fee
   - $25/month recurring subscription
9. **User redirected** to Stripe Hosted Checkout
10. **User completes payment** with credit card

### Webhook Processing (After Payment)
11. **Stripe sends webhook** `checkout.session.completed`
12. **Webhook handler** verifies signature and processes event
13. **Multiple database updates** happen atomically:
    - `users` → status = 'Active'
    - `user_subscriptions` → Stripe subscription ID, periods, status
    - `user_billing_schedules` → next billing date ($25/month)
    - `user_payment_methods` → card info stored
    - `user_payments` → $300 initial payment record
    - `membership_queue` → user added with position, stats
    - `user_agreements` → TOS and payment authorization

### Recurring Payments ($25/month)
14. **Stripe auto-charges** monthly via saved payment method
15. **Webhook** `invoice.payment_succeeded` sent
16. **Service updates**:
    - `user_payments` → new $25 payment record
    - `membership_queue` → increment months_subscribed, update lifetime_total
    - `user_billing_schedules` → next billing date

## Key Database Tables

### Financial Tables
- **user_subscriptions**: Stripe subscription tracking (status, periods)
- **user_payments**: Payment history (initial $300, recurring $25)
- **user_payment_methods**: Stored card information
- **user_billing_schedules**: Next billing date and amount

### Queue Tables
- **membership_queue**: Position, eligibility, payment stats (months subscribed, lifetime total)

### User Tables
- **users** (Better Auth): Authentication and status
- **user_profiles**: Personal information
- **user_contacts**: Phone and email
- **user_addresses**: Physical address

### Compliance Tables
- **user_agreements**: TOS and payment authorization records

## Stripe Webhook Events Handled
1. `checkout.session.completed` → Initial payment + subscription setup
2. `invoice.payment_succeeded` → Recurring monthly payments
3. `customer.subscription.updated` → Subscription status changes
4. `customer.subscription.deleted` → Subscription cancellation (removes from queue)
5. `invoice.payment_failed` → Payment failure (logged)
