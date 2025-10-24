'use client'
import React, { useEffect, useState } from 'react'

interface AnalyticsData {
  userSignups: {
    daily: Array<{ date: string; count: number }>
    monthly: Array<{ month: string; count: number }>
    total: number
    growth: number
  }
  payouts: {
    daily: Array<{ date: string; amount: number; count: number }>
    monthly: Array<{ month: string; amount: number; count: number }>
    totalAmount: number
    totalCount: number
    averageAmount: number
  }
  tenurePayments: {
    daily: Array<{ date: string; amount: number; count: number }>
    monthly: Array<{ month: string; amount: number; count: number }>
    successRate: number
    totalRevenue: number
  }
  queueAnalytics: {
    positionDistribution: Array<{ range: string; count: number }>
    eligibilityTrend: Array<{ date: string; eligible: number; total: number }>
    averageWaitTime: number
  }
  userActivity: {
    activeUsers: Array<{ date: string; count: number }>
    retentionRate: number
    churnRate: number
  }
}

export const AnalyticsGraphs: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/metrics/analytics-graphs')
        if (response.ok) {
          const analyticsData = await response.json()
          setData(analyticsData)
        }
      } catch (error) {
        console.error('Failed to fetch analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div style={{ 
        background: '#0f0f0f', 
        color: '#ffffff', 
        padding: '1rem',
        margin: '0 0 2rem 0',
        border: '1px solid #262626',
        borderRadius: '4px'
      }}>
        <div>Loading analytics data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ 
        background: '#0f0f0f', 
        color: '#ffffff', 
        padding: '1rem',
        margin: '0 0 2rem 0',
        border: '1px solid #262626',
        borderRadius: '4px'
      }}>
        <div>Failed to load analytics data</div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#0f0f0f',
      color: '#ffffff',
      padding: '1.5rem',
      margin: '0 0 2rem 0',
      border: '1px solid #262626',
      borderRadius: '4px'
    }}>
      <style jsx>{`
        .analytics-header {
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #262626;
          padding-bottom: 0.75rem;
        }

        .analytics-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #ffffff;
        }

        .analytics-subtitle {
          font-size: 0.75rem;
          color: #a3a3a3;
          margin: 0.25rem 0 0 0;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .chart-card {
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 4px;
          padding: 1rem;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .chart-metric {
          font-size: 0.75rem;
          color: #a3a3a3;
        }

        .chart-container {
          position: relative;
          height: 200px;
        }

        .bar-chart {
          display: flex;
          align-items: end;
          height: 100%;
          gap: 3px;
          padding: 0.5rem 0;
        }

        .bar {
          flex: 1;
          background: #404040;
          border-radius: 2px 2px 0 0;
          min-height: 4px;
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
        }

        .bar:hover {
          background: #525252;
        }

        .bar.primary {
          background: #3b82f6;
        }

        .bar.primary:hover {
          background: #2563eb;
        }

        .bar.success {
          background: #22c55e;
        }

        .bar.success:hover {
          background: #16a34a;
        }

        .bar.warning {
          background: #f59e0b;
        }

        .bar.warning:hover {
          background: #d97706;
        }

        .line-chart {
          position: relative;
          height: 100%;
          padding: 1rem;
        }

        .line-chart svg {
          width: 100%;
          height: 100%;
        }

        .line-chart .line {
          fill: none;
          stroke: #3b82f6;
          stroke-width: 2;
        }

        .line-chart .area {
          fill: rgba(59, 130, 246, 0.1);
        }

        .line-chart .dot {
          fill: #3b82f6;
          r: 3;
        }

        .line-chart .dot:hover {
          r: 5;
          fill: #2563eb;
        }

        .pie-chart {
          display: flex;
          align-items: center;
          gap: 1rem;
          height: 100%;
        }

        .pie-svg {
          width: 120px;
          height: 120px;
          flex-shrink: 0;
        }

        .pie-legend {
          flex: 1;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
        }

        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }

        .legend-label {
          color: #ffffff;
        }

        .legend-value {
          margin-left: auto;
          color: #a3a3a3;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .kpi-item {
          text-align: center;
          padding: 0.75rem;
          background: #262626;
          border-radius: 4px;
        }

        .kpi-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.25rem;
        }

        .kpi-label {
          font-size: 0.625rem;
          color: #a3a3a3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="analytics-header">
        <h2 className="analytics-title">Business Analytics & Insights</h2>
        <p className="analytics-subtitle">Real-time data visualization and trends analysis</p>
      </div>

      <div className="charts-grid">
        {/* User Signups Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">User Signups (30 Days)</h3>
            <div className="chart-metric">
              Total: {data.userSignups.total} | Growth: {data.userSignups.growth.toFixed(1)}%
            </div>
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {data.userSignups.daily.slice(-30).map((day, index) => {
                const maxCount = Math.max(...data.userSignups.daily.map(d => d.count))
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 5
                return (
                  <div 
                    key={index}
                    className="bar primary" 
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${day.count} signups`}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Payout Amounts Line Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Payout Trends</h3>
            <div className="chart-metric">
              Total: ${(data.payouts.totalAmount / 1000).toFixed(0)}K | Avg: ${data.payouts.averageAmount.toFixed(0)}
            </div>
          </div>
          <div className="chart-container">
            <div className="line-chart">
              <svg viewBox="0 0 300 150">
                {/* Generate line path */}
                {(() => {
                  const points = data.payouts.daily.slice(-30)
                  const maxAmount = Math.max(...points.map(p => p.amount))
                  const pathData = points.map((point, index) => {
                    const x = (index / (points.length - 1)) * 280 + 10
                    const y = maxAmount > 0 ? 140 - ((point.amount / maxAmount) * 120) : 70
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')
                  
                  return (
                    <>
                      <path className="line" d={pathData} />
                      {points.map((point, index) => {
                        const x = (index / (points.length - 1)) * 280 + 10
                        const y = maxAmount > 0 ? 140 - ((point.amount / maxAmount) * 120) : 70
                        return (
                          <circle 
                            key={index}
                            className="dot" 
                            cx={x} 
                            cy={y}
                          >
                            <title>${point.amount.toFixed(0)} on {point.date}</title>
                          </circle>
                        )
                      })}
                    </>
                  )
                })()}
              </svg>
            </div>
          </div>
        </div>

        {/* Tenure Payments Success Rate */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Payment Success Rate</h3>
            <div className="chart-metric">
              Success: {data.tenurePayments.successRate.toFixed(1)}% | Revenue: ${(data.tenurePayments.totalRevenue / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="chart-container">
            <div className="pie-chart">
              <svg className="pie-svg" viewBox="0 0 100 100">
                {(() => {
                  const successRate = data.tenurePayments.successRate
                  const failureRate = 100 - successRate
                  
                  const successAngle = (successRate / 100) * 360
                  const failureAngle = (failureRate / 100) * 360
                  
                  const successPath = `M 50 50 L 50 10 A 40 40 0 ${successAngle > 180 ? 1 : 0} 1 ${50 + 40 * Math.sin((successAngle * Math.PI) / 180)} ${50 - 40 * Math.cos((successAngle * Math.PI) / 180)} Z`
                  const failurePath = `M 50 50 L ${50 + 40 * Math.sin((successAngle * Math.PI) / 180)} ${50 - 40 * Math.cos((successAngle * Math.PI) / 180)} A 40 40 0 ${failureAngle > 180 ? 1 : 0} 1 50 10 Z`
                  
                  return (
                    <>
                      <path d={successPath} fill="#22c55e" />
                      <path d={failurePath} fill="#ef4444" />
                    </>
                  )
                })()}
              </svg>
              <div className="pie-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#22c55e' }}></div>
                  <span className="legend-label">Success</span>
                  <span className="legend-value">{data.tenurePayments.successRate.toFixed(1)}%</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#ef4444' }}></div>
                  <span className="legend-label">Failed</span>
                  <span className="legend-value">{(100 - data.tenurePayments.successRate).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Position Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Queue Distribution</h3>
            <div className="chart-metric">
              Avg Wait: {data.queueAnalytics.averageWaitTime} days
            </div>
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {data.queueAnalytics.positionDistribution.map((range, index) => {
                const maxCount = Math.max(...data.queueAnalytics.positionDistribution.map(r => r.count))
                const height = maxCount > 0 ? (range.count / maxCount) * 100 : 5
                const colors = ['success', 'warning', 'primary']
                return (
                  <div 
                    key={index}
                    className={`bar ${colors[index % colors.length]}`}
                    style={{ height: `${height}%` }}
                    title={`${range.range}: ${range.count} users`}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* User Activity Metrics */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">User Activity</h3>
            <div className="chart-metric">
              Retention: {data.userActivity.retentionRate.toFixed(1)}% | Churn: {data.userActivity.churnRate.toFixed(1)}%
            </div>
          </div>
          <div className="chart-container">
            <div className="kpi-grid">
              <div className="kpi-item">
                <div className="kpi-value" style={{ color: '#22c55e' }}>
                  {data.userActivity.retentionRate.toFixed(1)}%
                </div>
                <div className="kpi-label">Retention</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-value" style={{ color: '#ef4444' }}>
                  {data.userActivity.churnRate.toFixed(1)}%
                </div>
                <div className="kpi-label">Churn Rate</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-value" style={{ color: '#3b82f6' }}>
                  {data.userSignups.total}
                </div>
                <div className="kpi-label">Total Users</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-value" style={{ color: '#f59e0b' }}>
                  {data.queueAnalytics.averageWaitTime}
                </div>
                <div className="kpi-label">Avg Wait (Days)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Monthly Revenue Trend</h3>
            <div className="chart-metric">
              Last 12 Months
            </div>
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {data.tenurePayments.monthly.slice(-12).map((month, index) => {
                const maxAmount = Math.max(...data.tenurePayments.monthly.map(m => m.amount))
                const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 5
                return (
                  <div 
                    key={index}
                    className="bar success" 
                    style={{ height: `${height}%` }}
                    title={`${month.month}: $${(month.amount / 1000).toFixed(1)}K`}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsGraphs