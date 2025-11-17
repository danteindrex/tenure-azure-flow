import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../payload.config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const result = await payload.find({
      collection: slug as any,
      page,
      limit,
      sort: '-createdAt'
    })

    return NextResponse.json(result)
  } catch (error) {
    const { slug } = await params
    console.error(`Error fetching ${slug}:`, error)
    return NextResponse.json(
      { error: `Failed to fetch ${slug}` },
      { status: 500 }
    )
  }
}