'use client'
import React, { useEffect, useState } from 'react'

interface UserDetailData {
  profile: {
    fullName: string
    phoneNumber: string
    address: string
  }
  financial: {
    totalPayments: number
    paymentCount: number
    lastPaymentDate: string
    paymentHistory: Array<{
      date: string
      amount: number
      status: string
    }>
  }
  subscription: {
    status: string
    provider: string
    currentPeriodStart: string
    currentPeriodEnd: string
  }
  queue: {
    position: number
    status: string
    isEligible: boolean
    joinedDate: string
  }
  kyc: {
    status: string
    verifiedAt: string
  }
}

interface UserDetailViewProps {
  userId: string
}

const UserDetailView: React.FC<UserDetailViewProps> = ({ userId }) => {
  const [data, setData] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/metrics/user-details/${userId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch user details')
        }
        const userData = await response.json()
        setData(userData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchUserDetails()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="user-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading user details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-detail-error">
        <p>Error loading user details: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="user-detail-empty">
        <p>No user details available</p>
      </div>
    )
  }

  return (
    <div className="user-detail-view">
      <style jsx>{`
        .user-detail-view {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
        }
        .detail-section {
          background: white;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 8px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        .detail-label {
          font-weight: 500;
          color: #666;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .detail-value {
          color: #333;
          font-size: 16px;
        }
        .payment-history {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 8px;
        }
        .payment-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #f1f3f4;
        }
        .payment-item:last-child {
          border-bottom: none;
        }
        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .status-active { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-succeeded { background: #d1ecf1; color: #0c5460; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .user-detail-loading, .user-detail-error, .user-detail-empty {
          text-align: center;
          padding: 40px;
          color: #666;
        }
      `}</style>

      <div className="detail-section">
        <h3 className="section-title">👤 Profile Information</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Full Name</span>
            <span className="detail-value">{data.profile.fullName || 'Not provided'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Phone Number</span>
            <span className="detail-value">{data.profile.phoneNumber || 'Not provided'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Address</span>
            <span className="detail-value">{data.profile.address || 'Not provided'}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3 className="section-title">💰 Financial Summary</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Total Payments</span>
            <span className="detail-value">${data.financial.totalPayments.toFixed(2)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Payment Count</span>
            <span className="detail-value">{data.financial.paymentCount}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Payment</span>
            <span className="detail-value">{data.financial.lastPaymentDate || 'No payments'}</span>
          </div>
        </div>
        
        {data.financial.paymentHistory.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <span className="detail-label">Recent Payment History</span>
            <div className="payment-history">
              {data.financial.paymentHistory.map((payment, index) => (
                <div key={index} className="payment-item">
                  <span>{payment.date}</span>
                  <span>${payment.amount.toFixed(2)}</span>
                  <span className={`status-badge status-${payment.status.toLowerCase()}`}>
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3 className="section-title">📋 Subscription & Queue</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Subscription Status</span>
            <span className={`detail-value status-badge status-${data.subscription.status.toLowerCase()}`}>
              {data.subscription.status}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Queue Position</span>
            <span className="detail-value">{data.queue.position || 'Not in queue'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Queue Status</span>
            <span className={`detail-value status-badge status-${data.queue.status.toLowerCase()}`}>
              {data.queue.status}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Eligible</span>
            <span className="detail-value">{data.queue.isEligible ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3 className="section-title">🔐 Verification & Compliance</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">KYC Status</span>
            <span className={`detail-value status-badge status-${data.kyc.status.toLowerCase()}`}>
              {data.kyc.status}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">KYC Verified At</span>
            <span className="detail-value">{data.kyc.verifiedAt || 'Not verified'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDetailView