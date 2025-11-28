/**
 * Admin Logout API
 *
 * POST /api/admin/logout
 *
 * Clears the admin session
 */

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Clear the admin cookie
  res.setHeader('Set-Cookie', [
    `admin_dev_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  ])

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  })
}
