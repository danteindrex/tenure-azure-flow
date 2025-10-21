# Vercel Deployment Guide

Complete guide to deploy all services to Vercel with proper configuration.

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed

## Install Vercel CLI

```bash
npm install -g vercel
```

## Login to Vercel

```bash
vercel login
```

---

## 1. Deploy Subscription Service

### Step 1: Build the Service

```bash
cd services/subscription-service
npm install
npm run build
```

### Step 2: Deploy to Vercel

```bash
vercel --prod
```

**Follow the prompts:**
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **subscription-service**
- Directory? **./services/subscription-service** (or just press Enter if already there)

### Step 3: Add Environment Variables

```bash
vercel env add DATABASE_URI
# Paste: your_postgresql_database_uri_here

vercel env add STRIPE_SECRET_KEY
# Paste: your_stripe_secret_key_here

vercel env add STRIPE_PUBLISHABLE_KEY
# Paste: your_stripe_publishable_key_here

vercel env add STRIPE_WEBHOOK_SECRET
# Leave blank for now (we'll add after setting up webhook)

vercel env add PORT
# Paste: 3001

vercel env add NODE_ENV
# Paste: production

vercel env add INITIAL_PAYMENT_AMOUNT
# Paste: 325

vercel env add RECURRING_PAYMENT_AMOUNT
# Paste: 25

vercel env add CURRENCY
# Paste: usd

vercel env add FRONTEND_URL
# Paste: https://your-frontend-url.vercel.app (we'll update this after deploying frontend)

vercel env add ALLOWED_ORIGINS
# Paste: https://your-frontend-url.vercel.app (we'll update this after deploying frontend)
```

### Step 4: Redeploy with Environment Variables

```bash
vercel --prod
```

**Save the URL!** It will look like: `https://subscription-service-xxxx.vercel.app`

---

## 2. Deploy Frontend Service

### Step 1: Install Dependencies

```bash
cd ../frontend
npm install
npm install @stripe/stripe-js
```

### Step 2: Deploy to Vercel

```bash
vercel --prod
```

**Follow the prompts:**
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **home-solutions-frontend**
- Directory? **./services/frontend**

### Step 3: Add Environment Variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste: your_supabase_url_here

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste: your_supabase_anon_key_here

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste: your_supabase_service_role_key_here

vercel env add SUPABASE_JWT_SECRET
# Paste: your_supabase_jwt_secret_here

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Paste: your_stripe_publishable_key_here

vercel env add NEXT_PUBLIC_SUBSCRIPTION_SERVICE_URL
# Paste: https://subscription-service-xxxx.vercel.app (your subscription service URL from step 1)
```

### Step 4: Redeploy

```bash
vercel --prod
```

**Save the URL!** It will look like: `https://home-solutions-frontend-xxxx.vercel.app`

---

## 3. Update Subscription Service with Frontend URL

Now that you have the frontend URL, update the subscription service:

```bash
cd ../subscription-service

# Update FRONTEND_URL
vercel env rm FRONTEND_URL production
vercel env add FRONTEND_URL
# Paste: https://home-solutions-frontend-xxxx.vercel.app

# Update ALLOWED_ORIGINS
vercel env rm ALLOWED_ORIGINS production
vercel env add ALLOWED_ORIGINS
# Paste: https://home-solutions-frontend-xxxx.vercel.app

# Redeploy
vercel --prod
```

---

## 4. Deploy Admin Service

### Step 1: Install Dependencies

```bash
cd ../admin/home-solutions-admin
pnpm install
```

### Step 2: Deploy to Vercel

```bash
vercel --prod
```

**Follow the prompts:**
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **home-solutions-admin**

### Step 3: Add Environment Variables

```bash
vercel env add DATABASE_URI
# Paste: your_postgresql_database_uri_here

vercel env add PAYLOAD_SECRET
# Paste: your_payload_secret_here
```

### Step 4: Redeploy

```bash
vercel --prod
```

**Save the URL!** It will look like: `https://home-solutions-admin-xxxx.vercel.app`

---

## 5. Configure Stripe Webhook

Now that your subscription service is deployed, configure the webhook:

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://subscription-service-xxxx.vercel.app/api/webhooks/stripe`
4. Description: "Subscription Service Webhook"
5. Select events to listen to:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click "Add endpoint"
7. **Copy the Signing secret** (starts with `whsec_`)

### Add Webhook Secret to Subscription Service

```bash
cd services/subscription-service

vercel env add STRIPE_WEBHOOK_SECRET
# Paste: whsec_your_webhook_secret_here

# Redeploy
vercel --prod
```

---

## 6. Test Your Deployment

### Test Subscription Service Health

```bash
curl https://subscription-service-xxxx.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "subscription-service",
  "timestamp": "..."
}
```

### Test Frontend

Visit: `https://home-solutions-frontend-xxxx.vercel.app/subscribe`

### Test Full Subscription Flow

1. Go to subscribe page
2. Click "Subscribe Now"
3. Use test card: **4242 4242 4242 4242**
4. Complete checkout
5. Check Stripe Dashboard for the subscription
6. Check database for records:

```bash
psql your_postgresql_database_uri_here

SELECT * FROM subscription ORDER BY created_at DESC LIMIT 1;
SELECT * FROM payment ORDER BY payment_date DESC LIMIT 1;
SELECT * FROM queue WHERE subscription_active = true;
```

---

## Summary of URLs

After deployment, you'll have:

| Service | URL | Purpose |
|---------|-----|---------|
| **Subscription Service** | `https://subscription-service-xxxx.vercel.app` | Handles Stripe subscriptions, webhooks |
| **Frontend** | `https://home-solutions-frontend-xxxx.vercel.app` | Member-facing website |
| **Admin** | `https://home-solutions-admin-xxxx.vercel.app` | Admin CMS panel |

---

## Webhook URL for Stripe

Use this URL in Stripe Dashboard:
```
https://subscription-service-xxxx.vercel.app/api/webhooks/stripe
```

---

## Troubleshooting

### Deployment fails

Check build logs:
```bash
vercel logs <deployment-url>
```

### Environment variables not working

List current env vars:
```bash
vercel env ls
```

Remove and re-add:
```bash
vercel env rm <VAR_NAME> production
vercel env add <VAR_NAME>
```

### Database connection issues

Ensure DATABASE_URI is correctly set and SSL is configured in the connection string.

### Webhook not receiving events

1. Check webhook is active in Stripe Dashboard
2. Verify webhook URL is correct
3. Check subscription service logs: `vercel logs`
4. Ensure STRIPE_WEBHOOK_SECRET is set correctly

---

## Quick Deployment Script

Create a file `deploy-all.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying Subscription Service..."
cd services/subscription-service
npm install && npm run build
vercel --prod

echo "🚀 Deploying Frontend..."
cd ../frontend
npm install
vercel --prod

echo "🚀 Deploying Admin..."
cd ../admin/home-solutions-admin
pnpm install
vercel --prod

echo "✅ All services deployed!"
echo "Remember to:"
echo "1. Update environment variables"
echo "2. Configure Stripe webhook"
echo "3. Test the full flow"
```

Run with:
```bash
chmod +x deploy-all.sh
./deploy-all.sh
```

---

## Done!

All three services are now deployed to Vercel with public URLs. The subscription service can receive Stripe webhooks, and everything is connected!
