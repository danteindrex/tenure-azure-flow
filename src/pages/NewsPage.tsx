import React from 'react'
import { PostsList } from '../components/PostsList'
import { Button } from '../components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function NewsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              News & Updates
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stay informed with the latest announcements, updates, and insights from Home Solutions
            </p>
          </div>
        </div>

        {/* Posts List */}
        <PostsList limit={12} showPagination={true} />
      </div>
    </div>
  )
}