# Admin Navigation System

This document explains the comprehensive navigation system implemented for the admin panel using shadcn/ui components and PayloadCMS custom pages.

## Overview

The admin panel now features a modern, intuitive navigation system that provides quick access to all major sections of the platform. The navigation is built with:

- **shadcn/ui components** - Modern, accessible UI components
- **Feature flags integration** - Navigation items respect feature toggles
- **Custom dashboard pages** - Specialized views for different admin functions
- **PayloadCMS beforeNavLinks** - Navigation card appears before the collection links

## Navigation Structure

### Quick Access Card

Located at the top of the left sidebar (before nav links), the Quick Access card provides direct links to major admin sections:

1. **Dashboard** - Overview & Analytics
2. **Users & KYC** - User management dashboard
3. **Payments** - Payment transaction dashboard
4. **Queue & Payouts** - Queue analytics and payout approvals
5. **Compliance Center** - KYC, AML & audit logs
6. **Tax & Legal** - Tax forms and member agreements
7. **Reports** - Custom reports and analytics
8. **System & Alerts** - Admin alerts and settings

Each navigation item includes:
- **Icon** - Visual identifier using Lucide React icons
- **Title** - Section name
- **Description** - Brief explanation of the section
- **Badge** - Status indicator (Core, Active, Disabled)
- **Feature flag check** - Only shown if the feature is enabled

## Custom Dashboard Pages

### 1. User Management (`/admin/user-management`)

**Purpose**: Comprehensive user information and management

**Features**:
- User statistics dashboard (total, active, pending, revenue)
- Search and filter users
- Detailed user profiles with:
  - Account information
  - Profile details
  - Financial summary with payment history
  - Subscription & queue status
  - KYC verification status

**Components Used**:
- Custom React components with JSX styling
- API integration for real-time data
- Dual-panel layout (list + details)

### 2. Compliance Center (`/admin/compliance-center`)

**Purpose**: KYC verification, AML monitoring, and audit management

**Features**:
- Compliance score dashboard
- KYC application queue
- Risk scoring for users
- AML transaction monitoring
- Audit log activity
- Compliance reports generation

**Key Stats**:
- Total KYC applications
- Verification status breakdown
- Flagged transactions
- High-risk users count

**Components Used**:
- shadcn/ui Card, Tabs, Badge, ScrollArea
- Lucide React icons
- Feature flag integration

### 3. Payments Center (`/admin/payments-center`)

**Purpose**: Transaction management, disputes, and payment analytics

**Features**:
- Revenue dashboard with growth metrics
- Recent transactions list
- Payment method management
- Dispute tracking
- Transaction success rate
- Payment analytics

**Key Stats**:
- Total revenue
- Transaction count and average
- Success/failure rates
- Active disputes

**Components Used**:
- shadcn/ui Card, Tabs, Badge, ScrollArea
- Transaction status badges
- Real-time payment data

## File Structure

```
src/
├── components/
│   ├── ui/                          # shadcn/ui components
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── tabs.tsx
│   │   ├── separator.tsx
│   │   └── scroll-area.tsx
│   ├── AdminNavigation.tsx          # Quick Access navigation card
│   ├── FinancialDashboard.tsx       # Main dashboard metrics
│   └── AnalyticsGraphs.tsx          # Analytics visualizations
├── pages/
│   ├── UserManagement.tsx           # User management dashboard
│   ├── ComplianceCenter.tsx         # Compliance & KYC dashboard
│   └── PaymentsCenter.tsx           # Payments & transactions dashboard
├── config/
│   └── features.ts                  # Feature flags configuration
├── lib/
│   └── utils.ts                     # shadcn/ui utility functions
└── payload.config.ts                # PayloadCMS configuration
```

## Configuration

### PayloadCMS Config

The custom pages are registered in `payload.config.ts`:

```typescript
admin: {
  components: {
    beforeNavLinks: [AdminNavigation],
  },
  pages: [
    {
      slug: 'user-management',
      label: '👥 User Management',
      Component: () => import('./pages/UserManagement'),
    },
    {
      slug: 'compliance-center',
      label: '🛡️ Compliance Center',
      Component: () => import('./pages/ComplianceCenter'),
    },
    {
      slug: 'payments-center',
      label: '💳 Payments Center',
      Component: () => import('./pages/PaymentsCenter'),
    },
  ],
}
```

### Feature Flags Integration

Navigation items are controlled by feature flags from `src/config/features.ts`:

```typescript
const features = getFeatureFlags()

// Example: Compliance Center only shows if features are enabled
{
  title: 'Compliance Center',
  enabled: features.compliance.kycVerification || features.compliance.amlMonitoring,
}
```

