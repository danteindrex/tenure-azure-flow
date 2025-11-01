import { auth } from '../../../lib/auth'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create a proper Request object with full URL
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers.host || 'localhost:3000'
    const url = `${protocol}://${host}${req.url}`
    
    const request = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    })
    
    const response = await auth.handler(request)
    
    // Convert Web API Response to Next.js response
    if (response instanceof Response) {
      const body = await response.text()
      
      // Copy headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
      
      // Set status and send body
      res.status(response.status).send(body)
    } else {
      res.status(500).json({ error: 'Invalid response from auth handler' })
    }
  } catch (error) {
    console.error('Auth handler error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}