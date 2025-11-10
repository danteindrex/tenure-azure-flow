# Home Solutions

A full-stack membership rewards platform where members compete for $100,000 payouts based on continuous tenure length. Members pay a one-time $300 joining fee and $25/month to participate in a queue-based reward system.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Business Rules](#business-rules)
- [Documentation](#documentation)

## Overview

### What is Home Solutions?

Home Solutions is a membership-based rewards platform where members compete for substantial payouts ($100,000) based on the length of their continuous membership tenure. The system uses a fair, queue-based approach where:

- Members pay $300 one-time joining fee + $25/month
- Winners are selected based on longest continuous tenure
- Payouts occur when the fund reaches $100K (12+ months after launch)
- Multiple winners possible as revenue grows
- Missed payments result in immediate disqualification

### Key Stats

- **10 Core Business Rules** - Fully implemented and tested
- **100+ Test Cases** - Comprehensive security and functionality coverage
- **47+ API Endpoints** - RESTful API for all operations
- **4 Microservices** - Subscription, KYC, Payout, and Admin services
- **Multiple Auth Methods** - Email/Password, OAuth, Passkeys, 2FA

## Features

### Member Features

- **Queue Position Tracking** - Real-time position in the tenure-based queue
- **Payment Management** - Stripe-powered subscription handling
- **Identity Verification** - Plaid-powered KYC with document + selfie verification
- **Dashboard** - Comprehensive member dashboard with payment status and notifications
- **Profile Management** - Full profile, security, and preference management
- **Multi-Factor Auth** - Email OTP, SMS, 2FA, Passkeys, and OAuth support

### Business Features

- **Dynamic Queue System** - Database view for optimal performance (100x faster)
- **Payment-Based Tenure** - Tenure starts from joining fee payment date
- **Automated Enforcement** - Business rules enforced automatically
- **Grace Periods** - 30-day grace period for failed payments
- **Winner Selection** - Fair tie-breaking algorithm
- **Fund Tracking** - Real-time fund progress monitoring

### Security Features

- **Session-Based Auth** - Secure HTTP-only cookies
- **OWASP Compliance** - Protection against Top 10 vulnerabilities
- **Rate Limiting** - DDoS and brute-force protection
- **KYC Verification** - Plaid Identity Verification with liveness detection
- **Audit Logging** - Comprehensive system and user activity logs
- **Multi-Factor Authentication** - TOTP, SMS, and backup codes

## Technology Stack

### Frontend

- **Framework**: Next.js 15.5.6 (React 18.3.1)
- **Language**: TypeScript 5.8.3
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **State Management**: TanStack React Query
- **Theme**: next-themes (dark/light mode)

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes + Express.js microservices
- **Authentication**: Better Auth 1.4.0-beta.15
- **ORM**: Drizzle ORM 0.44.7
- **Database**: PostgreSQL (Supabase)
- **Validation**: Zod

### External Services

- **Payments**: Stripe (Checkout + Subscriptions + Webhooks)
- **KYC**: Plaid Identity Verification
- **SMS**: Twilio Verify
- **Email**: Gmail SMTP (Nodemailer)
- **OAuth**: Google OAuth 2.0

### Testing

- **E2E**: Playwright
- **Unit Tests**: Vitest
- **Coverage**: 100+ comprehensive test cases

### DevOps

- **Deployment**: Vercel
- **Containerization**: Docker
- **Version Control**: Git
- **CI/CD**: Vercel automatic deployments

## Architecture

### Project Structure

```
tenure-azure-flow/
├── pages/                      # Next.js Pages Router
│   ├── api/                   # API routes (47+ endpoints)
│   │   ├── auth/              # Better Auth endpoints
│   │   ├── subscriptions/     # Stripe payment endpoints
│   │   ├── kyc/               # KYC verification endpoints
│   │   ├── business-rules/    # Business logic enforcement
│   │   └── webhooks/          # Stripe webhook handlers
│   ├── dashboard/             # Member dashboard pages
│   ├── auth/                  # Authentication pages
│   └── signup/                # Signup flow
├── src/
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── security/         # Auth components
│   │   └── profile/          # Profile management
│   ├── lib/                  # Utilities and configurations
│   ├── hooks/                # Custom React hooks
│   └── contexts/             # React context providers
├── drizzle/                   # Database schema and migrations
│   ├── schema/               # Table definitions (11 files)
│   └── migrations/           # SQL migrations
├── services/                  # Microservices
│   ├── subscription-service/ # Stripe payments (port 3001)
│   ├── kyc-service/          # KYC verification (port 3002)
│   ├── payout-service/       # Payout management
│   ├── Tenure-queue/         # Queue processing
│   └── admin/                # Admin panel (port 3003)
├── lib/                       # Server-side utilities
├── tests/                     # E2E and unit tests
└── docs/                      # Documentation
```

### Microservices Architecture

The platform uses a hybrid monolith + microservices architecture:

- **Main App** (port 3000): Next.js app with frontend and core APIs
- **Subscription Service** (port 3001): Stripe payment processing
- **KYC Service** (port 3002): Plaid identity verification
- **Admin Service** (port 3003): Admin panel and management
- **Shared Database**: PostgreSQL with Drizzle ORM

### Database Schema

11 schema files organizing the database:

1. **auth.ts** - Better Auth tables (user, session, account, verification, 2FA, passkeys)
2. **users.ts** - User profiles, contacts, addresses, memberships
3. **settings.ts** - User preferences (notifications, security, privacy, appearance)
4. **financial.ts** - Payment methods, subscriptions, payments, billing schedules
5. **membership.ts** - Queue management, KYC verification, payouts, disputes
6. **compliance.ts** - Tax forms, transaction monitoring, verification codes
7. **audit.ts** - System and user audit logs
8. **organizations.ts** - Team/organization management
9. **admin.ts** - Admin users, sessions, alerts, CMS
10. **verification.ts** - Verification code management
11. **index.ts** - Schema exports

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Stripe account (test mode for development)
- Plaid account (sandbox for development)
- Twilio account (for SMS verification)
- Google Cloud Console project (for OAuth)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd tenure-azure-flow
```

2. **Install dependencies**

```bash
# Install main app dependencies
npm install

# Install microservice dependencies
cd services/subscription-service && npm install && cd ../..
cd services/kyc-service && npm install && cd ../..
cd services/admin && npm install && cd ../..
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory (use `.env.example` as template):

```env
# Database
DATABASE_URL=postgresql://user:password@host:6543/database

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Home Solutions

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Plaid
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_IDV_TEMPLATE_ID=your-template-id

# Service URLs
NEXT_PUBLIC_SUBSCRIPTION_SERVICE_URL=http://localhost:3001
SUBSCRIPTION_SERVICE_URL=http://localhost:3001
KYC_SERVICE_URL=http://localhost:3002
NEXT_PUBLIC_ADMIN_URL=http://localhost:3003
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Business
NEXT_PUBLIC_BUSINESS_LAUNCH_DATE=2025-01-01
```

4. **Set up the database**

```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Drizzle Studio to view database
npm run db:studio
```

5. **Configure Stripe webhooks**

For local development, use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret to your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## Development

### Running the Application

**Option 1: Run all services**

```bash
# Terminal 1: Main Next.js app
npm run dev:next

# Terminal 2: Subscription service
cd services/subscription-service && npm run dev

# Terminal 3: KYC service
cd services/kyc-service && npm run dev

# Terminal 4: Admin service
cd services/admin && npm run dev
```

**Option 2: Run main app only**

```bash
npm run dev:next
```

### Available Scripts

```bash
# Development
npm run dev:next              # Start Next.js dev server (port 3000)
npm run build:next            # Build Next.js for production
npm run start:next            # Start Next.js production server

# Database
npm run db:generate           # Generate Drizzle migrations
npm run db:push              # Push schema to database
npm run db:studio            # Open Drizzle Studio

# Testing
npm run test                 # Run unit tests
npm run test:e2e             # Run Playwright E2E tests
npm run test:e2e:ui          # Run E2E tests with UI

# Linting & Formatting
npm run lint                 # Run ESLint
```

### Testing SMS Functionality

Test the Twilio SMS integration:

```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"+15551234567","body":"Test message"}'
```

### Database Management

**View database with Drizzle Studio:**

```bash
npm run db:studio
```

Access at [https://local.drizzle.studio](https://local.drizzle.studio)

**Run migrations:**

```bash
npm run db:push
```

## Deployment

### Vercel Deployment

1. **Connect repository to Vercel**

   - Import your Git repository in Vercel dashboard
   - Select the root directory as the project root

2. **Configure environment variables**

   Add all environment variables from `.env.local` to Vercel:
   - Go to Project Settings → Environment Variables
   - Add all variables (use production values)

3. **Deploy**

   ```bash
   # Deploy to production
   vercel --prod
   ```

### Microservices Deployment

Each microservice can be deployed separately:

1. **Subscription Service**: Deploy to Vercel or Docker container
2. **KYC Service**: Deploy to Vercel or Docker container
3. **Admin Service**: Deploy to Vercel or Docker container

Update service URLs in environment variables to point to production endpoints.

### Database Setup

1. **Create PostgreSQL database** (Supabase recommended)
2. **Configure connection pooling** (use transaction mode port 6543)
3. **Run migrations**: `npm run db:push`
4. **Verify schema**: Use Drizzle Studio or direct SQL client

### Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Business Rules

The platform implements 10 core business rules:

### BR-1: One-Time Joining Fee
- $300 one-time payment required to join
- Includes first month of membership

### BR-2: Monthly Recurring Fee
- $25/month subscription fee
- Charged automatically via Stripe

### BR-3: Payout Trigger
- Requires $100K in fund
- Minimum 12 months from business launch date

### BR-4: Reward Amount
- $100,000 per winner
- Multiple winners possible when fund allows

### BR-5: Winner Determination
- Based on longest continuous tenure
- Excludes canceled/defaulted members
- Excludes previous winners

### BR-6: Multiple Winners
- Additional winners selected as fund grows
- Each winner receives $100K

### BR-7: Retention Requirement
- Members must pre-pay 12 months to be eligible
- Verified via payment history

### BR-8: Default Penalty
- Missed payment = immediate loss of position
- 30-day grace period before cancellation

### BR-9: Tenure Start Date
- Tenure begins from joining fee payment date
- NOT from signup date

### BR-10: Tie-Breaker
- If multiple members have same tenure
- Winner = lowest member ID (first to pay)

## Documentation

Comprehensive documentation available in the `/docs` directory:

- [Authentication Analysis](docs/auth-analysis-corrected.md) - Auth system deep dive
- [Business Logic](docs/business-logic.md) - Business rules implementation
- [KYC Integration](docs/plaid-kyc-setup.md) - Plaid setup guide
- [Stripe Setup](docs/stripe-webhook-setup.md) - Payment integration
- [Quick Start](docs/quickstart-tenure.md) - Getting started guide
- [Pricing Structure](docs/pricing-structure.md) - Fee breakdown
- [Test Results](docs/test-results-2025-01-26.md) - Test coverage analysis

## Authentication System

### Supported Methods

1. **Email/Password** - Traditional auth with 6-digit OTP verification
2. **Google OAuth** - Social login with account linking
3. **Passkeys** - WebAuthn/biometric authentication
4. **Two-Factor Auth** - TOTP with backup codes

### Security Features

- Session-based authentication (not JWT)
- HTTP-only secure cookies
- Rate limiting protection
- SQL injection prevention
- XSS attack prevention
- CSRF protection
- User enumeration protection
- Session fixation prevention

### Account Linking

Users can link multiple authentication methods:
- OAuth users can add password later
- Multiple passkeys per account
- 2FA optional for all methods

## API Overview

### Authentication Endpoints

- `POST /api/auth/sign-in/email` - Email/password login
- `POST /api/auth/sign-up/email` - Email/password signup
- `GET /api/auth/sign-in/social` - OAuth login
- `POST /api/auth/passkey/register` - Register passkey
- `POST /api/auth/two-factor/enable` - Enable 2FA

### Payment Endpoints

- `POST /api/subscriptions/create-checkout` - Create Stripe checkout
- `POST /api/subscriptions/verify-payment` - Verify payment completion
- `POST /api/webhooks/stripe` - Stripe webhook handler

### KYC Endpoints

- `POST /api/kyc/create-link-token` - Get Plaid Link token
- `POST /api/kyc/verify` - Submit verification
- `GET /api/kyc/status` - Check verification status

### User Management

- `POST /api/profiles/upsert` - Update profile
- `GET /api/user/preferences` - Get user preferences
- `POST /api/user/export` - Export user data

### Business Rules

- `GET /api/business-rules/payout-conditions` - Check eligibility
- `GET /api/business-rules/payment-status` - Payment compliance
- `GET /api/business-rules/continuous-tenure` - Tenure validation

### Queue & Dashboard

- `GET /api/queue` - Get queue positions
- `GET /api/queue/statistics` - Queue statistics
- `GET /api/dashboard/*` - Dashboard data

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues and questions:
- Check the [documentation](docs/)
- Review [test results](docs/test-results-2025-01-26.md)
- Contact the development team

---

Built with Next.js, TypeScript, Drizzle ORM, Better Auth, Stripe, and Plaid.
