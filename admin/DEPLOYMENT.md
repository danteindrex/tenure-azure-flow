# Deployment Guide for Admin App

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- All environment variables ready from your `.env.local` file

## Step-by-Step Deployment

### 1. Login to Vercel
```bash
vercel login
```
This will open a browser window for authentication.

### 2. Deploy to Vercel

#### For Preview Deployment (Development):
```bash
vercel
```

#### For Production Deployment:
```bash
vercel --prod
```

### 3. Set Environment Variables

You have two options:

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable from your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_VERIFY_SERVICE_SID`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_SECURE`
   - `SMTP_TLS`
   - `EMAIL_FROM`
   - `EMAIL_FROM_NAME`
   - `INTERNAL_API_KEY`
   - `NEXT_PUBLIC_BUSINESS_LAUNCH_DATE`
   - `NODE_ENV` (set to "production")

5. Make sure to select the appropriate environment (Production, Preview, or Development)

#### Option B: Via CLI
```bash
# Add each environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# ... continue for all variables
```

### 4. Update Service URLs

After deployment, update these environment variables with your actual Vercel URLs:
- `NEXT_PUBLIC_APP_URL` → Your Vercel deployment URL
- `NEXT_PUBLIC_ADMIN_URL` → Your admin Vercel URL (if separate)

### 5. Configure Custom Domain (Optional)

1. Go to your project settings on Vercel
2. Navigate to **Domains**
3. Add your custom domain
4. Update DNS records as instructed

### 6. Verify Deployment

After deployment:
1. Visit your deployment URL
2. Check that all pages load correctly
3. Test authentication
4. Verify database connections
5. Test API endpoints

## Important Notes

### Database Connection
- Make sure your `DATABASE_URL` uses the **Transaction Mode** (port 6543) for serverless compatibility
- Format: `postgresql://postgres.project:password@host:6543/postgres`

### Supabase Configuration
- Ensure your Supabase project allows connections from Vercel's IP ranges
- Add your Vercel deployment URL to Supabase's allowed redirect URLs

### Stripe Webhooks
- Update your Stripe webhook endpoint to point to your Vercel URL
- Format: `https://your-domain.vercel.app/api/webhooks/stripe`

### CORS Configuration
- If you have separate frontend/backend, configure CORS appropriately
- Add your Vercel URLs to allowed origins

## Troubleshooting

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation locally: `npm run build`

### Environment Variable Issues
- Double-check all variable names (case-sensitive)
- Ensure no trailing spaces in values
- Redeploy after adding/updating variables

### Database Connection Issues
- Verify DATABASE_URL format
- Check Supabase connection pooler settings
- Ensure service role key has proper permissions

### API Route Errors
- Check function logs in Vercel dashboard
- Verify API routes are in the correct directory structure
- Test API endpoints locally first

## Continuous Deployment

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you push to other branches or create PRs

To disable auto-deployment:
1. Go to Project Settings → Git
2. Configure deployment branches

## Monitoring

- View deployment logs: https://vercel.com/dashboard
- Monitor function execution: Project → Functions tab
- Check analytics: Project → Analytics tab

## Rollback

If something goes wrong:
```bash
vercel rollback
```

Or use the Vercel dashboard to rollback to a previous deployment.

## Support

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Community: https://github.com/vercel/vercel/discussions
