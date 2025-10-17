import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

// GET /api/news - Public endpoint to fetch published news posts
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    // Fetch published news posts
    const result = await payload.find({
      collection: 'newsfeedpost',
      where: {
        status: {
          equals: 'Published',
        },
        publish_date: {
          less_than_equal: new Date().toISOString(),
        },
      },
      sort: '-publish_date',
      limit,
      page,
    })

    return NextResponse.json({
      success: true,
      data: result.docs,
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      page: result.page,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    })
  } catch (error) {
    console.error('Error fetching news posts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch news posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
