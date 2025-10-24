'use client'
import React, { useEffect, useState } from 'react'
import CollectionAnalytics from './CollectionAnalytics'

// Collection configurations with analytics
const COLLECTION_CONFIGS = {
  users: {
    name: 'Users',
    showAnalytics: true,
    primaryActions: ['View Profile', 'Edit Status', 'Send Message']
  },
  payment: {
    name: 'Payments',
    showAnalytics: true,
    primaryActions: ['Process Refund', 'View Details', 'Export Data']
  },
  subscription: {
    name: 'Subscriptions',
    showAnalytics: true,
    primaryActions: ['Change Plan', 'Cancel Subscription', 'View History']
  },
  queueEntries: {
    name: 'Queue Entries',
    showAnalytics: true,
    primaryActions: ['Update Position', 'Mark Eligible', 'Process Payout']
  },
  userAuditLogs: {
    name: 'User Audit Logs',
    showAnalytics: true,
    primaryActions: ['View Details', 'Export Logs', 'Filter by User']
  },
  disputes: {
    name: 'Disputes',
    showAnalytics: true,
    primaryActions: ['Respond to Dispute', 'Upload Evidence', 'Mark Resolved']
  },
  payoutManagement: {
    name: 'Payout Management',
    showAnalytics: true,
    primaryActions: ['Approve Payout', 'Schedule Payment', 'Review Eligibility']
  },
  kycVerification: {
    name: 'KYC Verification',
    showAnalytics: true,
    primaryActions: ['Review Documents', 'Approve KYC', 'Request More Info']
  },
  adminAlerts: {
    name: 'Admin Alerts',
    showAnalytics: true,
    primaryActions: ['Acknowledge Alert', 'Resolve Issue', 'Escalate']
  }
}

export const CollectionAnalyticsWrapper: React.FC = () => {
  // Prevent server-side rendering issues
  if (typeof window === 'undefined') {
    return null
  }

  const [currentCollection, setCurrentCollection] = useState<string | null>(null)

  useEffect(() => {
    const detectCollection = () => {
      const path = window.location.pathname
      const collectionMatch = path.match(/\/admin\/collections\/([^\/]+)/)
      
      if (collectionMatch) {
        const collection = collectionMatch[1]
        setCurrentCollection(collection)
      } else {
        setCurrentCollection(null)
      }
    }

    // Initial detection
    detectCollection()

    // Listen for navigation changes
    const observer = new MutationObserver(detectCollection)
    observer.observe(document.body, { childList: true, subtree: true })

    // Also listen for popstate (back/forward navigation)
    window.addEventListener('popstate', detectCollection)

    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', detectCollection)
    }
  }, [])

  useEffect(() => {
    if (!currentCollection) return

    // Add custom action buttons to collection pages
    const addCustomActions = () => {
      const config = COLLECTION_CONFIGS[currentCollection as keyof typeof COLLECTION_CONFIGS]
      if (!config || !config.primaryActions) return

      const actionsContainer = document.querySelector('.collection-actions') || 
                              document.querySelector('.doc-controls') ||
                              document.querySelector('.list-controls')

      if (actionsContainer && !document.getElementById(`custom-actions-${currentCollection}`)) {
        const actionsHTML = `
          <div id="custom-actions-${currentCollection}" style="display: flex; gap: 0.5rem; margin-left: 1rem;">
            ${config.primaryActions.map(action => `
              <button 
                class="custom-action-btn" 
                style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  padding: 0.5rem 1rem;
                  border-radius: 6px;
                  font-size: 0.875rem;
                  cursor: pointer;
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                onclick="handleCustomAction('${action}', '${currentCollection}')"
              >
                ${action}
              </button>
            `).join('')}
          </div>
        `

        actionsContainer.insertAdjacentHTML('beforeend', actionsHTML)

        // Add global action handler if not exists
        if (!(window as any).handleCustomAction) {
          (window as any).handleCustomAction = (action: string, collection: string) => {
            console.log(`Executing ${action} for ${collection}`)
            // Here you would implement the actual action logic
            alert(`${action} functionality would be implemented here for ${collection}`)
          }
        }
      }
    }

    setTimeout(addCustomActions, 500)

    const observer = new MutationObserver(() => {
      if (!document.getElementById(`custom-actions-${currentCollection}`)) {
        setTimeout(addCustomActions, 100)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [currentCollection])

  if (!currentCollection) return null

  const config = COLLECTION_CONFIGS[currentCollection as keyof typeof COLLECTION_CONFIGS]
  if (!config || !config.showAnalytics) return null

  return (
    <CollectionAnalytics 
      collectionSlug={currentCollection} 
      collectionName={config.name}
    />
  )
}

export default CollectionAnalyticsWrapper