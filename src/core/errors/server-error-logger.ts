/**
 * Server-side error logging utility.
 *
 * Use in API route catch blocks to log errors directly to the ErrorLog table.
 * This is the server-side counterpart to the client-side `logErrorToServer()`.
 *
 * Usage:
 *   import { logServerError } from '@/core/errors/server-error-logger';
 *   try { ... } catch (error) {
 *     logServerError(error, { module: 'auth', endpoint: '/api/auth/login', method: 'POST' });
 *     return NextResponse.json({ error: 'Login failed' }, { status: 500 });
 *   }
 */

import { db } from '@/core/database/db';
import {
  generateErrorRef,
  categorizeError,
  extractErrorCode,
  extractHttpStatus,
  detectModule,
  type ErrorCategoryType,
} from './error-service';

export interface ServerLogErrorOptions {
  /** Override auto-detected category */
  category?: ErrorCategoryType;
  /** Module name (auto-detected from endpoint if not provided) */
  module?: string;
  /** API endpoint path */
  endpoint?: string;
  /** HTTP method */
  method?: string;
  /** Request duration in ms */
  duration?: number;
  /** Tenant ID (required for multi-tenant isolation) */
  tenantId?: string;
  /** User ID who made the request */
  userId?: string;
  /** User name */
  userName?: string;
  /** User role */
  userRole?: string;
  /** Client IP */
  ip?: string;
  /** Request body (truncated) */
  requestBody?: unknown;
  /** Response body / error response (truncated) */
  responseBody?: unknown;
  /** Pre-generated Error Reference ID */
  errorRef?: string;
  /** Pre-generated Request ID */
  requestId?: string;
}

/**
 * Log an error to the ErrorLog table from server-side code.
 * Fire-and-forget: errors in logging itself are swallowed.
 */
export async function logServerError(
  error: unknown,
  opts: ServerLogErrorOptions = {},
): Promise<string> {
  const errorRef = opts.errorRef || generateErrorRef();

  const truncate = (val: unknown, max: number) =>
    typeof val === 'string' ? val.substring(0, max) : val;

  const category: ErrorCategoryType =
    opts.category ||
    categorizeError(error, { endpoint: opts.endpoint, method: opts.method });

  const errorCode = extractErrorCode(error);
  const httpStatus = extractHttpStatus(error);
  const detectedModule = opts.module || detectModule(opts.endpoint);

  const message = error instanceof Error
    ? error.message.substring(0, 2000)
    : typeof error === 'string'
      ? error.substring(0, 2000)
      : String(error).substring(0, 2000);

  const stackTrace = error instanceof Error
    ? error.stack?.substring(0, 10000)
    : undefined;

  try {
    await db.errorLog.create({
      data: {
        id: crypto.randomUUID(),
        errorRef,
        tenantId: opts.tenantId || null,
        userId: opts.userId || null,
        userName: truncate(opts.userName, 200) || null,
        userRole: truncate(opts.userRole, 50) || null,
        category,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorCode: truncate(errorCode, 50) || null,
        message: message || 'Unknown error',
        module: truncate(detectedModule, 100) || null,
        apiEndpoint: truncate(opts.endpoint, 500) || null,
        httpMethod: truncate(opts.method, 10) || null,
        httpStatus: typeof httpStatus === 'number' ? httpStatus : null,
        duration: typeof opts.duration === 'number' ? opts.duration : null,
        requestBody: truncate(opts.requestBody, 5000) || null,
        responseBody: truncate(opts.responseBody, 5000) || null,
        stackTrace: stackTrace || null,
        ip: truncate(opts.ip, 45) || null,
      },
    });
  } catch (loggingError) {
    // Swallow — logging must never cause cascading failures
    console.error('[logServerError] Failed to log error:', loggingError);
  }

  return errorRef;
}

/**
 * Extract tenantId and userId from a NextRequest's authorization header.
 * Returns { tenantId, userId, role } or nulls if not authenticated.
 */
export function extractAuthFromRequest(request: Request): {
  tenantId: string | null;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
} {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { tenantId: null, userId: null, userName: null, userRole: null };
    }

    // Dynamic import to avoid circular dependency at module level
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyToken } = require('@/core/auth/auth-lib');
    const payload = verifyToken(authHeader.replace('Bearer ', ''));

    if (!payload) {
      return { tenantId: null, userId: null, userName: null, userRole: null };
    }

    return {
      tenantId: (payload.tenantId as string) || null,
      userId: (payload.userId as string) || null,
      userName: (payload.name as string) || null,
      userRole: (payload.role as string) || null,
    };
  } catch {
    return { tenantId: null, userId: null, userName: null, userRole: null };
  }
}