# Quick Start Guide - Admin Dashboard

## 🚀 Get Started in 5 Minutes

### Step 1: Create Database Tables

Run this SQL in your Supabase SQL editor:

```sql
-- See ADMIN_DASHBOARD_UPGRADE.md for complete SQL
-- Or run: psql <connection-string> < setup_admin_tables.sql
```

The full SQL is in `ADMIN_DASHBOARD_UPGRADE.md` under "Database Tables Required".

### Step 2: Start the Admin Dashboard

```bash
cd services/admin/home-solutions-admin
npm install  # If first time
npm run dev
```

Navigate to: `http://localhost:3000/admin`

### Step 3: Configure Features for Development

Edit `src/config/features.ts` or use environment variables:

**Minimal setup (recommended for development)**:
```bash
# .env.local
FEATURE_COMPLIANCE_AMLMONITORING=false
FEATURE_COMMUNICATION_INAPPMESSAGING=false
FEATURE_ALERTS_SYSTEMHEALTHMONITORING=false
FEATURE_REPORTING_SCHEDULEDREPORTS=false
```

**Or just keep the defaults** - they're already optimized for development!

---

## 🎯 Key Features Available

### Always Enabled (Core)
- 👥 **Users** - User management
- 💳 **Payments** - Payment tracking
- 📅 **Subscriptions** - Subscription management
- 🎯 **Queue** - Queue management

### Enabled by Default in Dev
- ✅ **KYC Verification** - Identity verification tracking
- 🔍 **Disputes** - Chargeback management
- 💰 **Payout Management** - Payout approvals
- 📝 **Tax Forms** - W-9 and 1099 generation
- 🚨 **Admin Alerts** - Alert system
- 📊 **Report Templates** - Custom reports

### Disabled by Default in Dev (Can distract)
- ❌ **AML Monitoring** - Transaction monitoring (turn on when needed)
- ❌ **Scheduled Reports** - Auto-generated reports (turn on when testing)
- ❌ **System Health Monitoring** - Uptime monitoring (turn on when needed)
- ❌ **In-App Messaging** - User messaging (turn on when testing)

---

## 🔧 Toggle Features On/Off

### Method 1: Environment Variables (Quick)
```bash
# Turn on AML monitoring
FEATURE_COMPLIANCE_AMLMONITORING=true npm run dev

# Turn off KYC verification
FEATURE_COMPLIANCE_KYCVERIFICATION=false npm run dev
```

### Method 2: Edit Config File (Permanent)
```typescript
// src/config/features.ts
const DEVELOPMENT_FLAGS: FeatureFlags = {
  compliance: {
    kycVerification: false,  // Turn off
    amlMonitoring: true,     // Turn on
  },
}
```

---

## 📋 Collections Overview

### Core Collections (Always Visible)
- **Members** → Users table
- **User Profiles** → Profiles
- **User Contacts** → Contact info
- **User Addresses** → Addresses
- **Payments** → All payments
- **Subscriptions** → Active subscriptions
- **Queue Entries** → Queue management

### New Feature-Flagged Collections
- **KYC Verification** → Identity verification
- **Transaction Monitoring** → AML/fraud monitoring
- **Disputes** → Chargebacks and disputes
- **Payout Management** → Payout workflow
- **Tax Forms** → W-9 and 1099s
- **Admin Alerts** → System alerts
- **Report Templates** → Custom reports

---

## 🎨 Dashboard Features

### Live Metrics (Auto-updates every 30 seconds)
- 👥 Total Users with growth %
- 💰 Total Revenue with monthly breakdown
- 🎯 Queue Status (eligible for payout)
- ✅ Compliance Status (KYC pending)
- 🚨 System Alerts (critical/warnings)
- 📊 Payment Success Rate

### Development Mode Notice
When features are disabled, you'll see:
```
ℹ️ Development Mode: Some features are disabled via feature flags.
```

---

## 🛠️ Common Development Workflows

### Workflow 1: Working on KYC Only
```bash
# Disable everything except KYC
FEATURE_COMPLIANCE_KYCVERIFICATION=true \
FEATURE_PAYMENTS_DISPUTEMANAGEMENT=false \
FEATURE_QUEUE_PAYOUTWORKFLOW=false \
npm run dev
```

### Workflow 2: Working on Payouts
```bash
# Enable payout + dependencies
FEATURE_QUEUE_PAYOUTWORKFLOW=true \
FEATURE_QUEUE_QUEUEANALYTICS=true \
FEATURE_TAX_FORM1099GENERATION=true \
npm run dev
```

### Workflow 3: Full Production Preview
```bash
# Set NODE_ENV to production (enables all features)
NODE_ENV=production npm run dev
```

---

## 📚 Documentation

- **Feature Flags Guide**: `FEATURE_FLAGS.md`
- **Complete Upgrade Details**: `ADMIN_DASHBOARD_UPGRADE.md`
- **This Quick Start**: `QUICK_START_ADMIN.md`

---

## 🐛 Troubleshooting

### Collection Not Showing
1. Check feature flag in `src/config/features.ts`
2. Restart the dev server
3. Check browser console for errors

### Too Many Collections
1. Edit `src/config/features.ts`
2. Set unwanted features to `false`
3. Restart dev server

### Dashboard Looks Wrong
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check console for JavaScript errors

---

## ✅ Checklist Before Production

- [ ] Review all feature flags in `src/config/features.ts`
- [ ] Set `NODE_ENV=production`
- [ ] Create all database tables (see SQL in ADMIN_DASHBOARD_UPGRADE.md)
- [ ] Configure external services:
  - [ ] KYC provider (Stripe Identity, Plaid, etc.)
  - [ ] Email service for reports
  - [ ] SMS service for alerts (optional)
- [ ] Test payout workflow end-to-end
- [ ] Test tax form generation
- [ ] Test dispute management
- [ ] Set up scheduled report delivery (if enabled)
- [ ] Configure admin alert notifications

---

## 🎉 You're Ready!

Your admin dashboard now has:
- ✅ KYC verification tracking
- ✅ AML transaction monitoring
- ✅ Dispute & chargeback management
- ✅ Payout approval workflow
- ✅ Tax form generation (W-9, 1099)
- ✅ Admin alert system
- ✅ Custom report builder
- ✅ Feature flags for flexible control

**Start developing with confidence!** 🚀

Need help? Check the documentation files or review the collection TypeScript files for detailed field descriptions.
