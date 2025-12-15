# Vercel Deployment Instructions for KYC Service

## ⚠️ Important Notes

**Vercel is not ideal for this service because:**
- Serverless functions have 30-second execution limits
- Webhooks may timeout during processing
- No persistent database connections
- Better suited for Railway, Render, or AWS

## If you still want to deploy to Vercel:

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy from the kyc-service directory
```bash
cd services/kyc-service
vercel --prod
```

### 4. Set Environment Variables in Vercel Dashboard

Go to your Vercel project dashboard and add these environment variables:

```
KYC_PROVIDER=sumsub
SUMSUB_APP_TOKEN=sbx:9pRoenOndx0i6Bue9d2UtMmI.Y8z8mcBA9pp3AUvIP2mBg5GKoOgqvLDZ
SUMSUB_SECRET_KEY=WTjLF3yxFtcGPCNUsMJfZg6iagls3SOJ
SUMSUB_WEBHOOK_SECRET=eRw3leUt6KNb2Jr6OKDFfH6VqKr
SUMSUB_BASE_URL=https://api.sumsub.com
SUMSUB_LEVEL_NAME=Home solutions verify
DATABASE_URL=your_database_url
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### 5. Webhook URL

Once deployed, your webhook URL will be:
```
https://your-vercel-app.vercel.app/api/kyc/webhook
```

## 🚀 Recommended Alternative: Railway

For better webhook support, consider Railway:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd services/kyc-service
railway deploy
```

Railway provides persistent services perfect for webhooks and database operations.