### shadcn/ui Configuration

Configured in `components.json`:

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.cjs",
    "css": "src/app/(frontend)/styles.css",
    "baseColor": "slate"
  }
}
```

## Navigation Behavior

### Badge States

Navigation items display different badge states:

- **Core** (default) - Essential platform features
- **Active** (default) - Feature is enabled and functional
- **Limited** (secondary) - Basic functionality available
- **Disabled** (outline) - Feature is not enabled

### Responsive Design

- **Desktop**: Full navigation with icons, titles, descriptions, and badges
- **Mobile**: Optimized for touch navigation (shadcn/ui handles this)
- **Dark Mode**: Automatic support via Tailwind CSS dark mode

### Hover Effects

- Smooth transition on hover
- Slight translation effect (`hover:translate-x-1`)
- Background color change

## Best Practices

### Adding New Dashboard Pages

1. Create the page component in `src/pages/YourDashboard.tsx`
2. Use shadcn/ui components for consistency
3. Register the page in `payload.config.ts`
4. Add navigation entry in `AdminNavigation.tsx`
5. Link to feature flags if applicable

Example:

```typescript
// 1. Create page
export default function YourDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1>Your Dashboard</h1>
      {/* Dashboard content */}
    </div>
  )
}

// 2. Register in payload.config.ts
pages: [
  {
    slug: 'your-dashboard',
    label: '🎯 Your Dashboard',
    Component: () => import('./pages/YourDashboard'),
  },
]

// 3. Add to AdminNavigation.tsx
{
  title: 'Your Dashboard',
  description: 'Brief description',
  icon: <YourIcon className="h-5 w-5" />,
  href: '/admin/your-dashboard',
  enabled: true,
}
```

### Using Feature Flags

Always check feature flags before showing navigation items:

```typescript
{
  title: 'Feature Name',
  enabled: features.category.featureName,
  badge: features.category.featureName ? 'Active' : 'Disabled',
  badgeVariant: features.category.featureName ? 'default' : 'outline',
}
```

### Maintaining Consistency

- Use Lucide React icons for all navigation items
- Follow the same card layout pattern
- Use shadcn/ui components throughout
- Maintain responsive design principles
- Test in both light and dark modes

## API Integration

Dashboard pages are designed to fetch real-time data from API endpoints:

```typescript
const fetchData = async () => {
  try {
    const response = await fetch('/api/admin/your-endpoint')
    const data = await response.json()
    setData(data)
  } catch (error) {
    console.error('Failed to fetch:', error)
  }
}
```

Current placeholder endpoints (to be implemented):
- `/api/admin/users/stats` - User statistics
- `/api/admin/users/recent` - Recent users
- `/api/metrics/user-management` - User management data
- `/api/compliance/kyc` - KYC applications
- `/api/payments/transactions` - Transaction data

## Dependencies

### Required Packages

```json
{
  "clsx": "^latest",
  "tailwind-merge": "^latest",
  "class-variance-authority": "^latest",
  "lucide-react": "^latest",
  "@payloadcms/ui": "3.60.0"
}
```

### shadcn/ui Components Installed

- `card` - Container components
- `button` - Interactive buttons
- `badge` - Status indicators
- `tabs` - Tabbed interfaces
- `separator` - Visual dividers
- `scroll-area` - Scrollable containers

## Troubleshooting

### Navigation Not Showing

1. Check feature flags in `.env`:
   ```
   FEATURES_COMPLIANCE_KYC_VERIFICATION=true
   ```

2. Verify component import in `payload.config.ts`:
   ```typescript
   import AdminNavigation from './components/AdminNavigation'
   ```

3. Ensure `beforeNavLinks` is properly configured

### Dashboard Pages Not Loading

1. Check the page route matches the slug in `payload.config.ts`
2. Verify the component export is default export
3. Check browser console for import errors

### Styling Issues

1. Ensure Tailwind CSS is properly configured
2. Check `tailwind.config.cjs` includes all content paths
3. Verify `src/app/(frontend)/styles.css` is imported
4. Clear Next.js cache: `rm -rf .next`

## Future Enhancements

Planned improvements for the navigation system:

1. **Search functionality** - Global search across all sections
2. **Recent activities** - Quick access to recently viewed items
3. **Keyboard shortcuts** - Quick navigation via keyboard
4. **Customizable layout** - User-configurable dashboard arrangement
5. **Notifications** - Real-time alerts in navigation
6. **Mobile app** - Native mobile navigation experience

## Support

For questions or issues with the navigation system:
1. Check this documentation
2. Review feature flags configuration
3. Check PayloadCMS documentation: https://payloadcms.com/docs
4. Review shadcn/ui docs: https://ui.shadcn.com
