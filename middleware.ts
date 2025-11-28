/**
 * Next.js Middleware for Dynamic Routing
 *
 * This middleware handles session validation AND onboarding routing.
 * It calls the internal /api/onboarding/status endpoint which queries
 * the database for dynamic routing rules configured by admin.
 *
 * DATABASE AGNOSTIC: Works with any database (Supabase, Neon, PostgreSQL, etc.)
 * because the actual DB query happens in the API route, not in Edge runtime.
 *
 * Flow:
 * 1. Check if route is static/API (skip middleware)
 * 2. Check if route is public (allow)
 * 3. Validate session cookie exists
 * 4. Call /api/onboarding/status to get user's current step
 * 5. Redirect to correct route based on dynamic rules
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that are always public (no auth check needed)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/reset-password/confirm',
  '/auth/callback',
  '/admin/login',
]

// Routes that should skip middleware entirely
const SKIP_MIDDLEWARE = [
  '/_next',
  '/api',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/_vercel',
]

// Routes where we should check onboarding status and potentially redirect
const PROTECTED_ROUTES = [
  '/dashboard',
  '/settings',
]

/**
 * Check if a path matches any pattern in the list
 */
function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1))
    }
    return pathname === pattern || pathname.startsWith(pattern + '/')
  })
}

/**
 * Check if request has a valid session cookie
 */
function hasSessionCookie(request: NextRequest): boolean {
  const sessionCookies = [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
  ]
  return sessionCookies.some(name => request.cookies.has(name))
}

/**
 * Check if request has admin session cookie
 */
function hasAdminCookie(request: NextRequest): boolean {
  return request.cookies.has('admin_dev_token')
}

/**
 * Get the session cookie value
 */
function getSessionCookie(request: NextRequest): string | undefined {
  const sessionCookies = [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
  ]
  for (const name of sessionCookies) {
    const cookie = request.cookies.get(name)
    if (cookie) return cookie.value
  }
  return undefined
}

/**
 * Call the onboarding status API to get user's routing info
 * This keeps all database logic in the API route (database agnostic)
 */
async function getOnboardingStatus(request: NextRequest): Promise<{
  success: boolean
  status?: {
    nextRoute: string
    canAccessDashboard: boolean
    step: string
  }
  error?: string
} | null> {
  try {
    // Build the API URL
    const url = new URL('/api/onboarding/status', request.url)

    // Forward cookies to the API
    const cookieHeader = request.headers.get('cookie') || ''

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json',
      },
      // Don't cache this request
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Not authenticated' }
      }
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Middleware: Error fetching onboarding status:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    SKIP_MIDDLEWARE.some(prefix => pathname.startsWith(prefix)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Allow public routes without auth
  if (matchesPattern(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next()
  }

  // Admin routes - check admin cookie
  if (pathname.startsWith('/admin')) {
    if (!hasAdminCookie(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  // Protected routes - check session cookie first
  if (!hasSessionCookie(request)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For protected routes (dashboard, settings), check onboarding status
  if (matchesPattern(pathname, PROTECTED_ROUTES)) {
    const result = await getOnboardingStatus(request)

    // If API call failed or user not authenticated, let the page handle it
    if (!result || !result.success) {
      // If explicitly not authenticated, redirect to login
      if (result?.error === 'Not authenticated') {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
      // Otherwise let request through - page will handle errors
      return NextResponse.next()
    }

    const { status } = result

    // If user can't access dashboard and they're trying to access protected route
    if (status && !status.canAccessDashboard) {
      // Don't redirect if they're already on the correct route
      const nextRoute = status.nextRoute

      // Handle query params in route (like /signup?step=3)
      const nextPathname = nextRoute.split('?')[0]
      const currentPathname = pathname

      // If they're not on the right page, redirect them
      if (currentPathname !== nextPathname && !currentPathname.startsWith(nextPathname)) {
        return NextResponse.redirect(new URL(nextRoute, request.url))
      }
    }
  }

  // For signup routes, redirect completed users to dashboard
  if (pathname === '/signup' || pathname.startsWith('/signup?')) {
    const result = await getOnboardingStatus(request)

    if (result?.success && result.status?.canAccessDashboard) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Session exists and routing checks passed - allow request
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
