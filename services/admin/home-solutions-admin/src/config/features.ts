/**
 * Feature Flags Configuration for Admin Dashboard
 *
 * Control which features are enabled/disabled for development and production.
 * Set environment variables to override defaults.
 */

export interface FeatureFlags {
  // CORE FEATURES (Always enabled)
  core: {
    users: boolean;
    payments: boolean;
    subscriptions: boolean;
    queue: boolean;
  };

  // COMPLIANCE FEATURES (Can be toggled)
  compliance: {
    kycVerification: boolean;
    amlMonitoring: boolean;
    complianceDashboard: boolean;
    regulatoryReporting: boolean;
  };

  // AUDIT & SECURITY (Recommended to keep enabled)
  security: {
    enhancedAuditLogs: boolean;
    securityMonitoring: boolean;
    rbacDashboard: boolean;
    sessionTracking: boolean;
  };

  // FINANCIAL FEATURES
  financial: {
    advancedAnalytics: boolean;
    paymentReconciliation: boolean;
    cashFlowAnalysis: boolean;
    revenueForecasting: boolean;
    financialReports: boolean;
  };

  // PAYMENT PROCESSING
  payments: {
    disputeManagement: boolean;
    chargebackTracking: boolean;
    paymentProviderManagement: boolean;
    refundTracking: boolean;
  };

  // QUEUE & PAYOUT MANAGEMENT
  queue: {
    queueAnalytics: boolean;
    payoutWorkflow: boolean;
    tenureVerification: boolean;
    queueManipulationDetection: boolean;
    payoutScheduling: boolean;
  };

  // TAX COMPLIANCE
  tax: {
    form1099Generation: boolean;
    w9Collection: boolean;
    taxWithholding: boolean;
    irsReporting: boolean;
  };

  // COMMUNICATION
  communication: {
    inAppMessaging: boolean;
    emailTemplates: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };

  // ALERTING & NOTIFICATIONS
  alerts: {
    adminAlerts: boolean;
    systemHealthMonitoring: boolean;
    escalationWorkflows: boolean;
    multiChannelNotifications: boolean;
  };

  // REPORTING & EXPORT
  reporting: {
    customReportBuilder: boolean;
    scheduledReports: boolean;
    bulkDataExport: boolean;
    advancedVisualizations: boolean;
  };

  // USER MANAGEMENT
  userManagement: {
    userSegmentation: boolean;
    cohortAnalysis: boolean;
    supportTickets: boolean;
    engagementScoring: boolean;
  };

  // EXPERIMENTAL/AI (Disabled - handled elsewhere)
  experimental: {
    fraudDetectionAI: boolean;  // Always false - handled elsewhere
    predictiveAnalytics: boolean;  // Always false - handled elsewhere
    churnPrediction: boolean;  // Always false - handled elsewhere
  };
}

/**
 * Default Feature Flags for Development
 */
const DEVELOPMENT_FLAGS: FeatureFlags = {
  core: {
    users: true,
    payments: true,
    subscriptions: true,
    queue: true,
  },
  compliance: {
    kycVerification: true,
    amlMonitoring: false,  // Can be distracting in dev
    complianceDashboard: true,
    regulatoryReporting: false,  // Not needed in dev
  },
  security: {
    enhancedAuditLogs: true,  // Always useful
    securityMonitoring: false,  // Can be distracting
    rbacDashboard: true,
    sessionTracking: true,
  },
  financial: {
    advancedAnalytics: true,
    paymentReconciliation: true,
    cashFlowAnalysis: false,  // Can be distracting
    revenueForecasting: false,  // Can be distracting
    financialReports: true,
  },
  payments: {
    disputeManagement: true,
    chargebackTracking: true,
    paymentProviderManagement: false,  // Not needed in dev
    refundTracking: true,
  },
  queue: {
    queueAnalytics: true,
    payoutWorkflow: true,
    tenureVerification: true,
    queueManipulationDetection: true,
    payoutScheduling: true,
  },
  tax: {
    form1099Generation: true,
    w9Collection: true,
    taxWithholding: true,
    irsReporting: false,  // Not needed in dev
  },
  communication: {
    inAppMessaging: false,  // Can be distracting
    emailTemplates: true,
    smsNotifications: false,  // Can be distracting
    pushNotifications: false,  // Can be distracting
  },
  alerts: {
    adminAlerts: true,
    systemHealthMonitoring: false,  // Can be distracting
    escalationWorkflows: false,  // Can be distracting
    multiChannelNotifications: false,  // Can be distracting
  },
  reporting: {
    customReportBuilder: true,
    scheduledReports: false,  // Can be distracting
    bulkDataExport: true,
    advancedVisualizations: true,
  },
  userManagement: {
    userSegmentation: true,
    cohortAnalysis: false,  // Can be distracting
    supportTickets: false,  // Can be distracting
    engagementScoring: false,  // Can be distracting
  },
  experimental: {
    fraudDetectionAI: false,  // Handled elsewhere
    predictiveAnalytics: false,  // Handled elsewhere
    churnPrediction: false,  // Handled elsewhere
  },
};

