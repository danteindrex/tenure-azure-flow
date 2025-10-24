'use client'
import React, { useEffect, useState } from 'react'

interface UserData {
  id: string
  email: string
  status: string
  email_verified: boolean
  created_at: string
  profile?: {
    fullName: string
    phoneNumber: string
  }
  financial?: {
    totalPayments: number
    paymentCount: number
    lastPaymentDate: string
  }
  queue?: {
    position: number
    status: string
  }
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  pendingUsers: number
  totalRevenue: number
  averagePayments: number
}

const UserManagementDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Fetch users and stats in parallel
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

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/metrics/user-details/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user details')
      
      const details = await response.json()
      
      // Find the user and update with detailed info
      const user = users.find(u => u.id === userId)
      if (user) {
        setSelectedUser({
          ...user,
          profile: details.profile,
          financial: details.financial,
          queue: details.queue
        })
      }
    } catch (err) {
      console.error('Error fetching user details:', err)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="user-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading user management dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-management-error">
        <h3>Error Loading User Management</h3>
        <p>{error}</p>
        <button onClick={fetchUserData} className="retry-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="user-management-dashboard">
      <style jsx>{`
        .user-management-dashboard {
          padding: 24px;
          background: #f8f9fa;
          border-radius: 12px;
          margin: 24px 0;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .dashboard-title {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 14px;
          color: #7f8c8d;
          font-weight: 500;
        }
        .user-section {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
          margin-top: 24px;
        }
        .users-list {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .list-header {
          padding: 20px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .list-title {
          font-size: 20px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0;
        }
        .search-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          width: 200px;
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
        }
        .users-table th {
          background: #f8f9fa;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 1px solid #e9ecef;
        }
        .users-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f3f4;
        }
        .user-row {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .user-row:hover {
          background-color: #f8f9fa;
        }
        .user-row.selected {
          background-color: #e3f2fd;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .status-active { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-inactive { background: #f8d7da; color: #721c24; }
        .status-suspended { background: #f8d7da; color: #721c24; }
        .user-details {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 20px;
        }
        .details-header {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e9ecef;
        }
        .detail-section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #495057;
          margin-bottom: 8px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 14px;
        }
        .detail-label {
          color: #6c757d;
          font-weight: 500;
        }
        .detail-value {
          color: #2c3e50;
        }
        .no-selection {
          text-align: center;
          color: #6c757d;
          padding: 40px;
        }
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
        .user-management-loading, .user-management-error {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        .retry-button {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 16px;
        }
        .retry-button:hover {
          background: #0056b3;
        }
      `}</style>

      <div className="dashboard-header">
        <h2 className="dashboard-title">👥 User Management Dashboard</h2>
      </div>

      {stats && (
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
      )}

      <div className="user-section">
        <div className="users-list">
          <div className="list-header">
            <h3 className="list-title">Users ({filteredUsers.length})</h3>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`user-row ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  onClick={() => fetchUserDetails(user.id)}
                >
                  <td>{user.email}</td>
                  <td>
                    <span className={`status-badge status-${user.status.toLowerCase()}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.email_verified ? '✅' : '❌'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="user-details">
          {selectedUser ? (
            <>
              <div className="details-header">
                User Details: {selectedUser.email}
              </div>
              
              <div className="detail-section">
                <div className="section-title">📧 Account Information</div>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedUser.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value status-badge status-${selectedUser.status.toLowerCase()}`}>
                    {selectedUser.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Verified:</span>
                  <span className="detail-value">{selectedUser.email_verified ? 'Yes' : 'No'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Joined:</span>
                  <span className="detail-value">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {selectedUser.profile && (
                <div className="detail-section">
                  <div className="section-title">👤 Profile</div>
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedUser.profile.fullName || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedUser.profile.phoneNumber || 'Not provided'}</span>
                  </div>
                </div>
              )}

              {selectedUser.financial && (
                <div className="detail-section">
                  <div className="section-title">💰 Financial</div>
                  <div className="detail-item">
                    <span className="detail-label">Total Payments:</span>
                    <span className="detail-value">${selectedUser.financial.totalPayments.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payment Count:</span>
                    <span className="detail-value">{selectedUser.financial.paymentCount}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Payment:</span>
                    <span className="detail-value">{selectedUser.financial.lastPaymentDate || 'No payments'}</span>
                  </div>
                </div>
              )}

              {selectedUser.queue && (
                <div className="detail-section">
                  <div className="section-title">📋 Queue Status</div>
                  <div className="detail-item">
                    <span className="detail-label">Position:</span>
                    <span className="detail-value">{selectedUser.queue.position || 'Not in queue'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{selectedUser.queue.status}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Select a user from the list to view detailed information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagementDashboard