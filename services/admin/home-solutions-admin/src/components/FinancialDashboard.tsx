'use client'
import React, { useEffect, useState, useMemo, useCallback } from 'react'

interface FinancialMetrics {
  totalRevenue: number
  monthlyRevenue: number
  dailyRevenue: number
  transactionCount: number
  successRate: number
  averageTransactionValue: number
  totalUsers: number
  activeUsers: number
  queueSize: number
  eligiblePayouts: number
  pendingKyc: number
  criticalAlerts: number
  recentTransactions: Array<{
    id: string
    amount: number
    status: string
    user_email: string
    created_at: string
  }>
  paymentTrends: Array<{
    date: string
    amount: number
    count: number
  }>
}

// This is a Payload CMS beforeDashboard component
const FinancialDashboardComponent: React.FC = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/metrics/financial-dashboard')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch financial metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchMetrics])

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
        <div>Loading financial metrics...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div style={{ 
        background: '#0f0f0f', 
        color: '#ffffff', 
        padding: '1rem',
        margin: '0 0 2rem 0',
        border: '1px solid #262626',
        borderRadius: '4px'
      }}>
        <div>Failed to load financial metrics</div>
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
        .dashboard-header {
          margin-bottom: 1rem;
          border-bottom: 1px solid #262626;
          padding-bottom: 0.75rem;
        }

        .dashboard-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #ffffff;
        }

        .dashboard-subtitle {
          font-size: 0.75rem;
          color: #a3a3a3;
          margin: 0.25rem 0 0 0;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .metric-card {
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 4px;
          padding: 1rem;
          transition: border-color 0.2s ease;
        }

        .metric-card:hover {
          border-color: #404040;
        }

        .metric-label {
          font-size: 0.7rem;
          color: #a3a3a3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.125rem;
        }

        .metric-change {
          font-size: 0.7rem;
          color: #a3a3a3;
        }

        .data-tables {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 0;
        }

        .data-table {
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 4px;
          overflow: hidden;
        }

        .table-header {
          background: #262626;
          padding: 0.75rem;
          border-bottom: 1px solid #333333;
        }

        .table-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .table-content {
          max-height: 200px;
          overflow-y: auto;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #262626;
          font-size: 0.75rem;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .table-cell {
          color: #ffffff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .table-cell.secondary {
          color: #a3a3a3;
        }

        .table-cell.amount {
          font-weight: 600;
          text-align: right;
        }

        .table-cell.status {
          text-align: right;
        }

        .status-badge {
          padding: 0.125rem 0.375rem;
          border-radius: 2px;
          font-size: 0.625rem;
          font-weight: 500;
        }

        .status-succeeded {
          background: #22c55e;
          color: #000000;
        }

        .status-failed {
          background: #ef4444;
          color: #ffffff;
        }

        .status-pending {
          background: #f59e0b;
          color: #000000;
        }

        .chart-container {
          background: #1a1a1a;
          border: 1px solid #333333;
          border-radius: 4px;
          padding: 0.75rem;
        }

        .chart-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .trend-chart {
          display: flex;
          align-items: end;
          height: 80px;
          gap: 2px;
          margin-top: 0.5rem;
        }

        .trend-bar {
          flex: 1;
          background: #404040;
          border-radius: 2px 2px 0 0;
          min-height: 4px;
          transition: background-color 0.2s ease;
        }

        .trend-bar:hover {
          background: #525252;
        }

        @media (max-width: 768px) {
          .data-tables {
            grid-template-columns: 1fr;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dashboard-header">
        <h1 className="dashboard-title">Financial Operations Dashboard</h1>
        <p className="dashboard-subtitle">Real-time financial metrics and transaction monitoring</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">${(metrics.totalRevenue / 1000).toFixed(0)}K</div>
          <div className="metric-change">Monthly: ${(metrics.monthlyRevenue / 1000).toFixed(0)}K</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Transaction Success Rate</div>
          <div className="metric-value">{metrics.successRate.toFixed(1)}%</div>
          <div className="metric-change">{metrics.transactionCount} total transactions</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Average Transaction Value</div>
          <div className="metric-value">${metrics.averageTransactionValue.toFixed(0)}</div>
          <div className="metric-change">Daily: ${(metrics.dailyRevenue / 1000).toFixed(1)}K</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Active Users</div>
          <div className="metric-value">{metrics.activeUsers.toLocaleString()}</div>
          <div className="metric-change">{metrics.totalUsers.toLocaleString()} total users</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Queue Status</div>
          <div className="metric-value">{metrics.queueSize}</div>
          <div className="metric-change">{metrics.eligiblePayouts} eligible for payout</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Compliance Status</div>
          <div className="metric-value">{metrics.pendingKyc}</div>
          <div className="metric-change">KYC verifications pending</div>
        </div>
      </div>

      <div className="data-tables">
        <div className="data-table">
          <div className="table-header">
            <h3 className="table-title">Recent Transactions</h3>
          </div>
          <div className="table-content">
            {metrics.recentTransactions.map((tx, index) => (
              <div key={index} className="table-row">
                <div className="table-cell">{tx.user_email}</div>
                <div className="table-cell amount">${tx.amount.toFixed(2)}</div>
                <div className="table-cell status">
                  <span className={`status-badge status-${tx.status}`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Payment Volume Trend (7 Days)</h3>
          <div className="trend-chart">
            {metrics.paymentTrends.map((trend, index) => {
              const maxAmount = Math.max(...metrics.paymentTrends.map(t => t.amount))
              const height = maxAmount > 0 ? (trend.amount / maxAmount) * 100 : 10
              return (
                <div 
                  key={index}
                  className="trend-bar" 
                  style={{ height: `${height}%` }}
                  title={`${trend.date}: $${(trend.amount / 1000).toFixed(1)}K`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {metrics.criticalAlerts > 0 && (
        <div className="data-table">
          <div className="table-header">
            <h3 className="table-title">System Alerts ({metrics.criticalAlerts} Critical)</h3>
          </div>
          <div className="table-content">
            <div className="table-row">
              <div className="table-cell">High payment failure rate detected</div>
              <div className="table-cell secondary">2 minutes ago</div>
              <div className="table-cell status">
                <span className="status-badge status-failed">Critical</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const FinancialDashboard = React.memo(FinancialDashboardComponent)
export default FinancialDashboard