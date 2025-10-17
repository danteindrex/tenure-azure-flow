# Subscription Service - Setup Guide

Complete setup instructions for the Subscription Service microservice.

## 📋 Prerequisites

- Node.js 18+ or Docker
- PostgreSQL database (Supabase)
- Stripe test account
- Frontend application running

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd services/subscription-service
npm install
```

### 2. Environment Setup

The `.env` file is already created with your credentials. Verify it contains:

```env
DATABASE_URI=your_postgresql_database_uri_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

### 3. Start the Service

**Development:**
```bash
npm run dev
```

**Production (Docker):**
```bash
docker-compose up -d
```

The service will start on `http://localhost:3001`

## 🔧 Configure Stripe Webhooks

### Option 1: Local Development with Stripe CLI

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

4. Copy the webhook signing secret from the output:
```
> Ready! Your webhook signing secret is whsec_xxxxx
```

5. Update `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

6. Restart the service

### Option 2: Production Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the "Signing secret"
7. Update `.env` with the webhook secret

## 🎨 Frontend Integration

### 1. Install Stripe.js in Frontend

```bash
cd ../../frontend
npm install @stripe/stripe-js
```

### 2. Add Environment Variable

Create/update `frontend/.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
NEXT_PUBLIC_SUBSCRIPTION_SERVICE_URL=http://localhost:3001
```

### 3. Navigate to Subscribe Page

The subscribe page is already created at `/subscribe`. Users can:
- View subscription pricing
- See payout details
- Click "Subscribe Now" to start checkout

## 🧪 Testing the Integration

### 1. Start Both Services

Terminal 1 (Subscription Service):
```bash
cd services/subscription-service
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Terminal 3 (Stripe Webhooks):
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

### 2. Test Subscription Flow

1. Go to `http://localhost:3000/subscribe`
2. Click "Subscribe Now"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Expiry: Any future date (e.g., 12/25)
5. CVC: Any 3 digits (e.g., 123)
6. Complete checkout
7. You'll be redirected to dashboard

### 3. Verify in Database

```bash
psql $DATABASE_URI
```

```sql
-- Check subscription was created
SELECT * FROM subscription ORDER BY created_at DESC LIMIT 1;

-- Check payment was recorded
SELECT * FROM payment ORDER BY payment_date DESC LIMIT 1;

-- Check queue was updated
SELECT * FROM queue WHERE subscription_active = true;
```

## 📊 API Testing with cURL

### Create Checkout Session

```bash
curl -X POST http://localhost:3001/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "successUrl": "http://localhost:3000/dashboard",
    "cancelUrl": "http://localhost:3000/subscribe"
  }'
```

### Get Subscription

```bash
curl http://localhost:3001/api/subscriptions/1
```

### Get Payment History

```bash
curl http://localhost:3001/api/subscriptions/1/payments
```

### Cancel Subscription

```bash
curl -X POST http://localhost:3001/api/subscriptions/1/cancel \
  -H "Content-Type: application/json" \
  -d '{"immediately": false}'
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql your_postgresql_database_uri_here -c "SELECT NOW();"
```

### Stripe Webhook Not Working

1. Check webhook secret is set in `.env`
2. Ensure Stripe CLI is running
3. Check service logs for errors
4. Verify webhook endpoint is accessible

### CORS Issues

Add your frontend URL to `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,https://your-production-domain.com
```

## 📈 Monitoring

### View Logs

```bash
# Development
npm run dev

# Docker
docker-compose logs -f subscription-service
```

### Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "subscription-service",
  "timestamp": "2025-10-17T..."
}
```

## 🚢 Production Deployment

### Docker

```bash
# Build
docker build -t subscription-service:latest .

# Run
docker run -d \
  -p 3001:3001 \
  --env-file .env \
  --name subscription-service \
  subscription-service:latest
```

### Environment Variables for Production

Update `.env` for production:

```env
NODE_ENV=production
PORT=3001
DATABASE_URI=your_production_database_url
STRIPE_SECRET_KEY=sk_live_...  # Use live key
STRIPE_WEBHOOK_SECRET=whsec_... # Production webhook secret
ALLOWED_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## 🔐 Security Checklist

- [ ] Use production Stripe keys in production
- [ ] Set strong webhook secret
- [ ] Enable HTTPS for production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Monitor error logs
- [ ] Set up alerts for failed payments

## 🎉 You're Done!

Your subscription service is ready. Members can now:
1. Subscribe for $325 (first month) + $25/month
2. Track their subscription status
3. View payment history
4. Cancel or reactivate subscriptions

All subscription data is automatically synced with the queue system for payout eligibility tracking.
