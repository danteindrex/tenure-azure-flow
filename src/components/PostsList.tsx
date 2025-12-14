import React from 'react'
import { useCMSPosts, CMSPost } from '../hooks/useCMSPosts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { CalendarIcon, ArrowRightIcon } from 'lucide-react'

interface PostsListProps {
  limit?: number
  showPagination?: boolean
}

export function PostsList({ limit = 6, showPagination = false }: PostsListProps) {
  const { posts, loading, error, pagination } = useCMSPosts(limit)

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: limit }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg" />
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Failed to load posts: {error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No posts available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      {showPagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button variant="outline" disabled={!pagination.hasPrevPage}>
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page 1 of {pagination.totalPages}
          </span>
          <Button variant="outline" disabled={!pagination.hasNextPage}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function PostCard({ post }: { post: CMSPost }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      {post.featuredImage && (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            News
          </Badge>
          {post.publishedAt && (
            <div className="flex items-center text-xs text-gray-500">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {formatDate(post.publishedAt)}
            </div>
          )}
        </div>
        <CardTitle className="text-lg leading-tight group-hover:text-blue-600 transition-colors">
          {post.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {post.excerpt && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}
        
        <Button variant="ghost" size="sm" className="p-0 h-auto font-medium">
          Read More
          <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  )
}