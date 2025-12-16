import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// const inter = Inter({ 
//   subsets: ['latin'],
//   display: 'swap',
//   fallback: ['system-ui', 'arial']
// })

export const metadata: Metadata = {
  title: 'TenurE Admin - Membership Management System',
  description: 'Comprehensive admin dashboard for managing memberships, financial reports, payouts, and member engagement',
  authors: [{ name: 'TenurE' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}