# Configuration Module

This directory contains the core configuration modules for the Payout Service.

## Files

### `database.ts`
Database connection and Drizzle ORM configuration.

**Features:**
- PostgreSQL connection pool with optimized settings for microservices
- SSL support for secure connections
- Health check functionality
- Graceful shutdown handling
- Connection statistics monitoring

**Usage:**
```typescript
import { db, checkDatabaseHealth } from './config/database'

// Query database
const payouts = await db.query.payoutManagement.findMany()

// Check health
const isHealthy = await checkDatabaseHealth()

// Get connection stats
const stats = getDatabaseStats()
```

### `auth.ts`
Better Auth session management and role-based access control.

**Features:**
- Session validation middleware
- Role-based access control (admin, finance_manager)
- Session refresh logic
- User context extraction from sessions
- Shared session tables with main application

**Middleware:**
- `validateSession` - Validates session token and attaches user to request
- `requireAdmin` - Ensures user has admin privileges
- `requireFinanceManager` - Ensures user has finance manager privileges
- `requireMemberAccess` - Ensures user can only access their own data (or is admin)

**Usage:**
```typescript
import { validateSession, requireAdmin } from './config/auth'

// In Express route
app.get('/api/payouts', validateSession, requireAdmin, async (req, res) => {
  // req.user contains authenticated user info
  // req.session contains session data
  const payouts = await getPayouts()
  res.json(payouts)
})
```

**Helper Functions:**
- `refreshSessionIfNeeded(token)` - Refreshes session if close to expiring
- `hasRole(userId, role)` - Checks if user has specific role
- `getUserRoles(userId)` - Gets all roles for a user

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Testing

Tests are located in `__tests__/` subdirectory.

Run tests:
```bash
npm test
```

Run type checking:
```bash
npm run type-check
```

## Architecture

The configuration modules are designed to:
1. Share the same database and session tables as the main application
2. Provide seamless authentication across microservices
3. Support role-based access control for admin operations
4. Handle graceful shutdown and connection cleanup
5. Provide health check endpoints for monitoring
