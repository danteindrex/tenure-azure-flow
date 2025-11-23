# Payout Service - Integration Guide

## System Architecture

The payout service is a **microservice** that integrates with the main Tenure application. It shares the same PostgreSQL database and uses Better Auth for session management.

```
┌─────────────────────────────────────────────────────────────┐
│                     Tenure Application                      │
│                    (Main Next.js App)                       │
│                    Port: 3000                                │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Better Auth Sessions
             │ Shared Database
             │
┌────────────┴────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  - Users, Sessions, Payments, Subscriptions                 │
│  - Payout Management, Admin, Audit Logs                     │
└────────────┬────────────────────────────────────────────────┘
             │
   ┌─────────┴─────────────┬─────────────────┬────────────────┐
   │                       │                 │                │
┌──┴──────────────┐ ┌─────┴─────────┐ ┌────┴──────────┐ ┌──┴─────────────┐
│ Payout Service  │ │  Subscription │ │  KYC Service  │ │  Admin Portal  │
│   Port: 3002    │ │    Service    │ │  Port: 3004   │ │  Port: 3005    │
└─────────────────┘ │  Port: 3001   │ └───────────────┘ └────────────────┘
                    └───────────────┘
```

## Integration Points

### 1. Shared Database

The payout service connects to the **same PostgreSQL database** as the main application:

**Configuration**: [src/config/database.ts](src/config/database.ts)

```typescript
// Uses DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, // Microservice pool size
  min: 2,
});
```

**Shared Tables**:
- `users` - User accounts
- `session` - Better Auth sessions
- `admin` - Admin users and roles
- `user_payments` - Payment history (for revenue calculation)
- `payout_management` - Payout records (owned by this service)
- `user_addresses` - User addresses (for check payments)
- `admin_alerts` - System alerts
- `user_audit_logs` - Audit trail

### 2. Better Auth Session Management

The payout service validates sessions from the main application using Better Auth:

**Configuration**: [src/config/auth.ts](src/config/auth.ts)

```typescript
import { validateSession } from '../config/auth';

// Apply to all protected routes
router.use('/api/eligibility', validateSession, eligibilityRoutes);
router.use('/api/payouts', validateSession, payoutRoutes);
```

**How it works**:
1. User logs in via main app (Next.js)
2. Main app creates Better Auth session in shared database
3. Session token stored in cookie: `better-auth.session_token`
4. Payout service reads cookie and validates against `session` table
5. User context attached to `req.user`

**Session Token Extraction**:
- **Cookie**: `better-auth.session_token` (preferred)
- **Header**: `Authorization: Bearer <token>`

### 3. Role-Based Access Control (RBAC)

The payout service checks admin roles from the shared `admin` table:

**Available Middleware**:
```typescript
import { requireAdmin, requireFinanceManager } from '../config/auth';

// Require admin access
router.post('/payouts/:payoutId/approve', requireAdmin, approveHandler);

// Require finance manager access
router.post('/payouts/:payoutId/mark-sent', requireFinanceManager, markSentHandler);
```

**Admin Roles** (from `enum_admin_role`):
- `Super Admin` - Full access to everything
- `Manager` - Standard admin access
- `Support` - Limited support access

**Custom Role Detection**:
```typescript
req.user.isAdmin // true if Super Admin or Manager
req.user.isFinanceManager // true if any admin role
```

### 4. External Service Communication

The payout service communicates with other microservices:

**Subscription Service Integration**: [src/services/subscription-api.service.ts](src/services/subscription-api.service.ts)

```typescript
import { subscriptionAPIService } from './subscription-api.service';

// Get total revenue from subscription service
const totalRevenue = await subscriptionAPIService.getTotalRevenue();

// Falls back to local database if service unavailable
```

**Configuration**:
```bash
SUBSCRIPTION_SERVICE_URL=http://localhost:3001
```

### 5. CORS Configuration

The payout service allows requests from the main app and admin portal:

**Server Configuration**: [src/server.ts](src/server.ts)

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true, // Allow cookies
}));
```

**Environment**:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3005
```

## API Endpoints

All endpoints require authentication (Better Auth session).

### Eligibility Endpoints

```
GET  /api/eligibility/status   - Check if company reached $100K threshold
GET  /api/eligibility/members  - Get list of eligible members
POST /api/eligibility/check    - Trigger manual eligibility check (admin only)
```

