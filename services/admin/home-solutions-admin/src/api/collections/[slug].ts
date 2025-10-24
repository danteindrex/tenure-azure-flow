import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../payload.config'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const result = await payload.find({
      collection: params.slug,
      page,
      limit,
      sort: '-createdAt'
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error fetching ${params.slug}:`, error)
    return NextResponse.json(
      { error: `Failed to fetch ${params.slug}` },
      { status: 500 }
    )
  }
}