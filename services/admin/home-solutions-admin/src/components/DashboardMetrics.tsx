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
          
          <div class="charts-section">
            <div class="chart-container">
              <h3>User Growth (Last 7 Days)</h3>
              <div class="bar-chart">
                <div class="bar" style="height: 60%" data-value="340"><span>Mon</span></div>
                <div class="bar" style="height: 80%" data-value="450"><span>Tue</span></div>
                <div class="bar" style="height: 45%" data-value="280"><span>Wed</span></div>
                <div class="bar" style="height: 90%" data-value="520"><span>Thu</span></div>
                <div class="bar" style="height: 70%" data-value="410"><span>Fri</span></div>
                <div class="bar" style="height: 55%" data-value="320"><span>Sat</span></div>
                <div class="bar" style="height: 40%" data-value="250"><span>Sun</span></div>
              </div>
            </div>
            
            <div class="chart-container">
              <h3>Revenue Trend</h3>
              <div class="line-chart">
                <svg width="100%" height="120" viewBox="0 0 300 120">
                  <polyline
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="2"
                    points="20,100 60,80 100,90 140,60 180,70 220,40 260,50"
                  />
                  <circle cx="20" cy="100" r="3" fill="#ffffff" />
                  <circle cx="60" cy="80" r="3" fill="#ffffff" />
                  <circle cx="100" cy="90" r="3" fill="#ffffff" />
                  <circle cx="140" cy="60" r="3" fill="#ffffff" />
                  <circle cx="180" cy="70" r="3" fill="#ffffff" />
                  <circle cx="220" cy="40" r="3" fill="#ffffff" />
                  <circle cx="260" cy="50" r="3" fill="#ffffff" />
                </svg>
              </div>
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

    // Add Dashboard navigation button
    const addDashboardButton = () => {
      const nav = document.querySelector('.nav')
      if (nav && !document.querySelector('.dashboard-nav-btn')) {
        const dashboardBtn = document.createElement('a')
        dashboardBtn.className = 'dashboard-nav-btn'
        dashboardBtn.textContent = 'Dashboard'
        dashboardBtn.href = '/admin'
        dashboardBtn.onclick = (e) => {
          e.preventDefault()
          window.location.href = '/admin'
        }
        
        // Insert at the beginning of nav
        nav.insertBefore(dashboardBtn, nav.firstChild)
      }
    }

    // Run after a short delay to ensure DOM is ready
    setTimeout(() => {
      injectMetrics()
      addDashboardButton()
    }, 500)
    
    // Also run when navigation changes
    const observer = new MutationObserver(() => {
      if (!document.getElementById('dashboard-metrics')) {
        setTimeout(injectMetrics, 100)
      }
      if (!document.querySelector('.dashboard-nav-btn')) {
        setTimeout(addDashboardButton, 100)
      }
    })
    
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => observer.disconnect()
  }, [])

  return null // This component doesn't render anything visible
}

export default DashboardMetrics