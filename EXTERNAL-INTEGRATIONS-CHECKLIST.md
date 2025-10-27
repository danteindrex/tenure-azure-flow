# External Integrations for Better Auth Implementation

## 📋 Complete Integration Checklist

### ✅ REQUIRED (Must Have)

#### 1. **Email Service - Resend** ⭐ CRITICAL
**Purpose:** Send verification emails, password resets, 2FA codes

**Setup Steps:**
```bash
# 1. Sign up at https://resend.com
# 2. Verify your domain (add DNS records)
# 3. Get API key
# 4. Install package
npm install resend
```

**Environment Variables:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

**Cost:**
- Free: 3,000 emails/month (100 emails/day)
- Paid: $20/month for 50,000 emails

**Configuration in Auth Service:**
```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  emailAndPassword: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: 'Verify your email',
        html: `<a href="${url}">Verify Email</a>`
      })
    },
    sendResetPasswordEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: user.email,
        subject: 'Reset your password',
        html: `<a href="${url}">Reset Password</a>`
      })
    }
  }
})
```

**DNS Records Required:**
```
TXT @ "v=spf1 include:resend.com ~all"
TXT resend._domainkey "v=DKIM1; k=rsa; p=[PUBLIC_KEY_FROM_RESEND]"
```

---

#### 2. **Database - PostgreSQL** ✅ ALREADY HAVE (Supabase)

**Current Setup:**
```env
DATABASE_URL=postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

**Better Auth Tables to Create:**
- `user` (identity)
- `session` (active sessions)
- `account` (OAuth providers)
- `verification` (email/phone codes)
- `passkey` (WebAuthn credentials)
- `two_factor` (TOTP secrets)

**No Additional Cost** (using existing Supabase database)

---

#### 3. **OAuth Provider - Google** ⭐ REQUIRED

**Purpose:** "Sign in with Google" functionality

**Setup Steps:**
```bash
# 1. Go to https://console.cloud.google.com/
# 2. Create new project or select existing
# 3. Enable Google+ API
# 4. Create OAuth 2.0 credentials
# 5. Add authorized redirect URIs
```

**Authorized Redirect URIs:**
```
http://localhost:3004/api/auth/callback/google    (development)
https://yourdomain.com/api/auth/callback/google   (production)
```

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=802187998033-men1psrig0lhtd9i4u61gg854ljr8a34.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

**Configuration:**
```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  }
})
```

**Cost:** FREE

---

### ⚠️ RECOMMENDED (Should Have)

#### 4. **Rate Limiting & Security - Arcjet** ⭐ RECOMMENDED

**Purpose:**
- Rate limiting (prevent brute force attacks)
- Bot detection (block automated attacks)
- DDoS protection
- Email validation
- PII detection

**Setup Steps:**
```bash
# 1. Sign up at https://arcjet.com
# 2. Create project
# 3. Get API key
# 4. Install package
npm install @arcjet/node
```

**Environment Variables:**
```env
ARCJET_KEY=ajkey_xxxxxxxxxxxxx
```

**Configuration in API Gateway:**
```typescript
import arcjet, { tokenBucket, detectBot, shield } from '@arcjet/node'

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    // Rate limiting
    tokenBucket({
      mode: 'LIVE',
      refillRate: 10,
      interval: '1m',
      capacity: 100
    }),
    // Bot detection
    detectBot({
      mode: 'LIVE',
      block: ['AUTOMATED']
    }),
    // Shield (DDoS protection)
    shield({
      mode: 'LIVE'
    })
  ]
})

app.use(async (req, res, next) => {
  const decision = await aj.protect(req)
  if (decision.isDenied()) {
    return res.status(429).json({ error: 'Too many requests' })
  }
  next()
})
```

**Cost:**
- Free: 5,000 requests/month
- Hobby: $20/month (100,000 requests)
- Pro: $100/month (1M requests)

**Alternative:** Use `express-rate-limit` (free, but less features)

---

#### 5. **Payments - Stripe** ✅ ALREADY INTEGRATED (Subscription Service)

**Current Setup:**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51S8VuuIIJqwyg6uV...
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
```

**No Changes Needed!** Auth service just validates users, subscription service handles payments.

**Integration Point:**
```typescript
// In subscription service, get user from JWT
app.post('/api/create-subscription', validateAuth, async (req, res) => {
  const userId = req.user.id // From JWT token

  const subscription = await stripe.subscriptions.create({
    customer: userId,
    items: [{ price: req.body.priceId }]
  })

  res.json(subscription)
})
```

---

### 🔧 OPTIONAL (Nice to Have)

#### 6. **SMS Service - Twilio** 📱 OPTIONAL

**Purpose:**
- Phone number verification
- SMS-based 2FA
- Phone authentication

**Setup Steps:**
```bash
# 1. Sign up at https://www.twilio.com/
# 2. Get Account SID and Auth Token
# 3. Buy phone number (+1 xxx-xxx-xxxx)
# 4. Install package
npm install twilio
```

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Configuration:**
```typescript
import twilio from 'twilio'
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export const auth = betterAuth({
  phoneNumber: {
    enabled: true,
    sendOTP: async ({ phoneNumber, code }) => {
      await client.messages.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Your verification code is: ${code}`
      })
    }
  }
})
```

**Cost:**
- Pay as you go: $0.0079 per SMS (US)
- Free trial: $15 credit

**When Needed:** Only if you want phone authentication (you have phone auth partially implemented)

---

#### 7. **Monitoring & Logging - Sentry** 🐛 OPTIONAL

**Purpose:**
- Error tracking
- Performance monitoring
- User feedback
- Session replay

**Setup Steps:**
```bash
# 1. Sign up at https://sentry.io
# 2. Create project
# 3. Get DSN
# 4. Install package
npm install @sentry/node @sentry/profiling-node
```

**Environment Variables:**
```env
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Configuration:**
```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})

// Use in Express
app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())
```

**Cost:**
- Free: 5,000 errors/month
- Team: $26/month (50,000 errors)

**Alternative:** Use Winston logger (free, no external service)

---

#### 8. **Analytics - PostHog** 📊 OPTIONAL

**Purpose:**
- User behavior analytics
- Feature flags
- A/B testing
- Session recordings

**Setup Steps:**
```bash
# 1. Sign up at https://posthog.com
# 2. Get API key
# 3. Install package
npm install posthog-node
```

**Environment Variables:**
```env
POSTHOG_API_KEY=phc_xxxxxxxxxxxxx
```

**Configuration:**
```typescript
import { PostHog } from 'posthog-node'
const posthog = new PostHog(process.env.POSTHOG_API_KEY)

// Track auth events
posthog.capture({
  distinctId: user.id,
  event: 'user_signed_up',
  properties: { method: 'email' }
})
```

**Cost:**
- Free: 1M events/month
- Paid: $0.00025 per event after

---

### 🔐 JWT Secret Generation

**Required for Token Signing:**

```bash
# Generate secure JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Environment Variable:**
```env
JWT_SECRET=a7f8d9e6c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7
```

**Configuration:**
```typescript
export const auth = betterAuth({
  advanced: {
    useJWT: true,
    jwtSecret: process.env.JWT_SECRET!
  }
})
```

**Cost:** FREE (self-generated)

---

## 📊 Summary Table

| Integration | Status | Cost | Required? | Purpose |
|------------|--------|------|-----------|---------|
| **Resend** | New | $0 (3k/mo free) | ✅ REQUIRED | Email verification, password reset |
| **PostgreSQL** | Existing | $0 (Supabase) | ✅ REQUIRED | Store auth data |
| **Google OAuth** | Existing config | $0 | ✅ REQUIRED | Social login |
| **Arcjet** | New | $0-20/mo | ⚠️ RECOMMENDED | Rate limiting, bot detection |
| **Stripe** | Existing | Existing cost | ✅ HAVE | Payments (no changes) |
| **Twilio** | New | ~$0.01/SMS | ⚠️ OPTIONAL | Phone verification, SMS 2FA |
| **Sentry** | New | $0 (5k errors) | ⚠️ OPTIONAL | Error tracking |
| **PostHog** | New | $0 (1M events) | ⚠️ OPTIONAL | Analytics |

---

## 💰 Total Cost Breakdown

### Minimum Viable Setup:
```
Resend (email):         $0/month  (free tier)
Google OAuth:           $0/month  (free)
Database:               $0/month  (existing Supabase)
JWT Secret:             $0/month  (self-generated)
────────────────────────────────────
TOTAL:                  $0/month  ✅
```

### Recommended Production Setup:
```
Resend (email):         $0-20/month  (depends on volume)
Google OAuth:           $0/month
Database:               $0/month  (existing)
Arcjet (security):      $20/month  (hobby tier)
────────────────────────────────────
TOTAL:                  $20/month  ✅
```

### Full Featured Setup:
```
Resend:                 $20/month
Google OAuth:           $0/month
Database:               $0/month
Arcjet:                 $20/month
Twilio:                 ~$10/month (1,000 SMS)
Sentry:                 $26/month
PostHog:                $0/month (free tier)
────────────────────────────────────
TOTAL:                  $76/month
```

---

## 🚀 Setup Priority Order

### Phase 1: Core Auth (Week 1)
1. ✅ **Resend** - Email service (REQUIRED)
2. ✅ **Google OAuth** - Reconfigure for auth service (REQUIRED)
3. ✅ **JWT Secret** - Generate secret (REQUIRED)
4. ✅ **Database** - Use existing Supabase (REQUIRED)

### Phase 2: Security (Week 2)
5. ⚠️ **Arcjet** - Rate limiting & bot detection (RECOMMENDED)
6. ⚠️ **Sentry** - Error tracking (RECOMMENDED)

### Phase 3: Enhanced Features (Week 3+)
7. 📱 **Twilio** - Phone verification (OPTIONAL)
8. 📊 **PostHog** - Analytics (OPTIONAL)

---

## 📝 Environment Variables Template

Create `.env` in auth service:

```env
# === REQUIRED ===

