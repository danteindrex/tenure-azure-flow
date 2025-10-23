'use client'
import React, { useEffect } from 'react'

export const DashboardMetrics: React.FC = () => {
  useEffect(() => {
    // Mock data for now - we'll make it dynamic later
    const stats = {
      users: { total: 2847, growth: '+12.5' },
      subscriptions: { total: 1234, growth: '+8.2' },
      revenue: { total: 45600, growth: '+15.3' },
      queue: { total: 156, growth: '0' },
      recentActivity: [
        { message: 'New user registered', time: '2 minutes ago' },
        { message: 'Payment of $299 processed', time: '5 minutes ago' },
        { message: 'Subscription activated', time: '12 minutes ago' },
        { message: 'Queue entry processed', time: '18 minutes ago' },
        { message: 'System backup completed', time: '1 hour ago' }
      ]
    }
    
    // Inject metrics into the existing default dashboard
    const injectMetrics = () => {
      const dashboard = document.querySelector('.dashboard')
      if (dashboard && !document.getElementById('dashboard-metrics')) {
        const metricsHTML = `
          <div id="dashboard-metrics">
            <div class="metric-card">
              <div class="metric-title">Total Users</div>
              <div class="metric-value">${stats.users.total.toLocaleString()}</div>
              <div class="metric-growth positive">
                ${stats.users.growth}% this month
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Active Subscriptions</div>
              <div class="metric-value">${stats.subscriptions.total.toLocaleString()}</div>
              <div class="metric-growth positive">
                ${stats.subscriptions.growth}% this month
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Total Revenue</div>
              <div class="metric-value">$${stats.revenue.total.toLocaleString()}</div>
              <div class="metric-growth positive">
                ${stats.revenue.growth}% this month
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-title">Queue Entries</div>
              <div class="metric-value">${stats.queue.total.toLocaleString()}</div>
              <div class="metric-growth">Pending processing</div>
            </div>
          </div>
          
          <div class="activity-feed">
            <h3>Recent Activity</h3>
            ${stats.recentActivity.map(activity => `
              <div class="activity-item">
                <div class="activity-message">${activity.message}</div>
                <div class="activity-time">${activity.time}</div>
              </div>
            `).join('')}
          </div>
        `
        
        // Insert metrics ABOVE the existing collections grid
        const firstChild = dashboard.firstElementChild
        if (firstChild) {
          firstChild.insertAdjacentHTML('beforebegin', metricsHTML)
        } else {
          dashboard.insertAdjacentHTML('afterbegin', metricsHTML)
        }
      }
    }

    // Run after a short delay to ensure DOM is ready
    setTimeout(injectMetrics, 500)
    
    // Also run when navigation changes
    const observer = new MutationObserver(() => {
      if (!document.getElementById('dashboard-metrics')) {
        setTimeout(injectMetrics, 100)
      }
    })
    
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => observer.disconnect()
  }, [])

  return null // This component doesn't render anything visible
}

export default DashboardMetrics