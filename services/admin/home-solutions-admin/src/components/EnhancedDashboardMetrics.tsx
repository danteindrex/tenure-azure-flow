'use client'
import React, { useEffect, useState } from 'react'
import { features } from '../config/features'

interface DashboardStats {
  users: {
    total: number
    active: number
    growth: string
    newToday: number
  }
  payments: {
    totalRevenue: number
    monthlyRevenue: number
    growth: string
    successRate: number
  }
  queue: {
    total: number
    eligibleForPayout: number
    nextPayoutAmount: number
  }
  compliance: {
    kycPending: number
    kycVerified: number
    transactionsUnderReview: number
  }
  alerts: {
    critical: number
    warnings: number
    unresolved: number
  }
}

export const EnhancedDashboardMetrics: React.FC = () => {
  // Prevent server-side rendering issues
  if (typeof window === 'undefined') {
    return null
  }

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch real dashboard statistics
    const fetchStats = async () => {
      try {
        // In production, this would call your API
        // For now, using mock data structure
        const mockStats: DashboardStats = {
          users: {
            total: 2847,
            active: 2103,
            growth: '+12.5',
            newToday: 23,
          },
          payments: {
            totalRevenue: 456780,
            monthlyRevenue: 45600,
            growth: '+15.3',
            successRate: 98.5,
          },
          queue: {
            total: 156,
            eligibleForPayout: 12,
            nextPayoutAmount: 100000,
          },
          compliance: {
            kycPending: 45,
            kycVerified: 2802,
            transactionsUnderReview: 8,
          },
          alerts: {
            critical: 2,
            warnings: 7,
            unresolved: 15,
          },
        }

        setStats(mockStats)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (loading || !stats) return

    // Inject enhanced metrics into the dashboard
    const injectMetrics = () => {
      const dashboard = document.querySelector('.dashboard')
      if (dashboard && !document.getElementById('enhanced-dashboard-metrics')) {
        const metricsHTML = `
          <style>
            #enhanced-dashboard-metrics {
              margin-bottom: 2rem;
            }

            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1.5rem;
              margin-bottom: 2rem;
            }

            .metric-card {
              background: #0f0f0f;
              border: 1px solid #262626;
              border-radius: 8px;
              padding: 1.5rem;
              color: #ffffff;
              transition: all 0.2s ease;
            }

            .metric-card:hover {
              transform: translateY(-2px);
              border-color: #404040;
              background: #1a1a1a;
            }

            .metric-card.success {
              border-left: 3px solid #22c55e;
            }

            .metric-card.warning {
              border-left: 3px solid #f59e0b;
            }

            .metric-card.danger {
              border-left: 3px solid #ef4444;
            }

            .metric-card.info {
              border-left: 3px solid #3b82f6;
            }

            .metric-title {
              font-size: 0.875rem;
              opacity: 0.9;
              margin-bottom: 0.5rem;
              font-weight: 500;
            }

            .metric-value {
              font-size: 2rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
            }

            .metric-subtitle {
              font-size: 0.75rem;
              opacity: 0.8;
            }

            .metric-growth {
              font-size: 0.75rem;
              font-weight: 600;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              display: inline-block;
              margin-top: 0.5rem;
            }

            .metric-growth.positive {
              background: rgba(16, 185, 129, 0.2);
            }

            .metric-growth.negative {
              background: rgba(239, 68, 68, 0.2);
            }

            .alerts-section {
              background: #0f0f0f;
              border: 1px solid #262626;
              border-radius: 8px;
              padding: 1.5rem;
              margin-bottom: 2rem;
            }

            .alerts-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1rem;
            }

            .alert-item {
              display: flex;
              align-items: center;
              padding: 0.75rem;
              border-left: 3px solid;
              margin-bottom: 0.5rem;
              border-radius: 4px;
              background: #f9fafb;
            }

            .alert-item.critical {
              border-color: #ef4444;
              background: #fef2f2;
            }

            .alert-item.warning {
              border-color: #f59e0b;
              background: #fffbeb;
            }

            .feature-flag-notice {
              background: #1a1a1a;
              border: 1px solid #404040;
              border-radius: 8px;
              padding: 1rem;
              margin-bottom: 1.5rem;
              color: #a3a3a3;
              font-size: 0.875rem;
            }
          </style>

          <div id="enhanced-dashboard-metrics">
            ${Object.keys(features).some((category) =>
          Object.values(features[category as keyof typeof features]).some(
            (value) => value === false
          )
        )
            ? `
            <div class="feature-flag-notice">
              ℹ️ <strong>Development Mode:</strong> Some features are disabled via feature flags.
              Check <code>src/config/features.ts</code> to enable/disable features.
            </div>
            `
            : ''
          }

            <div class="metrics-grid">
              <!-- Users Card -->
              <div class="metric-card success">
                <div class="metric-title">👥 Total Users</div>
                <div class="metric-value">${stats.users.total.toLocaleString()}</div>
                <div class="metric-subtitle">${stats.users.active.toLocaleString()} active • ${stats.users.newToday} new today</div>
                <div class="metric-growth positive">${stats.users.growth}% this month</div>
              </div>

              <!-- Revenue Card -->
              <div class="metric-card success">
                <div class="metric-title">💰 Total Revenue</div>
                <div class="metric-value">$${stats.payments.totalRevenue.toLocaleString()}</div>
                <div class="metric-subtitle">$${stats.payments.monthlyRevenue.toLocaleString()} this month</div>
                <div class="metric-growth positive">${stats.payments.growth}% growth</div>
              </div>

              <!-- Queue Card -->
              ${features.queue.queueAnalytics
            ? `
              <div class="metric-card info">
                <div class="metric-title">🎯 Queue Status</div>
                <div class="metric-value">${stats.queue.total}</div>
                <div class="metric-subtitle">${stats.queue.eligibleForPayout} eligible for payout</div>
                <div class="metric-growth">${stats.queue.eligibleForPayout} × $${(stats.queue.nextPayoutAmount / 1000).toFixed(0)}K</div>
              </div>
              `
            : ''
          }

              <!-- Compliance Card -->
              ${features.compliance.kycVerification
            ? `
              <div class="metric-card ${stats.compliance.kycPending > 50 ? 'warning' : 'info'}">
                <div class="metric-title">✅ Compliance Status</div>
                <div class="metric-value">${stats.compliance.kycVerified}</div>
                <div class="metric-subtitle">${stats.compliance.kycPending} KYC pending review</div>
              </div>
              `
            : ''
          }

              <!-- Alerts Card -->
              ${features.alerts.adminAlerts
            ? `
              <div class="metric-card ${stats.alerts.critical > 0 ? 'danger' : stats.alerts.warnings > 0 ? 'warning' : 'success'}">
                <div class="metric-title">🚨 System Alerts</div>
                <div class="metric-value">${stats.alerts.unresolved}</div>
                <div class="metric-subtitle">${stats.alerts.critical} critical • ${stats.alerts.warnings} warnings</div>
              </div>
              `
            : ''
          }

              <!-- Payment Success Rate -->
              <div class="metric-card ${stats.payments.successRate >= 95 ? 'success' : 'warning'}">
                <div class="metric-title">📊 Payment Success</div>
                <div class="metric-value">${stats.payments.successRate}%</div>
                <div class="metric-subtitle">Success rate</div>
              </div>
            </div>

            ${features.alerts.adminAlerts && stats.alerts.unresolved > 0
            ? `
            <div class="alerts-section">
              <div class="alerts-header">
                <h3>Recent Alerts</h3>
                <a href="/admin/collections/admin_alerts" style="color: #3b82f6; text-decoration: none; font-size: 0.875rem;">View All →</a>
              </div>

              ${stats.alerts.critical > 0
              ? `
              <div class="alert-item critical">
                <strong>⚠️ Critical:</strong>&nbsp; ${stats.alerts.critical} critical alerts require immediate attention
              </div>
              `
              : ''
            }

              ${stats.alerts.warnings > 0
              ? `
              <div class="alert-item warning">
                <strong>⚡ Warning:</strong>&nbsp; ${stats.alerts.warnings} warnings need review
              </div>
              `
              : ''
            }
            </div>
            `
            : ''
          }
          </div>
        `

        // Insert metrics ABOVE the existing collections grid
        const firstChild = dashboard.firstElementChild
        if (firstChild) {
          firstChild.insertAdjacentHTML('beforebegin', metricsHTML)
        } else {
          dashboard.insertAdjacentHTML('afterbegin', metricsHTML)
        }
      }
    }

    // Run after a short delay to ensure DOM is ready
    setTimeout(injectMetrics, 500)

    // Also run when navigation changes
    const observer = new MutationObserver(() => {
      if (!document.getElementById('enhanced-dashboard-metrics')) {
        setTimeout(injectMetrics, 100)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [loading, stats])

  return null // This component doesn't render anything visible
}

export default EnhancedDashboardMetrics
