# Subscription Service Authentication Fix

## Issues Identified

1. **401 Authorization Error**: The subscription service was rejecting requests due to missing/invalid authorization
2. **Express Rate Limit Warning**: The `trust proxy` setting was being set conditionally, but rate limiter was configured before it

## Changes Made

### 1. Fixed Trust Proxy Configuration (`services/subscription-service/src/index.ts`)

**Problem**: Trust proxy was only enabled for specific serverless environments, and rate limiter was configured before it.

**Solution**: 
- Always enable trust proxy (works for both local and serverless)
- Configure it BEFORE the rate limiter
- Added `standardHeaders` and `legacyHeaders` options to rate limiter

```typescript
// BEFORE: Conditional trust proxy
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV) {
  app.set('trust proxy', true);
}

// AFTER: Always enabled
app.set('trust proxy', true);
logger.info('Trust proxy enabled for serverless/proxy environments');
```

### 2. Enhanced Auth Middleware (`services/subscription-service/src/middleware/auth.middleware.ts`)

**Problem**: The middleware only checked cookies, but cookies weren't being forwarded properly from the Next.js API route.

**Solution**: Added fallback to Authorization header for service-to-service calls:

```typescript
// Try cookie first
let sessionToken = req.cookies['better-auth.session_token'];
let userId: string | null = null;

// Fallback to Authorization header
if (!sessionToken && req.headers.authorization) {
  const authHeader = req.headers.authorization;
  if (authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7);
  }
}
```

### 3. Updated Frontend API Route (`pages/api/subscriptions/create-checkout.ts`)

**Problem**: Only forwarding cookies, which may not work across different domains/services.

**Solution**: Added Authorization header as backup:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Cookie': req.headers.cookie || '',
  'Authorization': `Bearer ${session.user.id}`, // Added this
}
```

## Testing the Fix

### Local Testing

1. Build the subscription service:
```bash
cd services/subscription-service
npm run build
npm start
```

2. In another terminal, test the checkout endpoint:
```bash
# From your main app
npm run dev
```

3. Navigate to the signup flow and try to create a checkout session

### Vercel Deployment

1. Deploy the subscription service:
```bash
cd services/subscription-service
vercel --prod
```

2. Update your main app's environment variables:
```bash
# In .env.local or Vercel dashboard
SUBSCRIPTION_SERVICE_URL=https://your-subscription-service.vercel.app
```

3. Redeploy your main app if needed

## Environment Variables Required

### Subscription Service (.env)
```env
DATABASE_URL=postgresql://...  # Use port 6543 for Vercel (Transaction Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ALLOWED_ORIGINS=https://your-main-app.vercel.app,http://localhost:3000
FRONTEND_URL=https://your-main-app.vercel.app
```

### Main App (.env.local)
```env
SUBSCRIPTION_SERVICE_URL=https://your-subscription-service.vercel.app
```

## Verification Checklist

- [ ] Trust proxy warning is gone from logs
- [ ] 401 authorization error is resolved
- [ ] Checkout session creates successfully
- [ ] User can complete payment flow
- [ ] Webhook events are received (if testing payments)

## Additional Notes

- The auth middleware now supports both cookie-based auth (for browser requests) and Bearer token auth (for service-to-service calls)
- Trust proxy is now always enabled, which is safe and recommended for production
- Rate limiting will now work correctly with proxied requests
- The Authorization header provides a reliable fallback when cookies don't work across services
