'use client'

import React, { useEffect, useState } from 'react'

interface ComplianceStats {
  totalKycApplications: number
  kycVerified: number
  kycPending: number
  kycRejected: number
  flaggedTransactions: number
  highRiskUsers: number
  auditLogsToday: number
  complianceScore: number
}

interface KycApplication {
  id: string
  userId: string
  userName: string
  userEmail: string
  status: 'pending' | 'in_review' | 'verified' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  riskScore: number
  documents: string[]
}

export default function ComplianceCenterClient() {
  const [stats, setStats] = useState<ComplianceStats | null>(null)
  const [applications, setApplications] = useState<KycApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<KycApplication | null>(null)

  useEffect(() => {
    fetchComplianceData()
  }, [])

  const fetchComplianceData = async () => {
    try {
      const response = await fetch('/api/metrics/compliance-center')
      if (!response.ok) throw new Error('Failed to fetch compliance data')

      const data = await response.json()
      setStats(data.stats)
      setApplications(data.applications)
    } catch (error) {
      console.error('Failed to fetch compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="compliance-page">
        <style jsx>{`
          .compliance-page {
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
            border-top: 4px solid #4299e1;
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
        <p>Loading compliance data...</p>
      </div>
    )
  }

  return (
    <div className="compliance-page">
      <style jsx>{`
        .compliance-page {
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
          border-bottom: 1px solid #262626;
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
        .applications-panel {
          background: #000000;
          border-bottom: 1px solid #262626;
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
        .applications-list {
          max-height: calc(100vh - 300px);
          overflow-y: auto;
        }
        .app-item {
          padding: 16px 24px;
          border-bottom: 1px solid #0f172a;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .app-item:hover {
          background-color: #1a1a1a;
        }
        .app-item.selected {
          background-color: #2d3748;
          border-left: 4px solid #4299e1;
        }
        .app-name {
          font-weight: 500;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .app-meta {
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
        .status-verified { background: #2d5016; color: #9ae6b4; }
        .status-pending { background: #744210; color: #fbd38d; }
        .status-in_review { background: #2c5282; color: #90cdf4; }
        .status-rejected { background: #63171b; color: #fc8181; }
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
          border-bottom: 1px solid #262626;
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
        <h1 className="page-title">Compliance Center</h1>
        <p className="page-subtitle">KYC verification, AML monitoring, and audit management</p>
      </div>

      {stats && (
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalKycApplications}</div>
              <div className="stat-label">Total KYC</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.kycVerified}</div>
              <div className="stat-label">Verified</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.kycPending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.kycRejected}</div>
              <div className="stat-label">Rejected</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.flaggedTransactions}</div>
              <div className="stat-label">Flagged</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.complianceScore.toFixed(1)}%</div>
              <div className="stat-label">Compliance Score</div>
            </div>
          </div>
        </div>
      )}

      <div className="content-section">
        <div className="applications-panel">
          <div className="panel-header">
            <h3 className="panel-title">KYC Applications ({applications.length})</h3>
          </div>

          <div className="applications-list">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`app-item ${selectedApp?.id === app.id ? 'selected' : ''}`}
                onClick={() => setSelectedApp(app)}
              >
                <div className="app-name">{app.userName}</div>
                <div className="app-meta">
                  <span className={`status-badge status-${app.status}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                  <span>Risk: {app.riskScore}</span>
                  <span>{new Date(app.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="details-panel">
          {selectedApp ? (
            <>
              <div className="details-header">
                <h2 className="details-title">{selectedApp.userName}</h2>
                <p className="details-subtitle">{selectedApp.userEmail}</p>
              </div>

              <div className="detail-section">
                <h4 className="section-title">Application Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value status-badge status-${selectedApp.status}`}>
                      {selectedApp.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Risk Score:</span>
                    <span className="detail-value">{selectedApp.riskScore}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Submitted:</span>
                    <span className="detail-value">{new Date(selectedApp.submittedAt).toLocaleString()}</span>
                  </div>
                  {selectedApp.reviewedAt && (
                    <div className="detail-item">
                      <span className="detail-label">Reviewed:</span>
                      <span className="detail-value">{new Date(selectedApp.reviewedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h4 className="section-title">Submitted Documents</h4>
                <div className="detail-grid">
                  {selectedApp.documents.map((doc, index) => (
                    <div key={index} className="detail-item">
                      <span className="detail-value">{doc.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h3>Select an Application</h3>
              <p>Click on a KYC application to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
