# Deploy KYC Service to Vercel

## Step-by-Step Vercel CLI Deployment

### 1. Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Navigate to KYC service directory
```bash
cd services/kyc-service
```

### 4. Initialize Vercel project
```bash
vercel
```

When prompted:
- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account
- **Link to existing project?** → `N` (create new)
- **Project name?** → `kyc-service` or your preferred name
- **In which directory is your code located?** → `./` (current directory)

### 5. Configure build settings
Vercel will detect the settings from `vercel.json` automatically.

### 6. Set Environment Variables
After deployment, go to Vercel dashboard or use CLI:

```bash
vercel env add KYC_PROVIDER
# Enter: sumsub

vercel env add SUMSUB_APP_TOKEN
# Enter: sbx:9pRoenOndx0i6Bue9d2UtMmI.Y8z8mcBA9pp3AUvIP2mBg5GKoOgqvLDZ

vercel env add SUMSUB_SECRET_KEY
# Enter: WTjLF3yxFtcGPCNUsMJfZg6iagls3SOJ

vercel env add SUMSUB_WEBHOOK_SECRET
# Enter: eRw3leUt6KNb2Jr6OKDFfH6VqKr

vercel env add DATABASE_URL
# Enter: your_database_connection_string

vercel env add ALLOWED_ORIGINS
# Enter: https://your-frontend-domain.com
```

### 7. Redeploy with environment variables
```bash
vercel --prod
```

### 8. Get the deployment URL
After deployment, Vercel will show you the URL. It will look like:
```
https://kyc-service-[random].vercel.app
```

### 9. Configure Webhook in Sumsub
Go to Sumsub dashboard → Webhooks → Add webhook URL:
```
https://kyc-service-[random].vercel.app/kyc/webhook/applicant-reviewed
```

### 10. Update Frontend
Update your frontend `.env` or Vercel environment:
```
KYC_SERVICE_URL=https://kyc-service-[random].vercel.app
```

## ⚠️ Vercel Limitations

- **30-second timeout**: Webhooks may fail if processing takes too long
- **Cold starts**: First request after inactivity may be slow
- **No persistent connections**: Database connections may drop

Consider Railway or Render for better webhook reliability.