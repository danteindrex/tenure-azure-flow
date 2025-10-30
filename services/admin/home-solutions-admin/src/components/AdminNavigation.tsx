'use client'

import React from 'react'
import { getFeatureFlags } from '@/config/features'

interface NavSection {
  title: string
  description: string
  href: string
  enabled: boolean
  icon: string
}

// SVG Icon Component
const Icon = ({ name, size = 16 }: { name: string; size?: number }) => {
  const icons: Record<string, JSX.Element> = {
    mail: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    megaphone: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 14v-3z"/>
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    'bar-chart': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10"/>
        <line x1="18" y1="20" x2="18" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="16"/>
      </svg>
    ),
    globe: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    'file-text': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
    key: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    ),
    link: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  }

  return icons[name] || <div style={{ width: size, height: size }} />
}

export default function AdminNavigation() {
  const features = getFeatureFlags()
  const [currentPath, setCurrentPath] = React.useState('')

  React.useEffect(() => {
    setCurrentPath(window.location.pathname)
  }, [])

  const navSections: NavSection[] = [
    {
      title: 'Emails',
      description: 'Email management and campaigns',
      href: '/admin',
      enabled: true,
      icon: 'mail',
    },
    {
      title: 'Broadcasts',
      description: 'Broadcast messages and notifications',
      href: '/admin/broadcasts',
      enabled: features.core.users,
      icon: 'megaphone',
    },
    {
      title: 'Audiences',
      description: 'User segments and targeting',
      href: '/admin/audiences',
      enabled: features.core.users,
      icon: 'users',
    },
    {
      title: 'Metrics',
      description: 'Analytics and performance metrics',
      href: '/admin/metrics',
      enabled: features.core.users,
      icon: 'bar-chart',
    },
    {
      title: 'Domains',
      description: 'Domain management and configuration',
      href: '/admin/domains',
      enabled: features.core.users,
      icon: 'globe',
    },
    {
      title: 'Logs',
      description: 'System logs and audit trails',
      href: '/admin/logs',
      enabled: features.core.users,
      icon: 'file-text',
    },
    {
      title: 'API Keys',
      description: 'API key management',
      href: '/admin/api-keys',
      enabled: features.core.users,
      icon: 'key',
    },
    {
      title: 'Webhooks',
      description: 'Webhook configuration and monitoring',
      href: '/admin/webhooks',
      enabled: features.core.users,
      icon: 'link',
    },
    {
      title: 'Settings',
      description: 'System settings and configuration',
      href: '/admin/settings',
      enabled: features.core.users,
      icon: 'settings',
    },
  ]

  const enabledSections = navSections.filter((section) => section.enabled)

  if (enabledSections.length === 0) {
    return null
  }

  return (
    <div className="admin-sidebar-nav">
      {/* User Profile Section */}
      <div className="admin-user-profile">
        <div className="admin-user-avatar">
          <span className="admin-user-initial">C</span>
        </div>
        <div className="admin-user-info">
          <div className="admin-username">christwesignepaul23</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="admin-nav-links">
        {enabledSections.map((section) => {
          const isActive = currentPath === section.href || 
            (section.href !== '/admin' && currentPath.startsWith(section.href))
          
          return (
            <a
              key={section.href}
              href={section.href}
              className={`admin-nav-link ${isActive ? 'active' : ''}`}
              title={section.description}
            >
              <span className="admin-nav-icon">
                <Icon name={section.icon} size={16} />
              </span>
              <span className="admin-nav-text">{section.title}</span>
            </a>
          )
        })}
      </nav>

      {/* Bottom User Info */}
      <div className="admin-bottom-user">
        <div className="admin-user-avatar-small">
          <span className="admin-user-initial-small">C</span>
        </div>
        <span className="admin-username-small">christwesignepaul...</span>
      </div>
    </div>
  )
}