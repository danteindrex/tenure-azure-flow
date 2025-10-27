'use client'

import React from 'react'
import { getFeatureFlags } from '@/config/features'

interface NavSection {
  title: string
  description: string
  href: string
  enabled: boolean
}

export default function AdminNavigation() {
  const features = getFeatureFlags()

  const navSections: NavSection[] = [
    {
      title: 'Dashboard',
      description: 'Main admin dashboard',
      href: '/admin',
      enabled: true,
    },
    {
      title: 'User Management',
      description: 'Comprehensive user dashboard',
      href: '/admin/user-management',
      enabled: features.core.users,
    },
    {
      title: 'Compliance Center',
      description: 'KYC verification and AML monitoring',
      href: '/admin/compliance-center',
      enabled: features.core.users,
    },
    {
      title: 'Payments Center',
      description: 'Transaction management and analytics',
      href: '/admin/payments-center',
      enabled: features.core.users,
    },
  ]

  const enabledSections = navSections.filter((section) => section.enabled)

  if (enabledSections.length === 0) {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {enabledSections.map((section) => (
        <a
          key={section.href}
          href={section.href}
          className="block px-3 py-2 text-sm hover:no-underline"
          style={{ backgroundColor: 'transparent', display: 'block' }}
        >
          {section.title}
        </a>
      ))}
    </div>
  )
}