### Payout Endpoints

```
POST /api/payouts              - Create payouts for selected users (admin only)
GET  /api/payouts              - List all payouts with filtering
GET  /api/payouts/:payoutId    - Get payout details
```

### Approval Endpoints

```
POST /api/payouts/:payoutId/approve - Approve payout (requires 2 admins)
POST /api/payouts/:payoutId/reject  - Reject payout (admin only)
```

### Payment Endpoints

```
POST /api/payouts/:payoutId/generate-instructions - Generate payment instructions
POST /api/payouts/:payoutId/mark-sent            - Mark payment as sent
POST /api/payouts/:payoutId/confirm              - Confirm payment completion
GET  /api/payouts/:payoutId/receipt              - Download receipt PDF
```

## Request/Response Format

### Authentication

**Cookie-based** (recommended for same-domain):
```http
GET /api/payouts HTTP/1.1
Host: localhost:3002
Cookie: better-auth.session_token=<token>
```

**Header-based** (for cross-domain or API clients):
```http
GET /api/payouts HTTP/1.1
Host: localhost:3002
Authorization: Bearer <token>
```

### Success Response

```json
{
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2024-11-22T17:30:00.000Z"
}
```

### Error Response

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "timestamp": "2024-11-22T17:30:00.000Z",
    "requestId": "req-123"
  }
}
```

## Database Schema Integration

### Payout Management Table

**Table**: `payout_management` (created by this service)

```sql
CREATE TABLE payout_management (
  payout_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50), -- pending_approval, approved, rejected, payment_sent, completed
  payment_method VARCHAR(20), -- ach, check
  bank_details JSONB, -- encrypted bank details for ACH
  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,
  approval_workflow JSONB, -- multi-level approval tracking
  processing JSONB, -- payment processing details
  receipt_url TEXT,
  audit_trail JSONB, -- complete audit trail
  created_by INTEGER REFERENCES admin(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Views Used

**Active Member Queue View** (assumed to exist):
```sql
-- This view should return eligible members
CREATE VIEW active_member_queue_view AS
SELECT
  u.id as user_id,
  u.email,
  u.name,
  u.status,
  um.member_status,
  up.total_paid
FROM users u
JOIN user_memberships um ON u.id = um.user_id
LEFT JOIN (
  SELECT user_id, SUM(amount) as total_paid
  FROM user_payments
  WHERE status = 'succeeded'
  GROUP BY user_id
) up ON u.id = up.user_id
WHERE u.status = 'Active'
  AND um.member_status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM payout_management pm
    WHERE pm.user_id = u.id
    AND pm.status IN ('pending_approval', 'approved', 'payment_sent', 'completed')
  );
```

## Cron Jobs Integration

The payout service runs automated jobs that interact with the shared database:

### Eligibility Check Job
- **Schedule**: Daily at 2:00 AM UTC
- **Function**: Checks if company revenue >= $100,000
- **Action**: Creates admin alerts in `admin_alerts` table
- **Notification**: Sends email to admins if eligible

### Membership Removal Job
- **Schedule**: Daily at 3:00 AM UTC
- **Function**: Removes members 12 months after payout
- **Action**: Updates `users.status` to 'Inactive'
- **Audit**: Logs changes in `user_audit_logs`

## Email Notifications

The payout service sends emails via SMTP:

**Configuration**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Home Solutions
```

**Email Events**:
- Payout approved (after 2 approvals)
- Payout rejected
- Membership removed (12 months post-payout)
- Eligibility threshold reached (admin alert)

## Security Considerations

### 1. Shared Database Security

- Uses connection pooling with SSL
- Separate pool limits for microservice (max: 10, min: 2)
- Graceful shutdown to prevent connection leaks

### 2. Session Security

- Sessions validated against shared `session` table
- Expired sessions automatically rejected
- Session refresh logic (extends by 7 days when < 1 day remaining)

### 3. Data Encryption

- Bank details encrypted with AES-256-GCM
- Encryption key must be 32 characters (256 bits)
- Decryption only when generating payment instructions

### 4. Rate Limiting

- 100 requests per 15 minutes per IP
- Applied to all `/api/*` routes
- Helps prevent abuse

### 5. Input Validation

- All requests validated with Zod schemas
- Type-safe request/response handling
- Prevents injection attacks

## Development Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Shared Database
DATABASE_URL=postgresql://user:password@localhost:5432/tenure_db

# Business Config
BUSINESS_LAUNCH_DATE=2024-01-01
PAYOUT_THRESHOLD=100000

# SMTP (for notifications)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# External Services
SUBSCRIPTION_SERVICE_URL=http://localhost:3001

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 2. Start Services in Order

```bash
# 1. Start main database (PostgreSQL)
# Ensure DATABASE_URL is accessible

# 2. Start main application (creates sessions)
cd /path/to/main-app
npm run dev # Port 3000

# 3. Start subscription service (provides revenue data)
cd services/subscription-service
npm run dev # Port 3001

# 4. Start payout service
cd services/payout-service
npm run dev # Port 3002
```

### 3. Test Integration

```bash
# Get session token from main app
# Login via http://localhost:3000
# Copy session token from cookie: better-auth.session_token

# Test payout service with session token
curl -H "Authorization: Bearer <token>" \
  http://localhost:3002/api/eligibility/status
```

## Production Deployment

### 1. Environment Configuration

Ensure all services share the same:
- `DATABASE_URL` - Same PostgreSQL database
- `BETTER_AUTH_SECRET` - Same secret for session encryption
- `BETTER_AUTH_URL` - Main app URL for redirects

### 2. Network Configuration

- All microservices must reach the same PostgreSQL instance
- Configure internal service URLs (not public-facing)
- Use private network or VPN for service-to-service communication

### 3. Load Balancing

If using multiple instances:
- Database connection pool settings should account for total connections
- Session tokens are stateless (can be validated by any instance)
- Cron jobs should run on only ONE instance (use leader election)

### 4. Monitoring

- Monitor database connection pool usage: `getDatabaseStats()`
- Track session validation failures
- Alert on failed eligibility checks
- Monitor cron job execution

## Troubleshooting

### Issue: Authentication Fails

**Symptom**: All requests return 401 Unauthorized

**Causes**:
1. Different `DATABASE_URL` between services
2. Session expired
3. Cookie not being sent (CORS misconfiguration)

**Solution**:
```bash
# Check database connection
curl http://localhost:3002/api/health

# Verify session exists in database
psql $DATABASE_URL -c "SELECT * FROM session WHERE token = '<your-token>';"

# Check CORS headers
curl -v -H "Origin: http://localhost:3000" http://localhost:3002/api/health
```

### Issue: Revenue Data Not Updating

**Symptom**: Eligibility check shows $0 revenue

**Causes**:
1. Subscription service not running
2. `SUBSCRIPTION_SERVICE_URL` incorrect
3. Database query returning no results

**Solution**:
```bash
# Check subscription service
curl http://localhost:3001/api/revenue/total

# Check fallback database query
psql $DATABASE_URL -c "SELECT SUM(amount) FROM user_payments WHERE status = 'succeeded';"
```

### Issue: Cron Jobs Not Running

**Symptom**: Eligibility checks not happening automatically

**Causes**:
1. `ENABLE_CRON_JOBS` not set to `true`
2. Service not running in production mode
3. Multiple instances causing conflicts

**Solution**:
```bash
# Enable cron jobs
export ENABLE_CRON_JOBS=true
export NODE_ENV=production

# Verify cron job logs
grep "Starting scheduled eligibility check" logs/app.log
```

## API Client Example

### JavaScript/TypeScript

```typescript
// Login via main app first to get session

// Make authenticated request to payout service
const response = await fetch('http://localhost:3002/api/eligibility/status', {
  method: 'GET',
  credentials: 'include', // Send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
# Get session token from browser cookie
TOKEN="your-session-token"

# Check eligibility
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3002/api/eligibility/status

# Create payouts
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["uuid1", "uuid2"], "notes": "Monthly payout"}' \
  http://localhost:3002/api/payouts
```

## Summary

The payout service is designed to **seamlessly integrate** with the existing Tenure application by:

1. ✅ **Sharing the same PostgreSQL database** - No data duplication
2. ✅ **Using Better Auth sessions** - Single sign-on across services
3. ✅ **Respecting admin roles** - Role-based access control
4. ✅ **Communicating with other services** - Subscription API integration
5. ✅ **Following security best practices** - Encryption, validation, rate limiting
6. ✅ **Providing comprehensive audit trails** - All actions logged

The service is production-ready and can be deployed alongside the main application with minimal configuration.
