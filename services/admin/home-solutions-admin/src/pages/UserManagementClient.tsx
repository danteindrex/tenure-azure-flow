'use client'
import React, { useEffect, useState } from 'react'

interface UserData {
  id: string
  email: string
  status: string
  email_verified: boolean
  created_at: string
}

interface UserDetails {
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

interface UserStats {
  totalUsers: number
  activeUsers: number
  pendingUsers: number
  totalRevenue: number
  averagePayments: number
}

const UserManagementClient: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      const [usersResponse, statsResponse] = await Promise.all([
        fetch('/api/metrics/user-management'),
        fetch('/api/metrics/user-stats')
      ])

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch user data')
      }

      const usersData = await usersResponse.json()
      const statsData = await statsResponse.json()

      setUsers(usersData.users || [])
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetails = async (user: UserData) => {
    try {
      setDetailsLoading(true)
      setSelectedUser(user)
      setUserDetails(null)

      const response = await fetch(`/api/metrics/user-details/${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch user details')
      
      const details = await response.json()
      setUserDetails(details)
    } catch (err) {
      console.error('Error fetching user details:', err)
      setError('Failed to load user details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="user-management-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading user management...</p>
        </div>
      </div>
    )
  }

  if (error && !users.length) {
    return (
      <div className="user-management-page">
        <div className="error-container">
          <h3>Error Loading User Management</h3>
          <p>{error}</p>
          <button onClick={fetchUserData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="user-management-page">
      <style jsx>{`
        .user-management-page {
          padding: 0;
          background: #000000;
          min-height: 100vh;
        }
        .page-header {
          background: #111111;
          border-bottom: 1px solid #334155;
          padding: 24px 32px;
          margin-bottom: 0;
        }
        .page-title {
          font-size: 32px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          color: #94a3b8;
          font-size: 16px;
          margin: 0;
        }
        .stats-section {
          background: #111111;
          border-bottom: 1px solid #334155;
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
          border-bottom: 1px solid #334155;
          border-radius: 8px;
          background: #000000;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
        }
        .content-section {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 0;
          min-height: calc(100vh - 200px);
        }
        .users-panel {
          background: #111111;
          border-bottom: 1px solid #334155;
        }
        .panel-header {
          padding: 20px 24px;
          border-bottom: 1px solid #334155;
          background: #000000;
        }
        .panel-title {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 12px 0;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #334155;
          border-radius: 6px;
          font-size: 14px;
          background: #000000;
          color: #f1f5f9;
        }
        .users-list {
          max-height: calc(100vh - 300px);
          overflow-y: auto;
        }
        .user-item {
          padding: 16px 24px;
          border-bottom: 1px solid #0f172a;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .user-item:hover {
          background-color: #000000;
        }
        .user-item.selected {
          background-color: #2d3748;
          border-left: 4px solid #4299e1;
        }
        .user-email {
          font-weight: 500;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .user-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #94a3b8;
        }
        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .status-active { background: #2d5016; color: #9ae6b4; }
        .status-pending { background: #744210; color: #fbd38d; }
        .status-inactive { background: #63171b; color: #fc8181; }
        .status-suspended { background: #63171b; color: #fc8181; }
        .details-panel {
          background: #111111;
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
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
        }
        .detail-section {
          margin-bottom: 24px;
          padding: 16px;
          border-bottom: 1px solid #334155;
          border-radius: 8px;
          background: #000000;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
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
          color: #94a3b8;
          font-weight: 500;
        }
        .detail-value {
          color: #f1f5f9;
          font-weight: 400;
        }
        .payment-history {
          max-height: 150px;
          overflow-y: auto;
          border-bottom: 1px solid #334155;
          border-radius: 4px;
          background: #000000;
        }
        .payment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #0f172a;
          font-size: 13px;
          color: #f1f5f9;
        }
        .payment-item:last-child {
          border-bottom: none;
        }
        .no-selection {
          text-align: center;
          color: #94a3b8;
          padding: 60px 20px;
        }
        .loading-container, .error-container {
          text-align: center;
          padding: 60px;
          color: #94a3b8;
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
        .retry-button {
          padding: 8px 16px;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 16px;
        }
        .retry-button:hover {
          background: #3182ce;
        }
        .details-loading {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Comprehensive user information and management</p>
      </div>

      {stats && (
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeUsers}</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.pendingUsers}</div>
              <div className="stat-label">Pending Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${stats.totalRevenue.toFixed(0)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.averagePayments.toFixed(1)}</div>
              <div className="stat-label">Avg Payments/User</div>
            </div>
          </div>
        </div>
      )}

      <div className="content-section">
        <div className="users-panel">
          <div className="panel-header">
            <h3 className="panel-title">Users ({filteredUsers.length})</h3>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="users-list">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                onClick={() => fetchUserDetails(user)}
              >
                <div className="user-email">{user.email}</div>
                <div className="user-meta">
                  <span className={`status-badge status-${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                  <span>{user.email_verified ? 'Verified' : 'Unverified'}</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="details-panel">
          {selectedUser ? (
            <>
              <div className="details-header">
                <h2 className="details-title">{selectedUser.email}</h2>
                <p className="details-subtitle">User ID: {selectedUser.id}</p>
              </div>

              {detailsLoading ? (
                <div className="details-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading user details...</p>
                </div>
              ) : userDetails ? (
                <>
                  <div className="detail-section">
                    <h4 className="section-title">Account Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className={`detail-value status-badge status-${selectedUser.status.toLowerCase()}`}>
                          {selectedUser.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Email Verified:</span>
                        <span className="detail-value">{selectedUser.email_verified ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Joined:</span>
                        <span className="detail-value">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4 className="section-title">Profile Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Full Name:</span>
                        <span className="detail-value">{userDetails.profile.fullName || 'Not provided'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Phone Number:</span>
                        <span className="detail-value">{userDetails.profile.phoneNumber || 'Not provided'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Address:</span>
                        <span className="detail-value">{userDetails.profile.address || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4 className="section-title">Financial Summary</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Total Payments:</span>
                        <span className="detail-value">${userDetails.financial.totalPayments.toFixed(2)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Payment Count:</span>
                        <span className="detail-value">{userDetails.financial.paymentCount}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Last Payment:</span>
                        <span className="detail-value">{userDetails.financial.lastPaymentDate || 'No payments'}</span>
                      </div>
                    </div>
                    
                    {userDetails.financial.paymentHistory.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div className="detail-label" style={{ marginBottom: '8px' }}>Recent Payments:</div>
                        <div className="payment-history">
                          {userDetails.financial.paymentHistory.map((payment, index) => (
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
                    <h4 className="section-title">Subscription & Queue</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Subscription:</span>
                        <span className={`detail-value status-badge status-${userDetails.subscription.status.toLowerCase().replace(' ', '-')}`}>
                          {userDetails.subscription.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Queue Position:</span>
                        <span className="detail-value">{userDetails.queue.position || 'Not in queue'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Queue Status:</span>
                        <span className="detail-value">{userDetails.queue.status}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Eligible:</span>
                        <span className="detail-value">{userDetails.queue.isEligible ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4 className="section-title">Verification & Compliance</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">KYC Status:</span>
                        <span className={`detail-value status-badge status-${userDetails.kyc.status.toLowerCase().replace(' ', '-')}`}>
                          {userDetails.kyc.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">KYC Verified:</span>
                        <span className="detail-value">{userDetails.kyc.verifiedAt || 'Not verified'}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="details-loading">
                  <p>Failed to load user details</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <h3>Select a User</h3>
              <p>Click on a user from the list to view their detailed information including profile, financial data, queue status, and compliance details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagementClient