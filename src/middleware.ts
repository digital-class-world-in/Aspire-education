// middleware.ts  (must be in project root or src/)

import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files, API, Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||          // .png, .js, .ico, etc.
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

}

export const config = {
  matcher: [
    // Apply to all pages except static & api
    '/((?!_next/static|_next/image|api|favicon.ico).*)',
  ],
}
