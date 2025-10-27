# Better Auth in Next.js - Embedded Implementation Plan

## ✅ YOU'RE ABSOLUTELY RIGHT!

**Embedding Better Auth in Next.js is the CORRECT approach** for your Vercel-deployed microservices architecture.

### Why This Works Better:

1. **No New Deployment** - Auth handled in Next.js API routes
2. **Serverless-Ready** - Works perfectly on Vercel Edge Functions
3. **Same Domain** - No CORS issues
4. **Simple Architecture** - One less service to manage
5. **Cost Effective** - No separate auth service hosting

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│            NEXT.JS APP (Port 3000) - Vercel Deployment          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              FRONTEND (Client Components)                  │ │
│  │  - Pages (login, dashboard, settings)                      │ │
│  │  - Components (forms, buttons, etc.)                       │ │
│  │  - Auth Client (hooks: useSession, etc.)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         BACKEND (API Routes - Server-side)                 │ │
│  │                                                             │ │
│  │  📁 app/api/auth/[...all]/route.ts                         │ │
│  │     └─→ Better Auth Handler                                │ │
│  │         - Signup, Login, Logout                            │ │
│  │         - Google OAuth                                     │ │
│  │         - Email verification (Resend)                      │ │
│  │         - 2FA, Passkeys                                    │ │
│  │         - Issues JWT tokens                                │ │
│  │                                                             │ │
│  │  📁 lib/auth.ts                                            │ │
│  │     └─→ Better Auth Config (Drizzle, Resend)              │ │
│  │                                                             │ │
│  │  📁 drizzle/                                               │ │
│  │     └─→ schema/ (Better Auth tables + your tables)        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                           │ JWT Tokens
                           ▼
    ┌──────────────┬──────────────┬──────────────┐
    │              │              │              │
    ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
│Subscr   │  │  Queue   │  │  Admin   │  │ Supabase  │
│Service  │  │ Service  │  │Dashboard │  │ Database  │
│(3001)   │  │ (TBD)    │  │ (3003)   │  │(Existing) │
└─────────┘  └──────────┘  └──────────┘  └───────────┘
  Validate     Validate      Separate      Stores
  JWT token    JWT token     Auth (Payload) Everything
```

---

## 📦 Implementation Steps

### Step 1: Install Dependencies

```bash
cd /path/to/main-nextjs-app

# Core dependencies
npm install better-auth drizzle-orm drizzle-kit
npm install @node-rs/argon2  # Password hashing
npm install pg @types/pg

# Email service (you already have Resend SMTP)
npm install resend

# Optional but recommended
npm install @arcjet/next  # Rate limiting for Next.js
npm install zod           # Validation
```

---

### Step 2: Setup Drizzle with Existing Database

**Create `drizzle.config.ts` in root:**

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './drizzle/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  // Important: Keep existing tables safe
  schemaFilter: ['public'],
  tablesFilter: ['user', 'session', 'account', 'verification', 'passkey', 'two_factor']
} satisfies Config
```

**Create `drizzle/db.ts`:**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
})

export const db = drizzle(pool, { schema })
```

---

### Step 3: Create Drizzle Schema (Maps to Existing Tables)

**File structure:**

```
drizzle/
├── db.ts
├── schema/
│   ├── index.ts              # Export all
│   ├── auth.ts               # Better Auth tables (NEW)
│   ├── users.ts              # Your existing users tables
│   ├── settings.ts           # Your existing settings tables
│   ├── financial.ts          # Your existing financial tables
│   ├── membership.ts         # Your existing membership tables
│   └── ...
```

**drizzle/schema/auth.ts** (Better Auth tables):

```typescript
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core'

// Better Auth: Main user identity table
export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  password: text('password'),  // hashed
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow()
})

// Better Auth: Sessions
export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expiresAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').notNull().defaultNow()
})

// Better Auth: OAuth accounts
export const account = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  expiresAt: timestamp('expiresAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow()
})

// Better Auth: Email/phone verification
export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow()
})

// Better Auth: Passkeys (WebAuthn)
export const passkey = pgTable('passkey', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name'),
  credentialId: text('credentialId').notNull().unique(),
  publicKey: text('publicKey').notNull(),
  counter: integer('counter').notNull().default(0),
  deviceType: text('deviceType'),
  backedUp: boolean('backedUp').default(false),
  transports: text('transports').array(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  lastUsedAt: timestamp('lastUsedAt')
})

