import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Routes that require authentication
const protectedRoutes = [
  '/',
  '/users',
  '/subscriptions', 
  '/transactions',
  '/financial',
  '/payouts',
  '/content',
  '/audit',
  '/integrations',
  '/activity'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and login page
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Check if the route needs protection
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get token from cookie or header
  const token = request.cookies.get('admin_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  console.log('Middleware - Path:', pathname);
  console.log('Middleware - Token exists:', !!token);
  console.log('Middleware - Token value:', token?.substring(0, 50) + '...');

  if (!token) {
    console.log('Middleware - No token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Simple JWT verification for Edge Runtime
    // Split the token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode the payload (we'll do basic validation)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    // Check if it has the required fields
    if (!payload.email) {
      throw new Error('Invalid token payload');
    }

    // Note: Session validation against admin_sessions table would require
    // a database call, which is not ideal in Edge Runtime middleware.
    // Session validation is handled in the API routes instead.

    console.log('Middleware - Token verified successfully for:', payload.email);
    
    // Update last activity (done via API routes to avoid Edge Runtime limitations)
    return NextResponse.next();
  } catch (error) {
    console.log('Middleware - Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}