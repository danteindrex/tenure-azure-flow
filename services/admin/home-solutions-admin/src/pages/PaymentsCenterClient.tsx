'use client'

import React, { useEffect, useState } from 'react'

interface PaymentStats {
  totalRevenue: number
  totalTransactions: number
  successfulPayments: number
  failedPayments: number
  pendingPayments: number
  disputes: number
  averageTransaction: number
  revenueGrowth: number
}

interface Transaction {
  id: string
  userId: string
  userEmail: string
  amount: number
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  paymentMethod: string
  createdAt: string
}

export default function PaymentsCenterClient() {
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)

  useEffect(() => {
    fetchPaymentData()
  }, [])

  const fetchPaymentData = async () => {
    try {
      const response = await fetch('/api/metrics/payments-center')
      if (!response.ok) throw new Error('Failed to fetch payment data')

      const data = await response.json()
      setStats(data.stats)
      setTransactions(data.transactions)
    } catch (error) {
      console.error('Failed to fetch payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="payments-page">
        <style jsx>{`
          .payments-page {
            padding: 60px;
            background: #1a1a1a;
            min-height: 100vh;
            text-align: center;
            color: #a3a3a3;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #1e293b;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div className="loading-spinner"></div>
        <p>Loading payments data...</p>
      </div>
    )
  }

  return (
    <div className="payments-page">
      <style jsx>{`
        .payments-page {
          padding: 0;
          background: #1a1a1a;
          min-height: 100vh;
        }
        .page-header {
          background: #000000;
          border-bottom: 1px solid #262626;
          padding: 24px 32px;
        }
        .page-title {
          font-size: 32px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          color: #a3a3a3;
          font-size: 16px;
          margin: 0;
        }
        .stats-section {
          background: #000000;
          border-bottom: 1px solid #262626;
          padding: 24px 32px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
        }
        .stat-card {
          text-align: center;
          padding: 16px;
          border: 1px solid #333333;
          border-radius: 8px;
          background: #1a1a1a;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 14px;
          color: #a3a3a3;
          font-weight: 500;
        }
        .content-section {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 0;
          min-height: calc(100vh - 200px);
        }
        .transactions-panel {
          background: #000000;
          border-right: 1px solid #334155;
        }
        .panel-header {
          padding: 20px 24px;
          border-bottom: 1px solid #262626;
          background: #1a1a1a;
        }
        .panel-title {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }
        .transactions-list {
          max-height: calc(100vh - 300px);
          overflow-y: auto;
        }
        .txn-item {
          padding: 16px 24px;
          border-bottom: 1px solid #0f172a;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .txn-item:hover {
          background-color: #1a1a1a;
        }
        .txn-item.selected {
          background-color: #1e40af;
          border-left: 4px solid #3b82f6;
        }
        .txn-email {
          font-weight: 500;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .txn-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #a3a3a3;
        }
        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .status-completed { background: #14532d; color: #86efac; }
        .status-pending { background: #713f12; color: #fcd34d; }
        .status-failed { background: #7f1d1d; color: #fca5a5; }
        .status-refunded { background: #1e3a8a; color: #93c5fd; }
        .details-panel {
          background: #000000;
          padding: 24px;
          overflow-y: auto;
        }
        .details-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #334155;
        }
        .details-title {
          font-size: 20px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 8px 0;
        }
        .details-subtitle {
          color: #a3a3a3;
          font-size: 14px;
          margin: 0;
        }
        .detail-section {
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid #333333;
          border-radius: 8px;
          background: #1a1a1a;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 12px 0;
        }
        .detail-grid {
          display: grid;
          gap: 8px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 14px;
        }
        .detail-label {
          color: #a3a3a3;
          font-weight: 500;
        }
        .detail-value {
          color: #f1f5f9;
          font-weight: 400;
        }
        .no-selection {
          text-align: center;
          color: #a3a3a3;
          padding: 60px 20px;
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Payments Center</h1>
        <p className="page-subtitle">Transaction management and financial analytics</p>
      </div>

      {stats && (
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">${stats.totalRevenue.toFixed(2)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalTransactions}</div>
              <div className="stat-label">Transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.successfulPayments}</div>
              <div className="stat-label">Successful</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.failedPayments}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.pendingPayments}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${stats.averageTransaction.toFixed(2)}</div>
              <div className="stat-label">Average</div>
            </div>
          </div>
        </div>
      )}

      <div className="content-section">
        <div className="transactions-panel">
          <div className="panel-header">
            <h3 className="panel-title">Transactions ({transactions.length})</h3>
          </div>

          <div className="transactions-list">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className={`txn-item ${selectedTxn?.id === txn.id ? 'selected' : ''}`}
                onClick={() => setSelectedTxn(txn)}
              >
                <div className="txn-email">{txn.userEmail}</div>
                <div className="txn-meta">
                  <span className={`status-badge status-${txn.status}`}>
                    {txn.status}
                  </span>
                  <span>${txn.amount.toFixed(2)}</span>
                  <span>{new Date(txn.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="details-panel">
          {selectedTxn ? (
            <>
              <div className="details-header">
                <h2 className="details-title">{selectedTxn.userEmail}</h2>
                <p className="details-subtitle">Transaction ID: {selectedTxn.id}</p>
              </div>

              <div className="detail-section">
                <h4 className="section-title">Payment Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Amount:</span>
                    <span className="detail-value">${selectedTxn.amount.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${selectedTxn.status}`}>
                      {selectedTxn.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payment Method:</span>
                    <span className="detail-value">{selectedTxn.paymentMethod}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{new Date(selectedTxn.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">User ID:</span>
                    <span className="detail-value">{selectedTxn.userId}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h3>Select a Transaction</h3>
              <p>Click on a transaction to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
