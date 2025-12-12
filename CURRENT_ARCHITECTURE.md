# Current Architecture --home soluitons
 **Microservices Architecture with Shared Database**

### 1. Main Application (Monolith Core)
- **Framework**: Next.js 15.5.6 with Pages Router
- **Port**: 3000
- **Structure**: Traditional Next.js app with API routes
- **Frontend**: React components in `src/` directory
- **Backend**: API routes in `pages/api/` (47+ endpoints)

### 2. Microservices (4 Independent Services)

#### Subscription Service (Port 3001)
- **Technology**: Express.js + TypeScript
- **Purpose**: Stripe payment processing
- **Database**: Shared PostgreSQL via DATABASE_URL
- **Key Features**: 
  - Stripe Checkout integration
  - Webhook handling
  - Subscription management
  - Billing schedules

#### KYC Service (Port 3002)
- **Technology**: Express.js + TypeScript  
- **Purpose**: Plaid identity verification
- **Database**: Shared PostgreSQL via DATABASE_URL
- **Key Features**:
  - Plaid Link token generation
  - Identity verification
  - Document verification

#### Queue Service (Port 3003)
- **Technology**: Express.js + TypeScript
- **Purpose**: Member queue management
- **Database**: Shared PostgreSQL via DATABASE_URL
- **Key Features**:
  - Queue position tracking
  - Member statistics
  - Tenure calculation

#### Payout Service (Port 3004)
- **Technology**: Express.js + TypeScript
- **Purpose**: Reward processing and winner selection
- **Database**: Shared PostgreSQL via DATABASE_URL
- **Key Features**:
  - Winner determination
  - Payout processing
  - Cron jobs for eligibility checking

### 3. Database Architecture
- **Type**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Pattern**: **Shared Database** - All services connect to the same database
- **Connection**: Single DATABASE_URL shared across all services
- **Schema**: 11 schema files with 25+ tables

### 4. Communication Patterns

#### Service-to-Service Communication
- **Protocol**: HTTP REST APIs
- **Discovery**: Hardcoded URLs via environment variables
- **Authentication**: Cookie-based session sharing
- **CORS**: Configured allowed origins

#### Database Communication
- **Pattern**: Shared database architecture
- **Connection Pooling**: Each service manages its own connections
- **Transactions**: Service-level database transactions

### 5. Current Deployment Setup

#### Local Development
- **Containerization**: Docker Compose
- **Service Coordination**: All services run in separate containers
- **Networking**: Docker bridge network (tenure-network)
- **Database**: External PostgreSQL (Supabase)

#### Production Readiness
- **Serverless Support**: All services detect serverless environments
- **Health Checks**: `/health` endpoint on every service
- **Graceful Shutdown**: SIGTERM/SIGINT handling

### 6. API Organization

#### Main Application APIs (pages/api/)
```
/api/auth/           - Authentication endpoints
/api/subscriptions/  - Payment processing
/api/kyc/           - Identity verification
/api/queue/         - Queue management
/api/business-rules/ - Business logic enforcement
/api/dashboard/      - Dashboard data
/api/profiles/      - User management
/api/settings/      - User preferences
```

#### Microservice APIs
- **Subscription Service**: `/api/subscriptions`, `/api/billing`, `/api/webhooks`
- **KYC Service**: `/kyc`
- **Queue Service**: `/api/queue`
- **Payout Service**: `/api/payout`, `/api/eligibility`

### 7. Data Flow Architecture

#### User Request Flow
1. Client → Next.js Main App (port 3000)
2. Main App → Microservices (HTTP calls)
3. All Services → Shared Database (PostgreSQL)
4. Response flows back through same path

#### Authentication Flow
- **Session Management**: Better Auth with HTTP-only cookies
- **Cross-Service Auth**: Cookie sharing between services
- **Session Validation**: Each service validates sessions independently

### 8. Technology Stack Summary

#### Frontend
- Next.js 15.5.6 (React 18.3.1)
- TypeScript 5.8.3
- Tailwind CSS + shadcn/ui
- TanStack React Query

#### Backend Services
- Node.js 18+ with Express.js
- TypeScript
- Drizzle ORM
- Better Auth (main app only)

#### External Integrations
- Stripe (payments)
- Plaid (KYC)
- Twilio (SMS)
- Google OAuth
- Gmail SMTP

#### Database
- PostgreSQL (Supabase)
- Drizzle ORM
- Shared across all services

### 9. Current Architecture Characteristics

#### Strengths
- **Service Independence**: Each service can be deployed separately
- **Technology Flexibility**: Services can use different versions/dependencies
- **Database Consistency**: Shared data ensures consistency
- **Scalability**: Individual service scaling possible


### 10. Security Architecture

#### Authentication
- **Method**: Better Auth with session cookies
- **Cross-Service**: Cookie sharing between services
- **Multi-Factor**: 2FA, passkeys, OAuth supported

#### Security Measures
- **CORS**: Configured per service
- **Rate Limiting**: Express rate-limit middleware
- **Helmet**: Security headers
- **Input Validation**: Zod schemas


