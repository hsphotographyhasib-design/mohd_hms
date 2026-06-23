import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware that adds security and cache control headers.
 * - Prevents browser caching of all responses
 * - Adds security headers
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache control — prevent browser caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'ALLOWALL');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};