# Database
DATABASE_URL=postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_secure_jwt_secret_here_at_least_32_characters_long

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=802187998033-men1psrig0lhtd9i4u61gg854ljr8a34.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx

# === RECOMMENDED ===

# Arcjet (Security)
ARCJET_KEY=ajkey_xxxxxxxxxxxxx

# === OPTIONAL ===

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Sentry (Error Tracking)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# PostHog (Analytics)
POSTHOG_API_KEY=phc_xxxxxxxxxxxxx

# Service Configuration
PORT=3004
NODE_ENV=development
```

---

## 🔗 Integration Links

### Required:
- **Resend:** https://resend.com
- **Google Cloud Console:** https://console.cloud.google.com/
- **Supabase Database:** https://supabase.com (already have)

### Recommended:
- **Arcjet:** https://arcjet.com

### Optional:
- **Twilio:** https://www.twilio.com/
- **Sentry:** https://sentry.io
- **PostHog:** https://posthog.com

---

## ⚠️ Important Notes

### 1. **Email Domain Verification**
Resend requires you to verify your domain with DNS records. This takes 24-48 hours to propagate.

**Workaround for testing:**
- Use Resend's test domain (limited to 100 emails/day)
- Or use your email address as sender (development only)

### 2. **Google OAuth Redirect URIs**
Must match EXACTLY:
```
Development:  http://localhost:3004/api/auth/callback/google
Production:   https://api.yourdomain.com/api/auth/callback/google
```

### 3. **JWT Secret Security**
- Never commit to Git
- Use different secrets for dev/staging/prod
- Rotate periodically (every 90 days)

### 4. **Rate Limiting**
Without Arcjet, implement basic rate limiting:
```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

app.use('/api/auth', limiter)
```

---

## ✅ Integration Checklist

Before going to production, verify:

- [ ] Resend domain verified (DNS records propagated)
- [ ] Google OAuth credentials created and configured
- [ ] JWT secret generated (32+ characters, cryptographically secure)
- [ ] Database connection tested
- [ ] Email sending tested (verification, password reset)
- [ ] OAuth flow tested (Google login works)
- [ ] Rate limiting configured (Arcjet or express-rate-limit)
- [ ] Error tracking configured (Sentry or logging)
- [ ] All environment variables set in production
- [ ] SSL certificates configured (HTTPS required for OAuth)

---

## 🆘 Alternatives if Budget is Tight

### Instead of Resend:
- **Nodemailer + Gmail:** Free (500 emails/day, often flagged as spam)
- **AWS SES:** $0.10 per 1,000 emails (complex setup)
- **SendGrid:** 100 emails/day free (has reputation issues)

### Instead of Arcjet:
- **express-rate-limit:** Free (basic rate limiting only)
- **nginx rate limiting:** Free (if using Nginx as gateway)

### Instead of Twilio:
- **Skip phone auth:** Just use email verification
- **AWS SNS:** $0.00645 per SMS (cheaper but complex)

### Instead of Sentry:
- **Winston + File logging:** Free (no cloud dashboard)
- **Console.log:** Free (basic, no persistence)

---

## 🎯 Minimum Required for MVP

To get Better Auth working with JUST the essentials:

1. **Resend** (email) - $0/month (free tier)
2. **Google OAuth** - $0/month (free)
3. **JWT Secret** - $0/month (self-generated)
4. **PostgreSQL** - $0/month (existing Supabase)

**Total: $0/month** to get started! 🎉

Everything else can be added later as you scale.

---

**Ready to set these up?** Let me know which integrations you want to configure first!
