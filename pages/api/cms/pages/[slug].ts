import { NextApiRequest, NextApiResponse } from 'next'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3002'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { slug } = req.query

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' })
  }

  try {
    const response = await fetch(
      `${CMS_URL}/api/pages?where[slug][equals]=${slug}&where[status][equals]=published&limit=1`,
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
    
    if (!data.docs || data.docs.length === 0) {
      return res.status(404).json({ error: 'Page not found' })
    }

    res.status(200).json(data.docs[0])
  } catch (error) {
    console.error('Error fetching page:', error)
    res.status(500).json({ 
      error: 'Failed to fetch page',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}