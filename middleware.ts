import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware temporarily disabled due to Edge Runtime compatibility issues
// The Better Auth integration with database operations doesn't work in Edge Runtime
// TODO: Implement client-side auth protection or use a different approach

export async function middleware(req: NextRequest) {
  // Middleware is disabled - just pass through all requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Temporarily disable all middleware matching to avoid Edge Runtime issues
    // "/dashboard/:path*",
    // "/login", 
    // "/signup",
    // "/reset-password",
  ],
};