/**
 * Admin Authentication Utilities
 *
 * Simple authentication for the developer admin panel.
 * Uses environment variables for credentials.
 *
 * Set these in your .env file:
 * ADMIN_DEV_USERNAME=admin
 * ADMIN_DEV_PASSWORD=your-secure-password
 */

import { NextApiRequest, NextApiResponse } from 'next'

const ADMIN_USERNAME = process.env.ADMIN_DEV_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_DEV_PASSWORD || 'dev-admin-2024'
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'dev-session-secret-change-in-production'

/**
 * Simple token-based auth for admin
 */
export function generateAdminToken(): string {
  const payload = {
    role: 'dev_admin',
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = Buffer.from(`${encoded}.${ADMIN_SESSION_SECRET}`).toString('base64').slice(0, 32)
  return `${encoded}.${signature}`
}

/**
 * Validate admin token
 */
export function validateAdminToken(token: string): boolean {
  try {
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) return false

    const expectedSignature = Buffer.from(`${encoded}.${ADMIN_SESSION_SECRET}`).toString('base64').slice(0, 32)
    if (signature !== expectedSignature) return false

    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'))
    if (payload.exp < Date.now()) return false
    if (payload.role !== 'dev_admin') return false

    return true
  } catch {
    return false
  }
}

/**
 * Validate admin credentials
 */
export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
}

/**
 * Middleware to protect admin API routes
 */
export function withAdminAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization
    const cookieToken = req.cookies['admin_dev_token']

    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token || !validateAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return handler(req, res)
  }
}

/**
 * Check if request is authenticated as admin
 */
export function isAdminAuthenticated(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization
  const cookieToken = req.cookies['admin_dev_token']
  const token = authHeader?.replace('Bearer ', '') || cookieToken
  return token ? validateAdminToken(token) : false
}
