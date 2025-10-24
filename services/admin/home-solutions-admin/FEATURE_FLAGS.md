# Feature Flags System

This admin dashboard includes a comprehensive feature flags system that allows you to enable/disable features during development and production.

## Location

- **Configuration**: `src/config/features.ts`
- **Usage**: Import `features` or use helper functions from the config file

## Purpose

The feature flags system serves several purposes:

1. **Development Focus**: Turn off distracting features while working on core functionality
2. **Gradual Rollout**: Enable features incrementally as they're implemented
3. **Environment-Specific**: Different features for dev vs production
4. **External Dependencies**: Disable features that require external services (KYC providers, etc.)

## Feature Categories

### Core Features (Always Enabled)
```typescript
core: {
  users: true,
  payments: true,
  subscriptions: true,
  queue: true,
}
```

### Compliance Features (Toggle-able)
```typescript
compliance: {
  kycVerification: true,      // KYC verification UI and tracking
  amlMonitoring: false,        // AML transaction monitoring (can be distracting)
  complianceDashboard: true,   // Compliance overview dashboard
  regulatoryReporting: false,  // IRS/regulatory reports (not needed in dev)
}
```

### Security Features (Recommended to Keep Enabled)
```typescript
security: {
  enhancedAuditLogs: true,     // Detailed audit trails
  securityMonitoring: false,   // Security event monitoring (can be distracting)
  rbacDashboard: true,         // Role-based access control UI
  sessionTracking: true,       // Session and login tracking
}
```

### Financial Features
```typescript
financial: {
  advancedAnalytics: true,      // Advanced financial charts and analytics
  paymentReconciliation: true,  // Payment reconciliation tools
  cashFlowAnalysis: false,      // Cash flow reports (can be distracting)
  revenueForecasting: false,    // Revenue predictions (can be distracting)
  financialReports: true,       // Standard financial reports
}
```

### Payment Processing
```typescript
payments: {
  disputeManagement: true,         // Chargeback and dispute tracking
  chargebackTracking: true,        // Detailed chargeback analytics
  paymentProviderManagement: false, // Multi-provider switching (not needed in dev)
  refundTracking: true,            // Refund management
}
```

### Queue & Payout Management
```typescript
queue: {
  queueAnalytics: true,              // Queue analytics and reporting
  payoutWorkflow: true,              // Payout approval workflow
  tenureVerification: true,          // Tenure calculation verification
  queueManipulationDetection: true,  // Detect unauthorized queue changes
  payoutScheduling: true,            // Schedule payouts
}
```

### Tax Compliance
```typescript
tax: {
  form1099Generation: true,  // Generate 1099 forms
  w9Collection: true,        // W-9 collection and storage
  taxWithholding: true,      // Calculate tax withholding
  irsReporting: false,       // IRS filing integration (not needed in dev)
}
```

### Communication (Can Be Distracting)
```typescript
communication: {
  inAppMessaging: false,     // In-app messaging system
  emailTemplates: true,      // Email template management
  smsNotifications: false,   // SMS alerts
  pushNotifications: false,  // Push notifications
}
```

### Alerting & Notifications
```typescript
alerts: {
  adminAlerts: true,              // Admin alert system
  systemHealthMonitoring: false,  // System uptime monitoring (can be distracting)
  escalationWorkflows: false,     // Alert escalation (can be distracting)
  multiChannelNotifications: false, // Multiple notification channels
}
```

### Reporting & Export
```typescript
reporting: {
  customReportBuilder: true,    // Build custom reports
  scheduledReports: false,      // Auto-generate reports (can be distracting)
  bulkDataExport: true,         // Export data in bulk
  advancedVisualizations: true, // Advanced charts
}
```

### User Management
```typescript
userManagement: {
  userSegmentation: true,   // Segment users into cohorts
  cohortAnalysis: false,    // Cohort analytics (can be distracting)
  supportTickets: false,    // Support ticket system (can be distracting)
  engagementScoring: false, // User engagement scores (can be distracting)
}
```

### Experimental/AI (Always Disabled - Handled Elsewhere)
```typescript
experimental: {
  fraudDetectionAI: false,      // AI-based fraud detection
  predictiveAnalytics: false,   // ML-based predictions
  churnPrediction: false,       // Churn risk scoring
}
```

## How to Use

### Method 1: Edit Configuration File

Edit `src/config/features.ts` directly:

```typescript
const DEVELOPMENT_FLAGS: FeatureFlags = {
  compliance: {
    kycVerification: false,  // Disable KYC during development
    // ...
  },
}
```

### Method 2: Environment Variables

Override specific flags using environment variables:

```bash
# .env.local or .env
FEATURE_COMPLIANCE_KYCVERIFICATION=true
FEATURE_TAX_FORM1099GENERATION=false
FEATURE_ALERTS_ADMINALERTS=true
```

Format: `FEATURE_{CATEGORY}_{FEATURE}=true|false`

Examples:
- `FEATURE_COMPLIANCE_KYCVERIFICATION=true`
- `FEATURE_QUEUE_PAYOUTWORKFLOW=false`
- `FEATURE_REPORTING_SCHEDULEDREPORTS=true`

