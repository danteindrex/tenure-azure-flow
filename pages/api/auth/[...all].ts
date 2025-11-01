import { auth } from '../../../lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import type { NextApiRequest, NextApiResponse } from 'next'

const handlers = toNextJsHandler(auth)

// Wrap the handlers to satisfy Next.js API route type
export default async function authHandler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method?.toUpperCase()

  if (method === 'GET' && handlers.GET) {
    return handlers.GET(req as any)
  } else if (method === 'POST' && handlers.POST) {
    return handlers.POST(req as any)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export const config = {
  api: {
    bodyParser: false,
  },
}