/**
 * Production Feature Flags (All enabled except AI)
 */
const PRODUCTION_FLAGS: FeatureFlags = {
  core: {
    users: true,
    payments: true,
    subscriptions: true,
    queue: true,
  },
  compliance: {
    kycVerification: true,
    amlMonitoring: true,
    complianceDashboard: true,
    regulatoryReporting: true,
  },
  security: {
    enhancedAuditLogs: true,
    securityMonitoring: true,
    rbacDashboard: true,
    sessionTracking: true,
  },
  financial: {
    advancedAnalytics: true,
    paymentReconciliation: true,
    cashFlowAnalysis: true,
    revenueForecasting: true,
    financialReports: true,
  },
  payments: {
    disputeManagement: true,
    chargebackTracking: true,
    paymentProviderManagement: true,
    refundTracking: true,
  },
  queue: {
    queueAnalytics: true,
    payoutWorkflow: true,
    tenureVerification: true,
    queueManipulationDetection: true,
    payoutScheduling: true,
  },
  tax: {
    form1099Generation: true,
    w9Collection: true,
    taxWithholding: true,
    irsReporting: true,
  },
  communication: {
    inAppMessaging: true,
    emailTemplates: true,
    smsNotifications: true,
    pushNotifications: true,
  },
  alerts: {
    adminAlerts: true,
    systemHealthMonitoring: true,
    escalationWorkflows: true,
    multiChannelNotifications: true,
  },
  reporting: {
    customReportBuilder: true,
    scheduledReports: true,
    bulkDataExport: true,
    advancedVisualizations: true,
  },
  userManagement: {
    userSegmentation: true,
    cohortAnalysis: true,
    supportTickets: true,
    engagementScoring: true,
  },
  experimental: {
    fraudDetectionAI: false,  // Always disabled - handled elsewhere
    predictiveAnalytics: false,  // Always disabled - handled elsewhere
    churnPrediction: false,  // Always disabled - handled elsewhere
  },
};

/**
 * Get feature flags based on environment
 */
export function getFeatureFlags(): FeatureFlags {
  const env = process.env.NODE_ENV || 'development';
  const baseFlags = env === 'production' ? PRODUCTION_FLAGS : DEVELOPMENT_FLAGS;

  // Allow environment variable overrides
  // Example: FEATURE_KYC_VERIFICATION=true
  const overrides = parseFeatureFlagsFromEnv();

  return deepMerge(baseFlags, overrides);
}

/**
 * Parse feature flags from environment variables
 */
function parseFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  const overrides: any = {};

  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('FEATURE_')) {
      const featurePath = key
        .replace('FEATURE_', '')
        .toLowerCase()
        .split('_');

      if (featurePath.length === 2) {
        const [category, feature] = featurePath;
        if (!overrides[category]) overrides[category] = {};
        overrides[category][feature] = process.env[key] === 'true';
      }
    }
  });

  return overrides;
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(category: keyof FeatureFlags, feature: string): boolean {
  const flags = getFeatureFlags();
  return (flags[category] as any)?.[feature] === true;
}

/**
 * Export the feature flags instance
 */
export const features = getFeatureFlags();

/**
 * Helper to conditionally render features
 */
export function withFeature<T>(
  category: keyof FeatureFlags,
  feature: string,
  component: T,
  fallback?: T
): T | null {
  return isFeatureEnabled(category, feature) ? component : (fallback || null);
}

export default features;
