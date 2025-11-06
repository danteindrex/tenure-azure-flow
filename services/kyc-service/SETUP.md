# KYC Microservice - Quick Setup Guide

## ✅ What's Been Created

The KYC microservice is now **fully built and ready to configure**!

### Files Created:
- ✅ Complete TypeScript microservice with Express.js
- ✅ Better Auth session validation (no JWT needed!)
- ✅ Plaid Identity Verification integration
- ✅ Exact database schema from main app (using drizzle-orm@0.44.7)
- ✅ Docker support with health checks
- ✅ API endpoints for KYC flow

## 🚀 Next Steps

### 1. Get Plaid Credentials

1. **Sign up** at https://dashboard.plaid.com/
2. Go to **Team Settings > Keys**
3. Copy your:
   - Client ID
   - Secret (Sandbox)
4. Go to **Products > Identity Verification > Templates**
5. Create a new template (enable Document + Selfie verification)
6. Copy the Template ID (starts with `idvtpl_`)

### 2. Configure Environment Variables

Edit `services/kyc-service/.env` and replace:

```bash
# Replace these placeholders:
PLAID_CLIENT_ID=your_plaid_client_id_here        # From step 1.3
PLAID_SECRET=your_plaid_secret_sandbox_here       # From step 1.3
PLAID_IDV_TEMPLATE_ID=idvtpl_xxxxx               # From step 1.5
```

**Note:** DATABASE_URL is already configured (copied from main app)

### 3. Start the Microservice

```bash
cd services/kyc-service
npm run dev
```

The service will start on **http://localhost:3002**

### 4. Test Health Check

```bash
curl http://localhost:3002/health
```

Should return:
```json
{
  "success": true,
  "service": "kyc-service",
  "status": "healthy"
}
```

## 📡 API Endpoints

All endpoints require a Better Auth session cookie.

### `POST /kyc/create-link-token`
Creates a Plaid Link token for the logged-in user

### `POST /kyc/verify`
Verifies KYC after Plaid flow completes
Body: `{ "sessionId": "idv-sandbox-xxxxx" }`

### `GET /kyc/status`
Gets the user's current KYC verification status

## 🔗 Main App Integration (Next Steps)

You'll need to create proxy endpoints in the main app at:
- `pages/api/kyc/create-link-token.ts`
- `pages/api/kyc/verify.ts`
- `pages/api/kyc/status.ts`

These will forward requests to `http://localhost:3002/kyc/*` with session cookies.

##  How Authentication Works

✅ **NO JWT tokens needed!**

1. User logs into main app → Gets Better Auth session cookie
2. Main app forwards request to KYC service with cookie
3. KYC service queries shared database to validate session
4. Session ID in cookie = `session.id` in database

## 🐳 Docker (Optional)

```bash
cd services/kyc-service
docker-compose up -d
```

## 📝 Database

Uses existing `kyc_verification` table in shared database.

**Status values:**
- `pending` - Not started
- `in_review` - Manual review needed
- `verified` - ✅ Approved
- `rejected` - ❌ Failed
- `expired` - Needs re-verification

## 🔧 Troubleshooting

### Build fails
```bash
cd services/kyc-service
rm -rf node_modules dist
npm install
npm run build
```

### Session validation fails
- Check DATABASE_URL is correct
- Ensure session exists in database
- Verify cookie name is 'better-auth.session_token'

### Plaid API errors
- Verify PLAID_CLIENT_ID and PLAID_SECRET
- Check PLAID_ENV is 'sandbox'
- Confirm template ID is correct

## ✨ Summary

**Status:** ✅ Ready to configure and start
**Port:** 3002
**Auth:** Better Auth sessions (shared DB)
**Database:** Same as main app (drizzle-orm@0.44.7)
**Provider:** Plaid Identity Verification

Just add your Plaid credentials and start the service!
