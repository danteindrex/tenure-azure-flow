#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Vercel Deployment Script            ║${NC}"
echo -e "${BLUE}║  Tenure Azure Flow - All Services    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
else
    echo -e "${GREEN}✓ Vercel CLI already installed${NC}"
fi

# Login to Vercel
echo -e "${BLUE}🔐 Logging into Vercel...${NC}"
vercel login

# Store deployment URLs
SUBSCRIPTION_URL=""
FRONTEND_URL=""
ADMIN_URL=""

# Deploy Subscription Service
echo -e "\n${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  1. Deploying Subscription Service   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"

cd services/subscription-service

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🔨 Building service...${NC}"
npm run build

echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
SUBSCRIPTION_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [ -z "$SUBSCRIPTION_URL" ]; then
    echo -e "${RED}❌ Failed to get subscription service URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Subscription Service deployed: ${SUBSCRIPTION_URL}${NC}"

# Set environment variables for subscription service
echo -e "${YELLOW}⚙️  Setting environment variables...${NC}"

vercel env add DATABASE_URI production <<EOF
your_postgresql_database_uri_here
EOF

vercel env add STRIPE_SECRET_KEY production <<EOF
your_stripe_secret_key_here
EOF

vercel env add STRIPE_PUBLISHABLE_KEY production <<EOF
your_stripe_publishable_key_here
EOF

vercel env add PORT production <<EOF
3001
EOF

vercel env add NODE_ENV production <<EOF
production
EOF

vercel env add INITIAL_PAYMENT_AMOUNT production <<EOF
325
EOF

vercel env add RECURRING_PAYMENT_AMOUNT production <<EOF
25
EOF

vercel env add CURRENCY production <<EOF
usd
EOF

# Deploy Frontend
echo -e "\n${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  2. Deploying Frontend                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"

cd ../frontend

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
npm install @stripe/stripe-js

echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
FRONTEND_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [ -z "$FRONTEND_URL" ]; then
    echo -e "${RED}❌ Failed to get frontend URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend deployed: ${FRONTEND_URL}${NC}"

# Set environment variables for frontend
echo -e "${YELLOW}⚙️  Setting environment variables...${NC}"

vercel env add NEXT_PUBLIC_SUPABASE_URL production <<EOF
your_supabase_url_here
EOF

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<EOF
your_supabase_anon_key_here
EOF

vercel env add SUPABASE_SERVICE_ROLE_KEY production <<EOF
your_supabase_service_role_key_here
EOF

vercel env add SUPABASE_JWT_SECRET production <<EOF
your_supabase_jwt_secret_here
EOF

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production <<EOF
your_stripe_publishable_key_here
EOF

vercel env add NEXT_PUBLIC_SUBSCRIPTION_SERVICE_URL production <<EOF
${SUBSCRIPTION_URL}
EOF

# Update subscription service with frontend URL
echo -e "\n${YELLOW}⚙️  Updating subscription service with frontend URL...${NC}"
cd ../subscription-service

vercel env add FRONTEND_URL production <<EOF
${FRONTEND_URL}
EOF

vercel env add ALLOWED_ORIGINS production <<EOF
${FRONTEND_URL}
EOF

echo -e "${YELLOW}🚀 Redeploying subscription service...${NC}"
vercel --prod --yes

# Deploy Admin
echo -e "\n${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  3. Deploying Admin Panel             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"

cd ../../admin/home-solutions-admin

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install

echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
ADMIN_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [ -z "$ADMIN_URL" ]; then
    echo -e "${RED}❌ Failed to get admin URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Admin Panel deployed: ${ADMIN_URL}${NC}"

# Set environment variables for admin
echo -e "${YELLOW}⚙️  Setting environment variables...${NC}"

vercel env add DATABASE_URI production <<EOF
your_postgresql_database_uri_here
EOF

vercel env add PAYLOAD_SECRET production <<EOF
your_payload_secret_here
EOF

# Summary
echo -e "\n${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ All Services Deployed!             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Deployment URLs:${NC}"
echo -e "   ${GREEN}Subscription Service:${NC} ${SUBSCRIPTION_URL}"
echo -e "   ${GREEN}Frontend:${NC} ${FRONTEND_URL}"
echo -e "   ${GREEN}Admin Panel:${NC} ${ADMIN_URL}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "   1. Configure Stripe Webhook:"
echo -e "      URL: ${SUBSCRIPTION_URL}/api/webhooks/stripe"
echo -e "      Events: checkout.session.completed, invoice.payment_succeeded,"
echo -e "              customer.subscription.updated, customer.subscription.deleted"
echo ""
echo -e "   2. Get webhook secret from Stripe Dashboard"
echo ""
echo -e "   3. Add webhook secret to subscription service:"
echo -e "      ${BLUE}cd services/subscription-service${NC}"
echo -e "      ${BLUE}vercel env add STRIPE_WEBHOOK_SECRET production${NC}"
echo -e "      ${BLUE}vercel --prod${NC}"
echo ""
echo -e "   4. Test subscription flow:"
echo -e "      ${BLUE}${FRONTEND_URL}/subscribe${NC}"
echo ""
echo -e "${GREEN}✨ Deployment Complete!${NC}"
