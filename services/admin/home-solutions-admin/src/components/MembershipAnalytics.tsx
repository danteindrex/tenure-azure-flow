'use client'
import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface MembershipAnalyticsData {
  newMembershipsOverTime: {
    daily: Array<{ date: string; count: number }>
    total: number
    growth: number
  }
  membershipTypeDistribution: Array<{ type: string; count: number }>
  activeVsInactive: {
    active: number
    inactive: number
    total: number
  }
  renewalRates: {
    rate: number
    totalRenewals: number
    eligibleMemberships: number
    averageRenewalCount: number
  }
}

const MembershipAnalytics: React.FC = () => {
  const [data, setData] = useState<MembershipAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/metrics/membership-analytics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="analytics-error">
        <p>Failed to load analytics data</p>
        <button onClick={fetchAnalytics} className="retry-button">
          Retry
        </button>
      </div>
    )
  }

  // Chart configurations
  const dailyNewMembershipsConfig = {
    labels: data.newMembershipsOverTime.daily.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'New Memberships',
        data: data.newMembershipsOverTime.daily.map(d => d.count),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  }

  const membershipTypeConfig = {
    labels: data.membershipTypeDistribution.map(d => d.type),
    datasets: [
      {
        label: 'Memberships',
        data: data.membershipTypeDistribution.map(d => d.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }
    ]
  }

  const activeInactiveConfig = {
    labels: ['Active', 'Inactive'],
    datasets: [
      {
        label: 'Membership Status',
        data: [data.activeVsInactive.active, data.activeVsInactive.inactive],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }
    ]
  }

  // Calculate trend line data for membership growth
  const trendData = {
    labels: data.newMembershipsOverTime.daily.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'New Memberships Trend',
        data: data.newMembershipsOverTime.daily.map(d => d.count),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ]
  }

  return (
    <div className="membership-analytics-container">
      <style jsx>{`
        .membership-analytics-container {
          background: var(--theme-elevation-50, #0f0f0f);
          padding: 24px;
          border-radius: 8px;
          margin: 24px 0;
          border: 1px solid var(--theme-elevation-150, #262626);
        }

        .analytics-header {
          margin-bottom: 24px;
          border-bottom: 2px solid var(--theme-elevation-150, #262626);
          padding-bottom: 16px;
        }

        .analytics-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--theme-text, #ffffff);
          margin: 0 0 8px 0;
        }

        .analytics-subtitle {
          font-size: 14px;
          color: var(--theme-text-dim, #a3a3a3);
          margin: 0;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }

        .chart-card {
          background: var(--theme-elevation-100, #1a1a1a);
          border: 1px solid var(--theme-elevation-200, #333333);
          border-radius: 8px;
          padding: 20px;
          position: relative;
        }

        .chart-header {
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--theme-text, #ffffff);
          margin: 0;
        }

        .chart-metric {
          font-size: 12px;
          color: var(--theme-text-dim, #a3a3a3);
          font-weight: 500;
        }

        .chart-container {
          position: relative;
          height: 300px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .kpi-card {
          background: var(--theme-elevation-100, #1a1a1a);
          color: var(--theme-text, #ffffff);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid var(--theme-elevation-200, #333333);
        }

        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          color: var(--theme-text, #ffffff);
        }

        .kpi-label {
          font-size: 14px;
          color: var(--theme-text-dim, #a3a3a3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-card.primary {
          background: var(--theme-elevation-100, #1a1a1a);
          border: 1px solid var(--theme-elevation-200, #333333);
        }

        .kpi-card.success {
          background: var(--theme-elevation-100, #1a1a1a);
          border: 1px solid var(--theme-elevation-200, #333333);
        }

        .kpi-card.warning {
          background: var(--theme-elevation-100, #1a1a1a);
          border: 1px solid var(--theme-elevation-200, #333333);
        }

        .kpi-card.info {
          background: var(--theme-elevation-100, #1a1a1a);
          border: 1px solid var(--theme-elevation-200, #333333);
        }

        .analytics-loading, .analytics-error {
          text-align: center;
          padding: 60px 20px;
          color: var(--theme-text-dim, #a3a3a3);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--theme-elevation-200, #333333);
          border-top: 4px solid var(--theme-info, #3b82f6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-button {
          padding: 8px 16px;
          background: var(--theme-info, #3b82f6);
          color: var(--theme-text, #ffffff);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 16px;
        }

        .retry-button:hover {
          background: var(--theme-elevation-400, #525252);
        }

        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }

          .chart-container {
            height: 250px;
          }

          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="analytics-header">
        <h2 className="analytics-title">📊 Membership Analytics</h2>
        <p className="analytics-subtitle">Comprehensive insights into membership metrics, growth trends, and performance indicators</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card primary">
          <div className="kpi-value">{data.newMembershipsOverTime.total}</div>
          <div className="kpi-label">New Memberships (30 Days)</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-value">{data.activeVsInactive.active}</div>
          <div className="kpi-label">Active Memberships</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-value">{data.renewalRates.rate.toFixed(1)}%</div>
          <div className="kpi-label">Renewal Rate</div>
        </div>
        <div className="kpi-card info">
          <div className="kpi-value">{data.renewalRates.totalRenewals}</div>
          <div className="kpi-label">Total Renewals</div>
        </div>
      </div>

      <div className="charts-grid">
        {/* New Memberships Over Time - Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">📈 New Memberships Over Time</h3>
            <div className="chart-metric">
              Growth: {data.newMembershipsOverTime.growth.toFixed(1)}%
            </div>
          </div>
          <div className="chart-container">
            <Bar
              data={dailyNewMembershipsConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                      size: 14,
                    },
                    bodyFont: {
                      size: 12,
                    },
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Membership Type Distribution - Doughnut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">🎯 Membership Type Distribution</h3>
            <div className="chart-metric">
              Total Types: {data.membershipTypeDistribution.length}
            </div>
          </div>
          <div className="chart-container">
            <Doughnut
              data={membershipTypeConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      padding: 15,
                      font: {
                        size: 12,
                      },
                    },
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                  }
                },
              }}
            />
          </div>
        </div>

        {/* Active vs Inactive - Doughnut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">✅ Active vs Inactive Status</h3>
            <div className="chart-metric">
              Total: {data.activeVsInactive.total}
            </div>
          </div>
          <div className="chart-container">
            <Doughnut
              data={activeInactiveConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      padding: 15,
                      font: {
                        size: 12,
                      },
                    },
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                  }
                },
              }}
            />
          </div>
        </div>

        {/* Membership Growth Trend - Line Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">📊 Membership Growth Trend</h3>
            <div className="chart-metric">
              Last 30 Days
            </div>
          </div>
          <div className="chart-container">
            <Line
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MembershipAnalytics