### Method 3: In Collection Files

Collections automatically hide based on feature flags:

```typescript
import { isFeatureEnabled } from '../config/features'

export const KYCVerification: CollectionConfig = {
  slug: 'kyc_verification',
  admin: {
    hidden: !isFeatureEnabled('compliance', 'kycVerification'), // Hide if disabled
    // ...
  },
}
```

### Method 4: In React Components

```typescript
import { features, isFeatureEnabled, withFeature } from '../config/features'

// Direct access
if (features.compliance.kycVerification) {
  // Show KYC features
}

// Helper function
if (isFeatureEnabled('compliance', 'kycVerification')) {
  // Show KYC features
}

// Conditional rendering
return withFeature(
  'compliance',
  'kycVerification',
  <KYCVerificationComponent />,
  <DisabledMessage /> // Optional fallback
)
```

## Development vs Production

### Development (Default)
- **Focus**: Core features + essential compliance
- **Disabled**: Distracting features (notifications, scheduled tasks, advanced analytics)
- **Purpose**: Faster development, less noise

### Production
- **All Enabled**: Except AI/ML features (handled separately)
- **Purpose**: Full feature set for end users

## Recommended Development Setup

```typescript
// Minimal setup for focused development
const MINIMAL_DEV_FLAGS = {
  core: { users: true, payments: true, subscriptions: true, queue: true },
  compliance: { kycVerification: true, amlMonitoring: false, complianceDashboard: true, regulatoryReporting: false },
  security: { enhancedAuditLogs: true, securityMonitoring: false, rbacDashboard: true, sessionTracking: false },
  financial: { advancedAnalytics: true, paymentReconciliation: true, cashFlowAnalysis: false, revenueForecasting: false, financialReports: true },
  payments: { disputeManagement: true, chargebackTracking: true, paymentProviderManagement: false, refundTracking: true },
  queue: { queueAnalytics: true, payoutWorkflow: true, tenureVerification: true, queueManipulationDetection: true, payoutScheduling: true },
  tax: { form1099Generation: true, w9Collection: true, taxWithholding: true, irsReporting: false },
  communication: { inAppMessaging: false, emailTemplates: false, smsNotifications: false, pushNotifications: false },
  alerts: { adminAlerts: true, systemHealthMonitoring: false, escalationWorkflows: false, multiChannelNotifications: false },
  reporting: { customReportBuilder: true, scheduledReports: false, bulkDataExport: true, advancedVisualizations: false },
  userManagement: { userSegmentation: false, cohortAnalysis: false, supportTickets: false, engagementScoring: false },
  experimental: { fraudDetectionAI: false, predictiveAnalytics: false, churnPrediction: false },
}
```

## Testing Feature Flags

To test a specific feature in isolation:

1. **Disable all optional features**
2. **Enable only the feature you're testing**
3. **Restart the admin dashboard**

```bash
# Example: Testing KYC verification only
FEATURE_COMPLIANCE_KYCVERIFICATION=true \
FEATURE_ALERTS_ADMINALERTS=false \
FEATURE_REPORTING_CUSTOMREPORTBUILDER=false \
npm run dev
```

## Feature Flag Dashboard Notice

When in development mode with some features disabled, the dashboard shows:

```
ℹ️ Development Mode: Some features are disabled via feature flags.
Check src/config/features.ts to enable/disable features.
```

This reminds developers that certain features are intentionally hidden.

## Collections Added with Feature Flags

| Collection | Feature Flag | Category |
|-----------|--------------|----------|
| KYCVerification | `compliance.kycVerification` | Compliance |
| TransactionMonitoring | `compliance.amlMonitoring` | Compliance |
| Disputes | `payments.disputeManagement` | Payments |
| PayoutManagement | `queue.payoutWorkflow` | Queue & Payouts |
| TaxForms | `tax.form1099Generation` | Tax & Legal |
| AdminAlerts | `alerts.adminAlerts` | System |
| ReportTemplates | `reporting.customReportBuilder` | Reporting |

## Best Practices

1. **Keep Core Features Enabled**: Don't disable users, payments, subscriptions, or queue
2. **Disable During Testing**: Turn off unrelated features when testing specific functionality
3. **Document Changes**: If you change defaults, document why in your commit message
4. **Production Checklist**: Before deploying to production, review all feature flags
5. **External Dependencies**: Keep features disabled if they require external services you haven't set up

## Troubleshooting

### Collection Not Showing Up
- Check if feature flag is enabled in `src/config/features.ts`
- Check environment variables for overrides
- Restart the admin dashboard server

### Too Many Collections
- Disable optional features in development mode
- Use environment variables for quick toggles

### Feature Appears in Production When It Shouldn't
- Check `PRODUCTION_FLAGS` in `src/config/features.ts`
- Verify no environment variable overrides

## Future Enhancements

- Web UI for toggling feature flags (admin settings page)
- Per-user feature flags (beta access)
- A/B testing capabilities
- Analytics on feature usage
