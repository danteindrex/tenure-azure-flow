/**
 * Admin Login API
 *
 * POST /api/admin/login
 * Body: { username: string, password: string }
 *
 * Returns a token for admin authentication
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { validateAdminCredentials, generateAdminToken } from '@/lib/admin-auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    if (!validateAdminCredentials(username, password)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateAdminToken()

    // Set cookie for browser-based auth
    res.setHeader('Set-Cookie', [
      `admin_dev_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${24 * 60 * 60}`,
    ])

    return res.status(200).json({
      success: true,
      token,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
