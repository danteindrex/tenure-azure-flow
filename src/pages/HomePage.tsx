import React from 'react'
import { useCMSPage } from '../hooks/useCMSPage'
import { PageRenderer } from '../components/cms/PageRenderer'
import { PostsList } from '../components/PostsList'
import { Button } from '../components/ui/button'

export function HomePage() {
  const { page, loading, error } = useCMSPage('home')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading homepage...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Home Solutions</h1>
          <p className="text-xl text-gray-600 mb-8">Your trusted partner for home services</p>
          <p className="text-red-600 mb-4">CMS Error: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!page) {
    // Fallback homepage if no CMS page is found
    return (
      <div className="min-h-screen">
        {/* Default Hero Section */}
        <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to Home Solutions
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your trusted partner for comprehensive home services and solutions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/signup">Get Started</a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/login">Sign In</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Latest News Section */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Latest News & Updates
              </h2>
              <p className="text-xl text-gray-600">
                Stay informed with our latest announcements and insights
              </p>
            </div>
            <PostsList limit={6} />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageRenderer page={page} />
      
      {/* Always include latest news section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Latest News & Updates
            </h2>
            <p className="text-xl text-gray-600">
              Stay informed with our latest announcements and insights
            </p>
          </div>
          <PostsList limit={6} />
        </div>
      </section>
    </div>
  )
}