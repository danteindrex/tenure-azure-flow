# Next.js Admin Dashboard

A clean and modern admin dashboard built with Next.js, TypeScript, and Tailwind CSS. Perfect for managing users, viewing analytics, and handling administrative tasks.

## Features

- **Real-time Dashboard**: Live statistics from Supabase, Stripe, Twilio, and Email services
- **User Management**: Complete CRUD operations with Supabase integration
- **Financial Analytics**: Combined revenue tracking from Supabase transactions and Stripe payments
- **Stripe Integration**: MRR, churn rate, subscription analytics, and payment tracking
- **SMS Analytics**: Twilio message delivery, cost analysis, and verification statistics
- **Email Monitoring**: SMTP delivery tracking, email type analysis, and success rates
- **Microservice Health**: Real-time monitoring of all your services
- **Integration Status**: Live connection monitoring for all external services
- **WebSocket Real-time**: Instant updates via Supabase real-time subscriptions
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Graceful Fallbacks**: Continues working even when services are offline

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Payments**: Stripe analytics and subscription tracking
- **SMS**: Twilio analytics and delivery monitoring
- **Email**: SMTP analytics via Gmail
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: Recharts
- **State Management**: TanStack Query
- **Real-time**: WebSocket integration
- **Icons**: Lucide React

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Environment setup:**
```bash
# The .env.local file is already configured with your credentials
# All integrations (Supabase, Stripe, Twilio, Email) are ready to use
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open [http://localhost:3002](http://localhost:3002) in your browser.**

5. **View integrations:**
   - Navigate to `/integrations` to see all service connections
   - Dashboard shows real-time data from all integrated services
   - All analytics update automatically

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (Dashboard)
│   ├── providers.tsx      # Global providers
│   └── [routes]/          # Individual route pages
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   ├── pages/            # Page-specific components
│   └── AdminLayout.tsx   # Main layout component
├── lib/                  # Utility functions
└── hooks/                # Custom React hooks
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Features Overview

The dashboard includes several key sections:

- **Dashboard**: Overview with key metrics and charts
- **Users**: User management with search and filtering
- **Financial**: Revenue reports and financial analytics
- **Payouts**: Payout management and tracking
- **Content**: Content management system
- **Audit**: Activity logs and audit trails

The dashboard is fully integrated with your existing infrastructure:
- **Supabase**: Real-time data from your existing database
- **Stripe**: Live payment and subscription analytics  
- **Twilio**: SMS delivery monitoring and cost tracking
- **Email**: SMTP delivery analytics via Gmail
- **Microservices**: Health monitoring for all your services

All integrations include graceful fallbacks if services are temporarily unavailable.

## Customization

The dashboard is built with a modular component structure, making it easy to:
- Add new pages and routes
- Customize the sidebar navigation
- Modify the color scheme and styling
- Integrate with different data sources
- Add authentication and authorization

## Project Info

**Original URL**: https://lovable.dev/projects/56bb41e4-6864-4885-87d6-424680e6e1d0

This project was converted from a Vite + React application to Next.js with App Router and simplified to remove microservice dependencies.