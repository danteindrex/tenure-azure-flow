# Technical Architecture - Home Solutions (Tenure Azure Flow)

## Executive Summary

Home Solutions is a full-stack membership rewards platform built with a hybrid monolith-microservices architecture. The platform implements a queue-based reward system where members compete for $100,000 payouts based on continuous tenure length, powered by a $300 joining fee plus $25/month subscription model.

## System Overview

### Business Model
- **Membership Fee Structure**: $300 one-time joining fee + $25/month recurring
- **Reward System**: $100,000 payouts to members with longest continuous tenure
- **Queue Management**: Dynamic positioning based on payment history and tenure
- **Compliance**: Full KYC verification, tax form handling, and audit logging

### Key Statistics
- **47+ API Endpoints** across main application and microservices
- **4 Independent Microservices** for specialized business functions
- **10 Core Business Rules** with automated enforcement
- **100+ Test Cases** covering security and functionality
- **11 Database Schema Files** organizing complex data relationships

## Architecture Patterns

### Hybrid Architecture Approach
The system employs a **hybrid monolith + microservices** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Next.js Frontend (React 18.3.1) + TypeScript              │
│  - shadcn/ui Components + Tailwind CSS                     │
│  - TanStack React Query for state management               │
│  - Framer Motion for animations                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 API Gateway Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes (Pages Router)                         │
│  - 47+ endpoints across 15+ route groups                   │
│  - Better Auth integration for authentication               │
│  - Middleware for routing and session validation           │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main App  │    │ Microservices   │    │ External APIs   │
│  (Port 3000)│    │                 │    │                 │
│             │    │ Subscription    │    │ • Stripe        │
│ • Core APIs │    │ (Port 3001)     │    │ • Plaid         │
│ • Auth      │    │ • Stripe        │    │ • Twilio        │
│ • Dashboard │    │ • Webhooks      │    │ • Google OAuth  │
│ • Queue     │    │                 │    │ • Gmail SMTP    │
└─────────────┘    ├─────────────────┤    └─────────────────┘
                   │ KYC Service     │
                   │ (Port 3002)     │
                   │ • Plaid IDV     │
                   │ • Document      │
                   │   verification  │
                   ├─────────────────┤
                   │ Queue Service   │
                   │ (Port 3003)     │
                   │ • Member queue  │
                   │ • Position      │
                   │   tracking      │
                   ├─────────────────┤
                   │ Payout Service  │
                   │ (Port 3004)     │
                   │ • Winner        │
                   │   selection     │
                   │ • Reward        │
                   │   processing    │
                   └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase) + Drizzle ORM                       │
│  - 11 schema files with 25+ tables                         │
│  - Connection pooling for serverless optimization          │
│  - Materialized views for queue performance                │
│  - Comprehensive audit logging                             │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Technologies
- **Framework**: Next.js 15.5.6 (React 18.3.1)
- **Language**: TypeScript 5.8.3
- **Styling**: Tailwind CSS 3.4.17 + shadcn/ui components
- **State Management**: TanStack React Query 5.90.9
- **Forms**: React Hook Form 7.61.1 + Zod 3.25.76 validation
- **Animations**: Framer Motion 12.23.24
- **UI Components**: Radix UI primitives via shadcn/ui
- **Theme**: next-themes for dark/light mode

### Backend Technologies
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes + Express.js microservices
- **Authentication**: Better Auth 1.4.0-beta.15
- **Database ORM**: Drizzle ORM 0.44.7
- **Database**: PostgreSQL (Supabase hosting)
- **Validation**: Zod schemas
- **Email**: Nodemailer with Gmail SMTP

### External Service Integrations
- **Payments**: Stripe (Checkout, Subscriptions, Webhooks)
- **KYC/Identity**: Plaid Identity Verification with liveness detection
- **SMS**: Twilio Verify for 2FA and notifications
- **Email**: Gmail SMTP via Nodemailer
- **OAuth**: Google OAuth 2.0 for social login
- **Deployment**: Vercel (serverless)

