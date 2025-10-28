import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterAuth } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get session from Better Auth
  const session = await betterAuth.api.getSession({
    headers: req.headers,
  });

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (session && (pathname === "/login" || pathname === "/signup" || pathname === "/reset-password")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/reset-password",
  ],
};