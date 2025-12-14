import { NextApiRequest, NextApiResponse } from 'next'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3002'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { limit = '10', page = '1', status = 'published' } = req.query

    const response = await fetch(
      `${CMS_URL}/api/posts?limit=${limit}&page=${page}&where[status][equals]=${status}&sort=-publishedAt`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`CMS API error: ${response.status}`)
    }

    const data = await response.json()
    
    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching posts:', error)
    res.status(500).json({ 
      error: 'Failed to fetch posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}