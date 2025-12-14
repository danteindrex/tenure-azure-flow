import { useState, useEffect } from 'react'

export interface CMSPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: any // Rich text content
  featuredImage?: {
    url: string
    alt?: string
  }
  status: 'draft' | 'published'
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CMSPostsResponse {
  docs: CMSPost[]
  totalDocs: number
  limit: number
  page: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function useCMSPosts(limit = 10, page = 1) {
  const [posts, setPosts] = useState<CMSPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    totalDocs: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/cms/posts?limit=${limit}&page=${page}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }

        const data: CMSPostsResponse = await response.json()
        
        setPosts(data.docs)
        setPagination({
          totalDocs: data.totalDocs,
          totalPages: data.totalPages,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [limit, page])

  return { posts, loading, error, pagination }
}