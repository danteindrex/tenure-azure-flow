# KYC Microservice

Identity Verification microservice supporting both Plaid Identity Verification (IDV) and Sumsub WebSDK for KYC compliance.

## Features

- ✅ **Dual Provider Support**: Plaid Identity Verification (IDV) and Sumsub WebSDK
- ✅ **Environment-based Provider Switching**: Switch between providers via `KYC_PROVIDER` env var
- ✅ **Unified API**: Same endpoints work with both providers
- ✅ **Audit Compliance**: Sumsub provides comprehensive audit APIs and data access
- ✅ Better Auth session validation (shared with main app)
- ✅ Shared database using Drizzle ORM
- ✅ TypeScript + Express.js
- ✅ Docker support
- ✅ Health check endpoint

## Architecture

This microservice:
- Runs independently on port **3002**
- Shares the same PostgreSQL database with the main app
- Validates Better Auth sessions via cookies
- Stores KYC verification results in `kyc_verification` table

## Prerequisites

### For Plaid Integration
1. **Plaid Account** - Sign up at https://dashboard.plaid.com/
2. **Plaid IDV Template** - Create a template in the Plaid Dashboard

### For Sumsub Integration
1. **Sumsub Account** - Sign up at https://sumsub.com/
2. **Sumsub API Credentials** - Get App Token and Secret Key from dashboard
3. **Webhook Configuration** - Configure webhook URL in Sumsub dashboard

### General Requirements
- **Node.js 18+**
- **PostgreSQL** (shared with main app)

## Setup

### 1. Install Dependencies

```bash
cd services/kyc-service
npm install
```

### 2. Configure Environment Variables

Copy `.env.template` to `.env` and fill in your Plaid credentials:

```bash
# Get from: https://dashboard.plaid.com/team/keys
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret_sandbox
PLAID_ENV=sandbox

# Get from: https://dashboard.plaid.com/identity-verification/templates
PLAID_IDV_TEMPLATE_ID=idvtpl_xxxxx

# Database (same as main app)
DATABASE_URL=postgresql://...
```

### 3. Run Development Server

```bash
npm run dev
```

The service will start on http://localhost:3002

## API Endpoints

All endpoints require a valid Better Auth session cookie.

### `GET /health`
Health check endpoint

**Response:**
```json
{
  "success": true,
  "service": "kyc-service",
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### `POST /kyc/create-link-token`
Create a verification token for Identity Verification (Plaid Link token or Sumsub access token)

**Headers:**
```
Cookie: better-auth.session_token=xxxxx
```

**Response (Plaid):**
```json
{
  "success": true,
  "data": {
    "linkToken": "link-sandbox-xxxxx",
    "expiration": "2025-01-15T11:00:00Z",
    "provider": "plaid"
  }
}
```

**Response (Sumsub):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2025-01-15T11:00:00Z",
    "applicantId": "applicant_123",
    "provider": "sumsub"
  }
}
```

### `POST /kyc/verify`
Verify KYC using session ID (Plaid) or applicant ID (Sumsub) and store results

**Headers:**
```
Cookie: better-auth.session_token=xxxxx
Content-Type: application/json
```

**Body (Plaid):**
```json
{
  "sessionId": "idv-sandbox-xxxxx"
}
```

**Body (Sumsub):**
```json
{
  "applicantId": "applicant_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "verified",
    "verifiedAt": "2025-01-15T10:30:00.000Z",
    "riskScore": 0
  }
}
```

### `GET /kyc/status`
Get user's current KYC verification status

**Headers:**
```
Cookie: better-auth.session_token=xxxxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "verified",
    "verified": true,
    "verifiedAt": "2025-01-15T10:30:00.000Z",
    "verificationProvider": "sumsub",
    "riskScore": 15,
    "createdAt": "2025-01-15T10:25:00.000Z"
  }
}
```

### `POST /kyc/webhook/applicant-reviewed` (Sumsub Only)
Webhook endpoint for receiving Sumsub verification status updates

**Headers:**
```
Content-Type: application/json
X-Signature: sumsub-signature
```

**Body:**
```json
{
  "type": "applicantReviewed",
  "applicantId": "applicant_123",
  "reviewStatus": "completed",
  "reviewResult": { ... },
  "createdAtMs": 1640995200000
}
```

### Admin Audit Endpoints (Sumsub Only)

#### `GET /kyc/admin/applicant/:applicantId`
Get full applicant data for audit purposes

#### `GET /kyc/admin/applicant/:applicantId/status`
Get applicant status for audit purposes

## Docker

### Build Image

```bash
docker build -t kyc-service .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

## Integration with Main App

The main app should create proxy endpoints that forward requests to this microservice:

```typescript
// pages/api/kyc/create-link-token.ts
const response = await fetch('http://localhost:3002/kyc/create-link-token', {
  method: 'POST',
  headers: {
    'Cookie': req.headers.cookie || ''
  }
})
```

## Database Schema

Uses the existing `kyc_verification` table:

- `user_id` - Foreign key to users table
- `status` - pending | in_review | verified | rejected | expired
- `verification_provider` - 'plaid'
- `provider_verification_id` - Plaid session ID
- `verification_data` - Full Plaid response (JSON)
- `risk_score` - 0-100 (lower is better)
- `verified_at` - Timestamp

## Provider Setup Guide

### Plaid Setup
1. Sign up at https://dashboard.plaid.com/
2. Go to **Team Settings > Keys** to get your Client ID and Secret
3. Go to **Products > Identity Verification > Templates**
4. Create a new template with:
    - Document Verification (enabled)
    - Selfie Check (enabled)
    - Data Source Verification (optional)
5. Copy the Template ID (starts with `idvtpl_`)

### Sumsub Setup
1. Sign up at https://sumsub.com/
2. Go to **Developer > API Credentials** to get your App Token and Secret Key
3. Go to **Webhooks** section and add webhook URL:
   ```
   https://yourdomain.com/api/kyc/webhook
   ```
4. Select these webhook events:
   - `applicantReviewed` (required)
   - `applicantCreated` (optional)
   - `applicantPending` (optional)
5. Set the verification level name (default: "Home solutions verify")

## Security

- ✅ Session-based authentication (no JWT needed)
- ✅ CORS configured for main app origin only
- ✅ Cookies are httpOnly and signed
- ✅ Database credentials not exposed
- ✅ Plaid secrets in environment variables

## Troubleshooting

### Session validation fails
- Ensure cookie is being forwarded from main app
- Check that database connection is working
- Verify session exists in `session` table

### Plaid API errors
- Check Plaid credentials in .env
- Ensure PLAID_ENV is set to 'sandbox'
- Verify template ID is correct

### Database connection issues
- Confirm DATABASE_URL is correct
- Check SSL settings for Supabase
- Verify network connectivity

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3002` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `KYC_PROVIDER` | KYC provider (`plaid` or `sumsub`) | `sumsub` |
| `PLAID_CLIENT_ID` | Plaid client ID | `xxxxx` |
| `PLAID_SECRET` | Plaid secret (sandbox) | `xxxxx` |
| `PLAID_ENV` | Plaid environment | `sandbox` |
| `PLAID_IDV_TEMPLATE_ID` | Plaid template ID | `idvtpl_xxxxx` |
| `SUMSUB_APP_TOKEN` | Sumsub app token | `sbx:...` |
| `SUMSUB_SECRET_KEY` | Sumsub secret key | `xxxxx` |
| `SUMSUB_BASE_URL` | Sumsub API base URL | `https://api.sumsub.com` |
| `SUMSUB_LEVEL_NAME` | Sumsub verification level | `Home solutions verify` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

## License

MIT