// Better Auth: Two-factor authentication
export const twoFactor = pgTable('two_factor', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backupCodes').array(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  verifiedAt: timestamp('verifiedAt')
})
```

**drizzle/schema/users.ts** (Your EXISTING tables - exact mapping):

```typescript
import { pgTable, uuid, text, varchar, boolean, timestamp, date, integer, numeric, decimal } from 'drizzle-orm/pg-core'
import { user } from './auth'

// YOUR EXISTING TABLE - Keep exact same name & structure
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: text('auth_user_id').unique(),  // OLD: Links to auth.users
  userId: uuid('user_id').references(() => user.id),  // NEW: Links to Better Auth user
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: boolean('email_verified').default(false),
  status: text('status').notNull().default('Pending'),  // enum_member_status
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// YOUR EXISTING TABLE - user_profiles
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  middleName: varchar('middle_name', { length: 100 }),
  dateOfBirth: date('date_of_birth'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// YOUR EXISTING TABLE - user_contacts
export const userContacts = pgTable('user_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  contactType: varchar('contact_type', { length: 20 }).notNull(),
  contactValue: varchar('contact_value', { length: 255 }).notNull(),
  isPrimary: boolean('is_primary').default(false),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ... Continue mapping ALL your existing tables exactly
```

**drizzle/schema/index.ts:**

```typescript
// Export all schemas
export * from './auth'
export * from './users'
export * from './settings'
export * from './financial'
export * from './membership'
export * from './compliance'
export * from './audit'
```

---

### Step 4: Configure Better Auth with Resend SMTP

**Create `lib/auth.ts`:**

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { passkey, twoFactor, organization } from 'better-auth/plugins'
import { db } from '@/drizzle/db'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    // Use your Resend SMTP credentials
    sendVerificationEmail: async ({ user, url, token }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome!</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${url}">Verify Email</a>
          <p>Or use this code: <strong>${token}</strong></p>
        `
      })
    },

    sendResetPasswordEmail: async ({ user, url, token }) => {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Reset your password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${url}">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `
      })
    }
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  },

  plugins: [
    nextCookies(),      // Required for Next.js
    passkey(),          // WebAuthn support
    twoFactor(),        // TOTP 2FA
    organization()      // Team management
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,       // Update every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5  // 5 minutes
    }
  },

  advanced: {
    generateId: false,  // Let PostgreSQL handle UUIDs
    useSecureCookies: process.env.NODE_ENV === 'production'
  }
})

export type Session = typeof auth.$Infer.Session
```

---

### Step 5: Create API Route Handler

**Create `app/api/auth/[...all]/route.ts`:**

```typescript
import { auth } from '@/lib/auth'

export const { GET, POST } = auth.handler
```

That's it! Better Auth automatically handles all these routes:
- `/api/auth/signup`
- `/api/auth/signin`
- `/api/auth/signout`
- `/api/auth/session`
- `/api/auth/callback/google`
- `/api/auth/verify-email`
- `/api/auth/reset-password`
- And many more...

---

### Step 6: Create Auth Client

**Create `lib/auth-client.ts`:**

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
})

export const {
  useSession,
  signIn,
  signUp,
  signOut
} = authClient
```

---

### Step 7: Update Environment Variables

**`.env.local`:**

```env
# Database (existing)
DATABASE_URL=postgresql://postgres.exneyqwvvckzxqzlknxv:keithtwesigye74@aws-1-us-east-1.pooler.supabase.com:5432/postgres

# Better Auth
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Resend SMTP (you already have these!)
RESEND_API_KEY=re_5RuYtBi8_GsNZLnhCyMqErrJMHsc1UaeC
EMAIL_FROM=noreply@yourdomain.com

# Google OAuth (existing)
GOOGLE_CLIENT_ID=802187998033-men1psrig0lhtd9i4u61gg854ljr8a34.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx

# For client-side
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Vercel deployment, add these to Vercel Environment Variables.**

---

### Step 8: Generate & Apply Migrations

```bash
# Generate migrations for Better Auth tables ONLY
npx drizzle-kit generate

# Review the migration SQL
cat drizzle/migrations/0001_add_better_auth.sql

# Apply to database
npx drizzle-kit push

# Or manually with psql
psql $DATABASE_URL < drizzle/migrations/0001_add_better_auth.sql
```

**IMPORTANT:** This will create Better Auth tables (`user`, `session`, etc.) WITHOUT touching your existing tables (`users`, `user_profiles`, etc.)

---

### Step 9: Migrate Existing Users

**Create `scripts/migrate-users.ts`:**

```typescript
import { db } from '../drizzle/db'
import { user, users } from '../drizzle/schema'
import { sql } from 'drizzle-orm'

