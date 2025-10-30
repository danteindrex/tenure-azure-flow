import { auth } from '../../../../lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { NextRequest, NextResponse } from 'next/server'

const handler = toNextJsHandler(auth)

// Add CORS headers to all auth requests
const addCorsHeaders = (request: NextRequest, response: Response) => {
  const newResponse = new NextResponse(response.body, response)

  // Allow your Vercel deployment and localhost
  const allowedOrigins = [
    'https://home-solutions-eta.vercel.app',
    'http://localhost:3000',
    'http://localhost:3337'
  ]

  const origin = request.headers.get('origin')

  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    newResponse.headers.set('Access-Control-Allow-Origin', origin || '*')
  } else {
    // In production, check the origin
    if (origin && allowedOrigins.includes(origin)) {
      newResponse.headers.set('Access-Control-Allow-Origin', origin)
    }
  }

  newResponse.headers.set('Access-Control-Allow-Credentials', 'true')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

  return newResponse
}

export async function GET(request: NextRequest) {
  const response = await handler.GET(request)
  return addCorsHeaders(request, response)
}

export async function POST(request: NextRequest) {
  const response = await handler.POST(request)
  return addCorsHeaders(request, response)
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    }
  })
}