### Development & Testing
- **Testing Framework**: Playwright (E2E) + Vitest (Unit)
- **Code Quality**: ESLint + TypeScript
- **Containerization**: Docker + Docker Compose
- **Version Control**: Git
- **CI/CD**: Vercel automatic deployments

## Database Architecture

### Schema Organization
The database is organized into 11 domain-specific schema files:

1. **auth.ts** - Better Auth tables (user, session, account, verification, 2FA, passkeys)
2. **users.ts** - Core user data (profiles, contacts, addresses, memberships)
3. **settings.ts** - User preferences (notifications, security, privacy, appearance)
4. **financial.ts** - Payment infrastructure (methods, subscriptions, payments, billing)
5. **membership.ts** - Business logic (queue, KYC, payouts, disputes)
6. **compliance.ts** - Regulatory requirements (tax forms, transaction monitoring)
7. **audit.ts** - System and user activity logging
8. **organizations.ts** - Team/organization management
9. **admin.ts** - Administrative functions and CMS
10. **verification.ts** - Verification code management
11. **status-system.ts** - Unified status management with helper functions

### Key Database Features
- **Materialized Views**: Queue performance optimization (100x faster queries)
- **Connection Pooling**: Optimized for serverless (Vercel) environments
- **Comprehensive Indexing**: Performance-optimized for queue operations
- **Audit Trail**: Complete system and user activity logging
- **Status System**: Unified enum-based status management across all entities

## Microservices Architecture

### 1. Subscription Service (Port 3001)
**Responsibility**: Stripe payment processing and subscription management
- Stripe Checkout session creation
- Webhook processing (payment events)
- Subscription lifecycle management
- Payment method handling
- Billing schedule management

### 2. KYC Service (Port 3002)
**Responsibility**: Identity verification via Plaid
- Plaid Link token generation
- Identity verification submission
- Document and selfie verification
- Liveness detection
- Verification status tracking

### 3. Queue Service (Port 3003)
**Responsibility**: Member queue management and positioning
- Queue position calculation
- Tenure tracking
- Member status validation
- Queue statistics and analytics
- Performance optimization

### 4. Payout Service (Port 3004)
**Responsibility**: Reward processing and winner selection
- Winner determination algorithm
- Eligibility verification
- Payout processing
- Tax form handling
- Dispute management

## API Architecture

### Main Application APIs (47+ endpoints)
Organized into functional domains:

#### Authentication APIs
- Email/password signup and login
- Google OAuth integration
- Passkey (WebAuthn) support
- Two-factor authentication (TOTP)
- Session management

#### Business Logic APIs
- Queue position tracking
- Payment status validation
- Tenure calculation
- Payout eligibility checking
- Business rule enforcement

#### User Management APIs
- Profile management
- Settings and preferences
- Notification management
- Data export (GDPR compliance)
- Activity history

#### Administrative APIs
- User management
- System monitoring
- Audit log access
- Configuration management

### Inter-Service Communication
- **HTTP REST APIs** for synchronous communication
- **Shared Database** for data consistency
- **Environment Variables** for service discovery
- **CORS Configuration** for cross-origin requests
- **Health Checks** for service monitoring

## Security Architecture

### Authentication & Authorization
- **Multi-Method Authentication**: Email/password, OAuth, Passkeys, 2FA
- **Session-Based Auth**: HTTP-only secure cookies (not JWT)
- **Account Linking**: Multiple auth methods per user
- **Organization Support**: Team-based access control

### Security Measures
- **OWASP Compliance**: Protection against Top 10 vulnerabilities
- **Rate Limiting**: DDoS and brute-force protection
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: Content Security Policy and input sanitization
- **CSRF Protection**: SameSite cookies and origin validation

### Data Protection
- **Encryption**: TLS 1.3 for all communications
- **PII Protection**: Encrypted sensitive data storage
- **Audit Logging**: Complete system activity tracking
- **GDPR Compliance**: Data export and deletion capabilities
- **KYC Verification**: Identity verification with liveness detection

## Performance Architecture

### Frontend Optimization
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Caching Strategy**: React Query for API caching
- **Bundle Optimization**: Tree shaking and minification

### Backend Performance
- **Database Optimization**: 
  - Materialized views for queue queries
  - Connection pooling for serverless
  - Comprehensive indexing strategy
- **API Performance**:
  - Efficient query patterns
  - Response caching where appropriate
  - Lazy loading of data

### Infrastructure Performance
- **Serverless Architecture**: Vercel edge functions
- **CDN Distribution**: Global content delivery
- **Database Optimization**: Supabase with read replicas
- **Microservice Scaling**: Independent service scaling

## Deployment Architecture

### Production Environment
- **Main Application**: Vercel serverless deployment
- **Microservices**: Individual Vercel deployments or Docker containers
- **Database**: Supabase PostgreSQL with connection pooling
- **Static Assets**: Vercel edge network
- **Domain Management**: Custom domain with SSL certificates

### Development Environment
- **Local Development**: Docker Compose for full stack
- **Database**: Local PostgreSQL or Supabase development
- **Service Discovery**: Localhost with port mapping
- **Hot Reloading**: Next.js development server

### CI/CD Pipeline
- **Automatic Deployments**: Vercel Git integration
- **Environment Management**: Separate dev/staging/production
- **Testing Pipeline**: Automated test execution
- **Rollback Capability**: Instant rollback to previous deployments

## Monitoring & Observability

### Application Monitoring
- **Health Checks**: Service availability monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time and throughput
- **User Analytics**: Feature usage tracking

### Business Intelligence
- **Queue Analytics**: Member position and tenure statistics
- **Financial Metrics**: Revenue and payout tracking
- **User Engagement**: Dashboard and feature usage
- **Compliance Reporting**: KYC and audit reporting

## Scalability Considerations

### Horizontal Scaling
- **Serverless Functions**: Automatic scaling with demand
- **Database Scaling**: Read replicas and connection pooling
- **Microservice Scaling**: Independent service scaling
- **CDN Scaling**: Global edge distribution

### Vertical Scaling
- **Database Optimization**: Query performance tuning
- **Memory Management**: Efficient data structures
- **Compute Optimization**: Serverless function optimization

## Business Logic Implementation

### Core Business Rules (10 Rules)
1. **One-Time Joining Fee**: $300 required for membership
2. **Monthly Recurring Fee**: $25/month subscription
3. **Payout Trigger**: $100K fund + 12 months minimum
4. **Reward Amount**: $100,000 per winner
5. **Winner Determination**: Longest continuous tenure
6. **Multiple Winners**: Fund growth enables additional winners
7. **Retention Requirement**: 12 months pre-payment for eligibility
8. **Default Penalty**: Immediate position loss on missed payment
9. **Tenure Start Date**: From joining fee payment date
10. **Tie-Breaker**: Lowest member ID wins in ties

### Enforcement Mechanisms
- **Automated Validation**: Real-time business rule checking
- **Queue Management**: Dynamic position calculation
- **Payment Processing**: Stripe integration for compliance
- **Audit Trail**: Complete business decision logging

## Future Architecture Considerations

### Potential Enhancements
- **Event-Driven Architecture**: Kafka/RabbitMQ for async processing
- **CQRS Pattern**: Read/write separation for complex queries
- **Microservice Mesh**: Service mesh for inter-service communication
- **Advanced Caching**: Redis for session and data caching
- **Real-time Features**: WebSocket integration for live updates

### Technology Evolution
- **Framework Updates**: Regular Next.js and React updates
- **Database Evolution**: Potential migration to other databases
- **Cloud Migration**: Multi-cloud deployment strategy
- **API Evolution**: GraphQL for complex data requirements

## Conclusion

The Home Solutions platform demonstrates a sophisticated technical architecture that balances complexity with maintainability. The hybrid monolith-microservices approach provides the benefits of microservices (specialization, independent scaling) while maintaining the simplicity of a monolith for core functionality.

The architecture is designed for:
- **Scalability**: Serverless deployment and microservice isolation
- **Security**: Comprehensive authentication and authorization
- **Performance**: Optimized database queries and caching strategies
- **Maintainability**: Clear separation of concerns and modular design
- **Compliance**: Full audit trails and regulatory adherence

This technical foundation supports the complex business requirements of a membership rewards platform while ensuring security, performance, and scalability for future growth.