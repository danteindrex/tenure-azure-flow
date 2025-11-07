# Payout Service

A standalone microservice for managing $100,000 member reward payouts based on company revenue milestones and member tenure.

## Overview

The Payout Service handles the complete lifecycle of member payouts including:

- **Eligibility Detection**: Monitor company revenue and time requirements
- **Winner Selection**: Select eligible members based on queue position
- **Retention Fee Deduction**: Automatically deduct $300 for next year's membership
- **Approval Workflow**: Multi-level approval process for large payouts
- **Payment Processing**: Track physical payment processing (ACH/check)
- **Tax Compliance**: W-9 collection, backup withholding, 1099-MISC generation
- **Membership Management**: Remove winners from active membership after 12 months
- **Audit Trail**: Comprehensive logging of all payout operations

## Technology Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth (shared sessions with main app)
- **Email**: Nodemailer/SendGrid
- **PDF Generation**: PDFKit
- **Scheduling**: node-cron
- **Logging**: Winston

## Prerequisites

- Node.js 20 or higher
- PostgreSQL database (shared with main app)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with appropriate values

4. Run database migrations (if needed):
```bash
npm run migrate
```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The service will start on port 3002 (configurable via PORT env variable).

## Building

Build the TypeScript code:
```bash
npm run build
```

## Production

Start the production server:
```bash
npm start
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Project Structure

```
services/payout-service/
├── src/
│   ├── config/          # Configuration files (database, auth, env)
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic services
│   ├── models/          # Data models
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── server.ts        # Express app entry point
├── drizzle/
│   └── schema/          # Drizzle ORM schemas (copied from main app)
├── tests/               # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Payout Management
- `GET /api/payouts` - List all payouts (admin only)
- `GET /api/payouts/:id` - Get payout details
- `GET /api/payouts/eligibility` - Check eligibility status (admin only)
- `POST /api/payouts/check-eligibility` - Manual eligibility check (admin only)
- `GET /api/payouts/eligible-members` - List eligible members (admin only)
- `POST /api/payouts/initiate` - Create payout records (admin only)
- `POST /api/payouts/:id/approve` - Approve payout (admin only)
- `POST /api/payouts/:id/reject` - Reject payout (admin only)
- `POST /api/payouts/:id/generate-instructions` - Generate payment instructions (admin only)
- `POST /api/payouts/:id/mark-sent` - Mark payment as sent (finance only)
- `POST /api/payouts/:id/confirm` - Confirm payment completion (finance only)
- `GET /api/payouts/:id/receipt` - Download receipt PDF

### Member Endpoints
- `GET /api/members/:userId/payout` - Get member's payout status
- `POST /api/members/:userId/bank-info` - Submit bank details
- `POST /api/members/:userId/tax-info` - Submit W-9 information

### Reporting
- `GET /api/reports/payouts` - Payout summary report
- `GET /api/reports/tax-forms/:year` - Generate 1099-MISC forms
- `GET /api/reports/audit-log` - Query audit log

### Health & Monitoring
- `GET /health` - Health check
- `GET /ready` - Readiness check

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string (shared with main app)
- `PORT` - Service port (default: 3002)
- `BUSINESS_LAUNCH_DATE` - Company launch date for eligibility
- `PAYOUT_THRESHOLD` - Revenue threshold for payouts ($100,000)
- `RETENTION_FEE` - Fee deducted from payout ($300)
- `EMAIL_PROVIDER` - Email service provider (sendgrid/smtp)
- `ENCRYPTION_KEY` - Key for encrypting bank details

## Scheduled Jobs

The service runs two cron jobs:

1. **Eligibility Check** (Daily at 2 AM UTC)
   - Checks if payout conditions are met
   - Notifies admins when eligible

2. **Membership Removal** (Daily at 3 AM UTC)
   - Removes members 12 months after payout
   - Sends notification emails

## Security

- All sensitive data (bank details) encrypted at rest
- TLS 1.3 for all API communications
- Rate limiting on all endpoints
- Role-based access control (RBAC)
- Comprehensive audit logging
- Input validation using Zod schemas

## Monitoring

- Structured JSON logging with Winston
- Health check endpoints
- Correlation IDs for request tracing
- Sensitive data redaction in logs

## License

ISC
