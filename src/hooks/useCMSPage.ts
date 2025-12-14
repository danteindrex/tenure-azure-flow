import { useState, useEffect } from 'react'

export interface CMSPageBlock {
  blockType: 'hero' | 'features' | 'cta'
  id: string
  [key: string]: any
}

export interface CMSPage {
  id: string
  title: string
  slug: string
  layout: CMSPageBlock[]
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export function useCMSPage(slug: string) {
  const [page, setPage] = useState<CMSPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPage() {
      if (!slug) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/cms/pages/${slug}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Page not found')
          }
          throw new Error('Failed to fetch page')
        }

        const data: CMSPage = await response.json()
        setPage(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPage()
  }, [slug])

  return { page, loading, error }
}