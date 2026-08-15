import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware that adds security and cache control headers.
 * Blocks dangerous debug/setup endpoints in production.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache control — prevent browser caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Block dangerous debug/setup/irms endpoints in production
  if (process.env.NODE_ENV === 'production') {
    const blockedPaths = [
      '/api/debug/',
      '/api/setup/',
      '/api/auth/seed-admin',
      '/api/irms/seed',
      '/api/irms/ai',
      '/api/db/',
    ];
    const path = request.nextUrl.pathname;
    if (blockedPaths.some(p => path.startsWith(p))) {
      return new NextResponse(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

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
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf|eot)$).*)',
  ],
};