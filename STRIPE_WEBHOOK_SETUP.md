# Stripe Webhook Setup - URGENT FIX

## Problem
Your Stripe webhook is NOT configured, so payment completions are never processed. This causes users to get stuck in an infinite polling loop after payment.

## Solution: Add Webhook in Stripe Dashboard

### Step 1: Go to Stripe Dashboard
1. Open: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"** button

### Step 2: Configure the Endpoint
**Endpoint URL:**
```
https://subscription-service-khaki.vercel.app/api/webhooks/stripe
```

**Description:** (optional)
```
Subscription Service - Payment & Subscription Events
```

### Step 3: Select Events to Listen For
Select these events (REQUIRED):

- ✅ `checkout.session.completed` - When user completes payment
- ✅ `invoice.payment_succeeded` - When recurring payment succeeds
- ✅ `invoice.payment_failed` - When payment fails
- ✅ `customer.subscription.updated` - When subscription changes
- ✅ `customer.subscription.deleted` - When subscription is canceled

### Step 4: Get the Webhook Signing Secret
1. After creating the webhook, click on it
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 5: Update Environment Variables

#### For Vercel Deployment:
```bash
cd services/subscription-service
vercel env add STRIPE_WEBHOOK_SECRET
# Paste the webhook secret when prompted
```

Or update in Vercel dashboard:
1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Find `STRIPE_WEBHOOK_SECRET`
3. Update with the new secret
4. Redeploy: `vercel --prod`

#### For Local Development:
Update `services/subscription-service/.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET_HERE
```

### Step 6: Test the Webhook

After configuration, test it:

1. **Send a test event from Stripe:**
   - In the webhook details page, click "Send test webhook"
   - Select `checkout.session.completed`
   - Click "Send test webhook"
   - Check if it shows "Succeeded"

2. **Make a test payment:**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Complete the payment
   - User should be redirected to dashboard within 2-4 seconds

## Quick Verification Commands

Check if webhook is configured:
```bash
curl -s https://api.stripe.com/v1/webhook_endpoints \
  -u YOUR_STRIPE_SECRET_KEY: \
  | grep -A 10 "subscription-service"
```

Check webhook endpoint is accessible:
```bash
curl https://subscription-service-khaki.vercel.app/api/webhooks/stripe
# Should return an error (expected), but not 404
```

## What Happens After Webhook is Configured

When a user completes payment:

1. ✅ Stripe sends `checkout.session.completed` event to your webhook
2. ✅ Your service creates record in `user_subscriptions` table
3. ✅ User status is updated to 'Active'
4. ✅ Polling detects `hasActiveSubscription: true`
5. ✅ User is redirected to dashboard
6. ✅ Success! 🎉

## Troubleshooting

### Webhook shows "Failed" in Stripe
- Check Vercel logs: `vercel logs subscription-service-khaki`
- Verify DATABASE_URL is set correctly
- Ensure webhook secret matches

### User still stuck polling
- Clear browser cache and cookies
- Check browser console for errors
- Verify webhook was triggered in Stripe dashboard
- Check database: `SELECT * FROM user_subscriptions WHERE user_id = 'USER_ID';`

### Webhook signature verification fails
- Make sure STRIPE_WEBHOOK_SECRET matches exactly
- No extra spaces or quotes
- Redeploy after updating: `vercel --prod`

## For Production

When you're ready for production:

1. Create webhook in **live mode**: https://dashboard.stripe.com/webhooks
2. Use the same URL (Vercel handles both test and live)
3. Update production environment variables with live webhook secret
4. Test with real payment methods (or use live test mode)

## Current Status

- ❌ Webhook NOT configured (that's why you're seeing this issue)
- ✅ Webhook endpoint exists and is accessible
- ✅ Code is ready to handle webhook events
- ⏳ Waiting for you to configure webhook in Stripe dashboard

**Estimated time to fix: 2-3 minutes**
