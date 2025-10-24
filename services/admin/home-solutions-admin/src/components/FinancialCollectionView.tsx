'use client'
import React, { useEffect, useState } from 'react'

interface CollectionData {
  docs: any[]
  totalDocs: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface FinancialCollectionViewProps {
  collectionSlug: string
  collectionName: string
}

export const FinancialCollectionView: React.FC = () => {
  if (typeof window === 'undefined') return null

  const [data, setData] = useState<CollectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [collectionSlug, setCollectionSlug] = useState<string>('')
  const [collectionName, setCollectionName] = useState<string>('')

  // Detect current collection from URL
  useEffect(() => {
    const detectCollection = () => {
      const path = window.location.pathname
      const match = path.match(/\/admin\/collections\/([^\/]+)/)
      
      if (match) {
        const slug = match[1]
        setCollectionSlug(slug)
        
        // Map collection slugs to display names
        const nameMap: Record<string, string> = {
          users: 'Users',
          payment: 'Payments',
          subscription: 'Subscriptions',
          queueEntries: 'Queue Entries',
          kycVerification: 'KYC Verification',
          adminAlerts: 'System Alerts',
          disputes: 'Disputes',
          payoutManagement: 'Payout Management',
          userAuditLogs: 'User Audit Logs'
        }
        
        setCollectionName(nameMap[slug] || slug)
      }
    }

    detectCollection()
    
    // Listen for navigation changes
    const observer = new MutationObserver(detectCollection)
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!collectionSlug) return

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/collections/${collectionSlug}?page=${page}&limit=20`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error(`Failed to fetch ${collectionSlug} data:`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [collectionSlug, page])

  useEffect(() => {
    if (loading || !data || !collectionSlug) return

    const injectCollectionView = () => {
      const collectionContainer = document.querySelector('.collection-list') || 
                                 document.querySelector('.list-controls')?.parentElement

      if (collectionContainer && !document.getElementById(`financial-${collectionSlug}`)) {
        const tableHTML = `
          <style>
            .financial-collection-view {
              background: #000000;
              color: #ffffff;
              padding: 2rem;
              margin: -2rem;
            }

            .collection-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 2rem;
              padding-bottom: 1rem;
              border-bottom: 1px solid #262626;
            }

            .collection-title {
              font-size: 1.5rem;
              font-weight: 600;
              color: #ffffff;
              margin: 0;
            }

            .collection-stats {
              font-size: 0.875rem;
              color: #a3a3a3;
            }

            .financial-table {
              background: #0f0f0f;
              border: 1px solid #262626;
              border-radius: 4px;
              overflow: hidden;
            }

            .table-header {
              background: #1a1a1a;
              display: grid;
              padding: 1rem;
              border-bottom: 1px solid #262626;
              font-weight: 600;
              font-size: 0.875rem;
              color: #ffffff;
            }

            .table-body {
              max-height: 600px;
              overflow-y: auto;
            }

            .table-row {
              display: grid;
              padding: 1rem;
              border-bottom: 1px solid #1a1a1a;
              font-size: 0.875rem;
              transition: background-color 0.2s ease;
            }

            .table-row:hover {
              background: #1a1a1a;
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
              text-align: center;
            }

            .status-badge {
              padding: 0.25rem 0.5rem;
              border-radius: 2px;
              font-size: 0.75rem;
              font-weight: 500;
              text-transform: uppercase;
            }

            .status-active, .status-succeeded, .status-verified {
              background: #22c55e;
              color: #000000;
            }

            .status-failed, .status-rejected {
              background: #ef4444;
              color: #ffffff;
            }

            .status-pending, .status-inactive {
              background: #f59e0b;
              color: #000000;
            }

            .pagination {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 1rem;
              padding: 1rem;
              background: #0f0f0f;
              border: 1px solid #262626;
              border-radius: 4px;
            }

            .pagination-info {
              font-size: 0.875rem;
              color: #a3a3a3;
            }

            .pagination-controls {
              display: flex;
              gap: 0.5rem;
            }

            .pagination-btn {
              padding: 0.5rem 1rem;
              background: #262626;
              border: 1px solid #404040;
              border-radius: 2px;
              color: #ffffff;
              font-size: 0.875rem;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .pagination-btn:hover:not(:disabled) {
              background: #404040;
            }

            .pagination-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          </style>

          <div id="financial-${collectionSlug}" class="financial-collection-view">
            <div class="collection-header">
              <h1 class="collection-title">${collectionName}</h1>
              <div class="collection-stats">
                ${data.totalDocs.toLocaleString()} total records
              </div>
            </div>

            <div class="financial-table">
              ${getTableHeader(collectionSlug)}
              <div class="table-body">
                ${data.docs.map(doc => getTableRow(collectionSlug, doc)).join('')}
              </div>
            </div>

            <div class="pagination">
              <div class="pagination-info">
                Page ${page} • ${data.docs.length} of ${data.totalDocs} records
              </div>
              <div class="pagination-controls">
                <button 
                  class="pagination-btn" 
                  ${!data.hasPrevPage ? 'disabled' : ''}
                  onclick="changePage(${page - 1})"
                >
                  Previous
                </button>
                <button 
                  class="pagination-btn" 
                  ${!data.hasNextPage ? 'disabled' : ''}
                  onclick="changePage(${page + 1})"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        `

        collectionContainer.innerHTML = tableHTML

        // Add pagination handler
        ;(window as any).changePage = (newPage: number) => {
          setPage(newPage)
        }
      }
    }

    setTimeout(injectCollectionView, 100)
  }, [loading, data, collectionSlug, collectionName, page])

  return null
}

function getTableHeader(collectionSlug: string): string {
  const headers: Record<string, string> = {
    users: 'grid-template-columns: 2fr 1fr 1fr 1fr 1fr;"><div class="table-cell">Email</div><div class="table-cell">Status</div><div class="table-cell">Verified</div><div class="table-cell">Created</div><div class="table-cell">Actions</div>',
    payment: 'grid-template-columns: 2fr 1fr 1fr 1fr 1fr;"><div class="table-cell">User</div><div class="table-cell amount">Amount</div><div class="table-cell status">Status</div><div class="table-cell">Method</div><div class="table-cell">Date</div>',
    subscription: 'grid-template-columns: 2fr 1fr 1fr 1fr 1fr;"><div class="table-cell">User</div><div class="table-cell">Plan</div><div class="table-cell status">Status</div><div class="table-cell amount">Amount</div><div class="table-cell">Next Billing</div>',
    queueEntries: 'grid-template-columns: 2fr 1fr 1fr 1fr 1fr;"><div class="table-cell">User</div><div class="table-cell">Position</div><div class="table-cell status">Status</div><div class="table-cell">Joined</div><div class="table-cell">Eligible Date</div>',
    kycVerification: 'grid-template-columns: 2fr 1fr 1fr 1fr 1fr;"><div class="table-cell">User</div><div class="table-cell">Document Type</div><div class="table-cell status">Status</div><div class="table-cell">Risk Score</div><div class="table-cell">Verified Date</div>',
    adminAlerts: 'grid-template-columns: 3fr 1fr 1fr 1fr;"><div class="table-cell">Message</div><div class="table-cell">Severity</div><div class="table-cell status">Status</div><div class="table-cell">Created</div>',
    disputes: 'grid-template-columns: 2fr 1fr 1fr 1fr 1fr;"><div class="table-cell">User</div><div class="table-cell amount">Amount</div><div class="table-cell">Type</div><div class="table-cell status">Status</div><div class="table-cell">Respond By</div>'
  }

  return `<div class="table-header" style="${headers[collectionSlug] || 'grid-template-columns: repeat(5, 1fr);"><div class="table-cell">ID</div><div class="table-cell">Data</div><div class="table-cell">Status</div><div class="table-cell">Created</div><div class="table-cell">Actions</div>'}`
}

function getTableRow(collectionSlug: string, doc: any): string {
  const formatDate = (date: string) => new Date(date).toLocaleDateString()
  const formatAmount = (amount: number) => `$${(amount / 100).toFixed(2)}`

  switch (collectionSlug) {
    case 'users':
      return `
        <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr;">
          <div class="table-cell">${doc.email || 'N/A'}</div>
          <div class="table-cell status">
            <span class="status-badge status-${(doc.status || 'pending').toLowerCase()}">${doc.status || 'Pending'}</span>
          </div>
          <div class="table-cell">${doc.email_verified ? 'Yes' : 'No'}</div>
          <div class="table-cell secondary">${formatDate(doc.createdAt)}</div>
          <div class="table-cell">View Profile</div>
        </div>
      `
    case 'payment':
      return `
        <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr;">
          <div class="table-cell">${doc.user?.email || doc.user_id || 'N/A'}</div>
          <div class="table-cell amount">${formatAmount(doc.amount || 0)}</div>
          <div class="table-cell status">
            <span class="status-badge status-${(doc.status || 'pending').toLowerCase()}">${doc.status || 'Pending'}</span>
          </div>
          <div class="table-cell">${doc.payment_method || 'N/A'}</div>
          <div class="table-cell secondary">${formatDate(doc.createdAt)}</div>
        </div>
      `
    case 'queueEntries':
      return `
        <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr;">
          <div class="table-cell">${doc.user?.email || doc.user_id || 'N/A'}</div>
          <div class="table-cell">${doc.position || 'N/A'}</div>
          <div class="table-cell status">
            <span class="status-badge status-${(doc.status || 'pending').toLowerCase()}">${doc.status || 'Pending'}</span>
          </div>
          <div class="table-cell secondary">${formatDate(doc.createdAt)}</div>
          <div class="table-cell secondary">${doc.eligible_date ? formatDate(doc.eligible_date) : 'N/A'}</div>
        </div>
      `
    case 'kycVerification':
      return `
        <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr;">
          <div class="table-cell">${doc.user?.email || doc.user_id || 'N/A'}</div>
          <div class="table-cell">${doc.document_type || 'N/A'}</div>
          <div class="table-cell status">
            <span class="status-badge status-${(doc.status || 'pending').toLowerCase()}">${doc.status || 'Pending'}</span>
          </div>
          <div class="table-cell">${doc.risk_score || 'N/A'}</div>
          <div class="table-cell secondary">${doc.verified_at ? formatDate(doc.verified_at) : 'N/A'}</div>
        </div>
      `
    case 'adminAlerts':
      return `
        <div class="table-row" style="grid-template-columns: 3fr 1fr 1fr 1fr;">
          <div class="table-cell">${doc.title || doc.message || 'N/A'}</div>
          <div class="table-cell">
            <span class="status-badge status-${(doc.severity || 'info').toLowerCase()}">${doc.severity || 'Info'}</span>
          </div>
          <div class="table-cell status">
            <span class="status-badge status-${(doc.status || 'new').toLowerCase()}">${doc.status || 'New'}</span>
          </div>
          <div class="table-cell secondary">${formatDate(doc.createdAt)}</div>
        </div>
      `
    default:
      return `
        <div class="table-row" style="grid-template-columns: repeat(5, 1fr);">
          <div class="table-cell">${doc.id}</div>
          <div class="table-cell">${JSON.stringify(doc).substring(0, 50)}...</div>
          <div class="table-cell">${doc.status || 'N/A'}</div>
          <div class="table-cell secondary">${formatDate(doc.createdAt)}</div>
          <div class="table-cell">View</div>
        </div>
      `
  }
}

export default FinancialCollectionView