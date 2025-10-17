# Subscription Service

Microservice for handling Stripe subscriptions and payments for the Tenure Reward Program.

## Features

- ✅ Stripe Checkout integration ($325 first month, $25/month recurring)
- ✅ Subscription management (create, cancel, reactivate)
- ✅ Payment tracking and history
- ✅ Webhook handling for Stripe events
- ✅ Queue updates for member subscription status
- ✅ Dockerized for easy deployment
- ✅ TypeScript with strict type checking
- ✅ PostgreSQL integration

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Payment**: Stripe
- **Logging**: Winston
- **Validation**: Zod

## Prerequisites

- Node.js 18+ or Docker
- PostgreSQL database
- Stripe account with test keys

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URI` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

## Installation

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

## API Endpoints

### Subscriptions

#### Create Checkout Session
```http
POST /api/subscriptions/checkout
Content-Type: application/json

{
  "memberId": 1,
  "successUrl": "http://localhost:3000/dashboard?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "http://localhost:3000/subscription/cancel"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_xxx",
    "url": "https://checkout.stripe.com/c/pay/xxx"
  }
}
```

#### Get Subscription
```http
GET /api/subscriptions/:memberId
```

#### Cancel Subscription
```http
POST /api/subscriptions/:memberId/cancel
Content-Type: application/json

{
  "immediately": false
}
```

#### Reactivate Subscription
```http
POST /api/subscriptions/:memberId/reactivate
```

#### Get Payment History
```http
GET /api/subscriptions/:memberId/payments
```

### Webhooks

#### Stripe Webhook
```http
POST /api/webhooks/stripe
```

Handled events:
- `checkout.session.completed` - Subscription created
- `invoice.payment_succeeded` - Payment recorded
- `customer.subscription.updated` - Subscription status updated
- `customer.subscription.deleted` - Subscription canceled

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

## Testing with Stripe

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

Use any future expiry date and any CVC.

### Test Webhooks Locally

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
```

## Database Schema

### Tables Used
- `subscription` - Stripe subscription records
- `payment` - Payment transactions
- `queue` - Member queue with subscription status
- `member` - Member details

## Deployment

### Docker Production

```bash
# Build production image
docker build -t subscription-service:latest .

# Run container
docker run -d \
  -p 3001:3001 \
  --env-file .env \
  --name subscription-service \
  subscription-service:latest
```

### Kubernetes (example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: subscription-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: subscription-service
  template:
    metadata:
      labels:
        app: subscription-service
    spec:
      containers:
      - name: subscription-service
        image: subscription-service:latest
        ports:
        - containerPort: 3001
        envFrom:
        - secretRef:
            name: subscription-service-secrets
```

## Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "subscription-service",
  "timestamp": "2025-10-17T10:00:00.000Z"
}
```

## Logging

Logs are written to:
- Console (colored, formatted)
- `combined.log` (all logs)
- `error.log` (errors only)

## Security

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Webhook signature verification
- ✅ Input validation with Zod
- ✅ Non-root Docker user

## License

ISC