async function migrateUsers() {
  // Step 1: Copy from auth.users (Supabase) to Better Auth user table
  await db.execute(sql`
    INSERT INTO "user" (id, name, email, "emailVerified", password, "createdAt", "updatedAt")
    SELECT
      au.id,
      COALESCE(
        au.raw_user_meta_data->>'first_name' || ' ' || au.raw_user_meta_data->>'last_name',
        au.email
      ) as name,
      au.email,
      au.email_confirmed_at IS NOT NULL,
      au.encrypted_password,
      au.created_at,
      au.updated_at
    FROM auth.users au
    ON CONFLICT (id) DO NOTHING
  `)

  // Step 2: Link existing public.users to Better Auth users
  await db.execute(sql`
    UPDATE users
    SET user_id = auth_user_id::uuid
    WHERE user_id IS NULL AND auth_user_id IS NOT NULL
  `)

  console.log('✅ User migration complete!')
}

migrateUsers().catch(console.error)
```

**Run with:**
```bash
npx tsx scripts/migrate-users.ts
```

---

### Step 10: Update Your Pages

**Example: Login Page (`app/auth/login/page.tsx`):**

```typescript
'use client'

import { authClient } from '@/lib/auth-client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data, error } = await authClient.signIn.email({
      email,
      password
    }, {
      onSuccess: () => {
        router.push('/dashboard')
      },
      onError: (error) => {
        alert(error.message)
      }
    })
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

**Example: Protected Page (`app/dashboard/page.tsx`):**

```typescript
'use client'

import { useSession, signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  if (isPending) return <div>Loading...</div>

  if (!session) {
    router.push('/auth/login')
    return null
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

---

### Step 11: Update Microservices (JWT Validation)

**Subscription Service (`services/subscription-service/src/middleware/auth.ts`):**

```typescript
import jwt from 'jsonwebtoken'

export const validateAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Validate JWT against Better Auth
    const response = await fetch('http://localhost:3000/api/auth/session', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { user } = await response.json()
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

---

## 🚀 Vercel Deployment

### vercel.json (if needed):

```json
{
  "env": {
    "DATABASE_URL": "@database_url",
    "BETTER_AUTH_SECRET": "@better_auth_secret",
    "RESEND_API_KEY": "@resend_api_key"
  },
  "build": {
    "env": {
      "DATABASE_URL": "@database_url"
    }
  }
}
```

### Vercel Environment Variables:

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<generated secret>
BETTER_AUTH_URL=https://yourdomain.com
RESEND_API_KEY=re_5RuYtBi8_GsNZLnhCyMqErrJMHsc1UaeC
EMAIL_FROM=noreply@yourdomain.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## ✅ Benefits of This Approach

1. **No DNS needed for dev** - Using SMTP credentials directly
2. **Same deployment** - Auth lives in Next.js (no separate service)
3. **Vercel-optimized** - Serverless functions work perfectly
4. **Existing tables safe** - Drizzle maps to them, no changes
5. **JWT for services** - Other microservices validate tokens
6. **Easy testing** - Everything in one app during development

---

## 📊 Final Architecture

```
Vercel Deployment:
├── Next.js App (Port 3000)
│   ├── /app/api/auth/[...all]/route.ts  ← Better Auth
│   ├── /lib/auth.ts                      ← Config
│   ├── /lib/auth-client.ts               ← Client hooks
│   └── /drizzle/schema/                  ← Database schema
│       ├── auth.ts                       ← Better Auth tables (NEW)
│       └── users.ts                      ← Your tables (EXISTING, mapped)
│
├── Subscription Service (Port 3001)
│   └── Validates JWT from Next.js auth
│
├── Queue Service
│   └── Validates JWT from Next.js auth
│
└── Admin Dashboard (Port 3003)
    └── Separate auth (Payload CMS)
```

---

## 🎯 Next Steps

1. ✅ Install dependencies in main Next.js app
2. ✅ Create Drizzle schema (map existing tables EXACTLY)
3. ✅ Configure Better Auth with Resend SMTP
4. ✅ Generate & apply migrations (Better Auth tables only)
5. ✅ Migrate existing users from auth.users
6. ✅ Update login/signup pages
7. ✅ Test authentication flow
8. ✅ Update microservices with JWT validation
9. ✅ Deploy to Vercel

**Ready to start?** Let me generate the Drizzle schemas that map to your EXACT existing tables!
