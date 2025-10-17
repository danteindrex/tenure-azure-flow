# 🚀 Quick Start - Deploy Everything

## Run the Automated Deployment Script

```bash
cd /home/lambda/treppan/tenure-azure-flow
./deploy.sh
```

That's it! The script will:
1. ✅ Install Vercel CLI (if needed)
2. ✅ Deploy Subscription Service
3. ✅ Deploy Frontend
4. ✅ Deploy Admin Panel
5. ✅ Configure all environment variables
6. ✅ Give you the webhook URL for Stripe

---

## After Deployment

### 1. Configure Stripe Webhook

Go to: https://dashboard.stripe.com/test/webhooks

Click "Add endpoint" and use:
```
https://your-subscription-service-url.vercel.app/api/webhooks/stripe
```

Select events:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the webhook secret (starts with `whsec_`)

### 2. Add Webhook Secret

```bash
cd services/subscription-service
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste your webhook secret
vercel --prod
```

### 3. Test Your Deployment

Visit: `https://your-frontend-url.vercel.app/subscribe`

Use test card: **4242 4242 4242 4242**

---

## Manual Deployment (if script fails)

See `DEPLOYMENT_GUIDE.md` for step-by-step manual instructions.

---

## Troubleshooting

### Script fails at login
Run `vercel login` manually first, then re-run the script.

### Environment variable errors
Check that all credentials are correct in the script.

### Deployment fails
Check Vercel logs: `vercel logs <deployment-url>`

---

## 📞 Need Help?

All configuration files are ready. If the automated script doesn't work, follow the manual steps in `DEPLOYMENT_GUIDE.md`.
