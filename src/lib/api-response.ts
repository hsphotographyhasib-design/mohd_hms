import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import type { JwtPayload } from 'jsonwebtoken';

// ============ Structured Error Codes ============
export const ErrorCode = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FIELD: 'INVALID_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',

  // Database
  DB_ERROR: 'DB_ERROR',
  DB_CONSTRAINT: 'DB_CONSTRAINT',

  // External
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============ Structured Error Interface ============
export interface ApiErrorShape {
  success: false;
  error: {
    code: ErrorCodeType;
    message: string;
    field?: string;
    details?: unknown;
  };
}

export interface ApiSuccessShape<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

// ============ ApiError Class ============
export class ApiError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly field?: string;
  public readonly details?: unknown;

  constructor(
    code: ErrorCodeType,
    message: string,
    statusCode: number = 500,
    field?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    this.details = details;
  }

  toResponse(): NextResponse<ApiErrorShape> {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: this.code,
          message: this.message,
          ...(this.field && { field: this.field }),
          ...(this.details !== undefined && { details: this.details }),
        },
      },
      { status: this.statusCode },
    );
  }

  // Convenience factory methods
  static unauthorized(message = 'Authentication required') {
    return new ApiError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(resource = 'Resource', id?: string) {
    const msg = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
    return new ApiError(ErrorCode.NOT_FOUND, msg, 404);
  }

  static validation(message: string, field?: string) {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, 400, field);
  }

  static missingField(field: string) {
    return new ApiError(ErrorCode.MISSING_FIELD, `${field} is required`, 400, field);
  }

  static invalidField(field: string, reason?: string) {
    const msg = reason ? `Invalid ${field}: ${reason}` : `Invalid ${field}`;
    return new ApiError(ErrorCode.INVALID_FIELD, msg, 400, field);
  }

  static conflict(message: string) {
    return new ApiError(ErrorCode.CONFLICT, message, 409);
  }

  static internal(message = 'Internal server error', details?: unknown) {
    return new ApiError(ErrorCode.INTERNAL_ERROR, message, 500, undefined, details);
  }

  static dbError(message = 'Database operation failed', details?: unknown) {
    return new ApiError(ErrorCode.DB_ERROR, message, 500, undefined, details);
  }

  static serviceUnavailable(message = 'Service unavailable') {
    return new ApiError(ErrorCode.SERVICE_UNAVAILABLE, message, 503);
  }
}

// ============ Response Helpers ============
export function apiSuccess<T>(
  data: T,
  message?: string,
  statusCode: number = 200,
): NextResponse<ApiSuccessShape<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status: statusCode },
  );
}

export function apiError(
  code: ErrorCodeType,
  message: string,
  statusCode: number = 500,
  field?: string,
  details?: unknown,
): NextResponse<ApiErrorShape> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(field && { field }),
        ...(details !== undefined && { details }),
      },
    },
    { status: statusCode },
  );
}

// ============ Auth Helpers ============
export interface AuthResult {
  token: string;
  payload: JwtPayload;
}

/**
 * Extract and verify JWT from request.
 * Returns null if auth fails (caller returns 401).
 */
export function getAuth(request: Request): AuthResult | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '');

  // Fallback to cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)cmms_token=([^;]*)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return { token, payload };
}

/**
 * Require authentication. Returns AuthResult or throws ApiError.
 * Usage: const { payload } = requireAuth(request);
 */
export function requireAuth(request: Request): AuthResult {
  const result = getAuth(request);
  if (!result) throw ApiError.unauthorized();
  return result;
}

/**
 * Require specific role(s). Throws if user doesn't have the role.
 * Usage: const { payload } = requireRole(request, 'admin', 'super_admin');
 */
export function requireRole(request: Request, ...roles: string[]): AuthResult {
  const result = requireAuth(request);
  const userRole = result.payload.role as string | undefined;
  if (!userRole || !roles.includes(userRole)) {
    throw ApiError.forbidden(`Required role: ${roles.join(' or ')}`);
  }
  return result;
}

/**
 * Safe handler wrapper that catches ApiError and unknown errors.
 * Usage: export const GET = safeHandler(async (req) => { ... });
 */
export function safeHandler<T>(
  handler: (request: Request, context?: Record<string, unknown>) => T | Promise<T>,
) {
  return async (
    request: Request,
    context?: Record<string, unknown>,
  ): Promise<NextResponse> => {
    try {
      const result = await handler(request, context);
      if (result instanceof NextResponse) return result;
      return apiSuccess(result);
    } catch (error) {
      if (error instanceof ApiError) {
        return error.toResponse();
      }

      // Handle Prisma unique constraint violations
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string; meta?: { target?: string[] } };
        if (prismaError.code === 'P2002') {
          const field = prismaError.meta?.target?.join(', ') || 'field';
          return apiError(ErrorCode.CONFLICT, `A record with this ${field} already exists`, 409, field);
        }
        if (prismaError.code === 'P2025') {
          return apiError(ErrorCode.NOT_FOUND, 'Record not found', 404);
        }
        if (prismaError.code === 'P2003') {
          const field = prismaError.meta?.target?.join(', ') || 'related field';
          return apiError(ErrorCode.VALIDATION_ERROR, `Related ${field} not found`, 400, field);
        }
      }

      // Unknown errors
      console.error('[API] Unhandled error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return apiError(ErrorCode.INTERNAL_ERROR, message, 500);
    }
  };
}