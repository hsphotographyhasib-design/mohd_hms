/**
 * API Route Error Logging Wrapper
 *
 * Wraps API route handlers (GET, POST, PUT, DELETE, PATCH) with automatic
 * error logging to the ErrorLog table. This ensures ALL unhandled API errors
 * are captured in the Errors tab without modifying every route individually.
 *
 * Usage — simple (auto-detects module from URL):
 *   export const GET = withErrorLogging(async (req: NextRequest) => { ... });
 *
 * Usage — with options:
 *   export const POST = withErrorLogging(
 *     async (req: NextRequest) => { ... },
 *     { module: 'auth', category: 'authentication' }
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { logServerError, extractAuthFromRequest } from './server-error-logger';
import type { ErrorCategoryType } from './error-service';

export interface WithErrorLoggingOptions {
  /** Override auto-detected module name */
  module?: string;
  /** Override auto-detected error category */
  category?: ErrorCategoryType;
}

/**
 * Wraps an API route handler with automatic error logging.
 *
 * - Extracts auth info from the request for contextual logging
 * - Auto-detects module from the URL path
 * - Logs the error to the ErrorLog table before returning the error response
 * - If the handler throws, returns a 500 JSON response
 *
 * Uses `any` for the handler type to be compatible with Next.js 16 route
 * handler signatures which have `params: Promise<{ id: string }>` etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorLogging(handler: any, opts: WithErrorLoggingOptions = {}): any {
  return async (req: NextRequest, context: any) => {
    try {
      return await handler(req, context);
    } catch (error: unknown) {
      // Extract auth context from request
      const auth = extractAuthFromRequest(req);

      // Determine endpoint info
      const url = req.url;
      const method = req.method;
      const detectedModule = opts.module || url.split('/api/')[1]?.split('/')[0] || 'unknown';

      // Log the error (fire-and-forget — don't block the error response)
      logServerError(error, {
        ...opts,
        module: detectedModule,
        endpoint: url,
        method,
        tenantId: auth.tenantId || undefined,
        userId: auth.userId || undefined,
        userName: auth.userName || undefined,
        userRole: auth.userRole || undefined,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
      }).catch(() => {});

      // If the error is already a Response (e.g. NextResponse.redirect), return it directly
      if (error instanceof Response) {
        return error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const status = (error as { status?: number })?.status || 500;

      return new NextResponse(
        JSON.stringify({ error: message || 'Internal server error' }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  };
}