/**
 * API Route Authentication & Authorization Middleware
 *
 * MOHD.HMS ENTERPRISE — Centralized RBAC guard for Next.js API routes.
 *
 * Usage in any API route handler:
 *
 *   import { verifyRouteAuth } from '@/core/middleware/api-auth';
 *
 *   export async function GET(request: NextRequest) {
 *     const auth = verifyRouteAuth(request, { feature: 'hr' });
 *     if (auth.error) return auth.error;
 *     // auth.userId, auth.tenantId, auth.role are now safe to use
 *   }
 *
 * For action-level checks:
 *
 *   const auth = verifyRouteAuth(request, { feature: 'complaints', action: 'delete', entity: 'complaint' });
 *   if (auth.error) return auth.error;
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/core/auth/auth-lib';
import { FEATURE_PERMISSIONS, ACTION_PERMISSIONS, canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

// ── Result types ──────────────────────────────────────────────────────────────

export interface AuthSuccess {
  ok: true;
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
  /** Never set on success — lets `if (auth.error)` narrow the union. */
  error?: undefined;
}

export interface AuthFailure {
  ok: false;
  error: NextResponse;
  /** Never set on failure — lets the success branch expose these after narrowing. */
  userId?: undefined;
  tenantId?: undefined;
  role?: undefined;
  email?: undefined;
}

export type AuthResult = AuthSuccess | AuthFailure;

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Verify authentication and check feature/action permissions.
 *
 * @param request  - The Next.js request object
 * @param options  - Optional permission requirements
 *   - feature: string       — Feature name (maps to FEATURE_PERMISSIONS)
 *   - entity: string        — Entity name for action check (e.g., 'complaint')
 *   - action: string        — Action name (e.g., 'delete')
 *   - roles: UserRole[]     — Explicit role list (alternative to feature)
 *
 * @returns AuthResult — check `.ok` before using. If false, return `.error`.
 */
export function verifyRouteAuth(
  request: NextRequest,
  options?: {
    feature?: string;
    entity?: string;
    action?: string;
    roles?: UserRole[];
  }
): AuthResult {
  // 1. Extract and verify JWT
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const payload = verifyToken(token);

  if (!payload) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing authentication token' },
        { status: 401 }
      ),
    };
  }

  const { userId, tenantId, role, email } = payload;

  if (!userId || !tenantId || !role) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Token payload is incomplete' },
        { status: 401 }
      ),
    };
  }

  const normalizedRole = (role as string).toLowerCase() as UserRole;

  // Runtime role validation — reject unrecognized roles
  const VALID_ROLES = new Set<string>(['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'hr', 'user', 'customer', 'vendor', 'guest']);
  if (!VALID_ROLES.has(normalizedRole)) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'Forbidden', message: 'Unrecognized user role' },
        { status: 403 }
      ),
    };
  }

  // 2. Check explicit roles if provided
  if (options?.roles && options.roles.length > 0) {
    if (!options.roles.includes(normalizedRole)) {
      logAccessDenied(request, normalizedRole, 'explicit_roles', userId);
      return {
        ok: false,
        error: NextResponse.json(
          { error: 'Forbidden', message: 'You do not have permission to access this resource' },
          { status: 403 }
        ),
      };
    }
  }

  // 3. Check feature permission if provided
  if (options?.feature) {
    const allowedRoles = FEATURE_PERMISSIONS[options.feature];
    if (!allowedRoles || !allowedRoles.includes(normalizedRole)) {
      logAccessDenied(request, normalizedRole, `feature:${options.feature}`, userId);
      return {
        ok: false,
        error: NextResponse.json(
          { error: 'Forbidden', message: 'You do not have permission to access this resource' },
          { status: 403 }
        ),
      };
    }
  }

  // 4. Check action-level permission if provided
  if (options?.entity && options?.action) {
    if (!canPerformAction(normalizedRole, options.entity, options.action)) {
      logAccessDenied(request, normalizedRole, `${options.entity}.${options.action}`, userId);
      return {
        ok: false,
        error: NextResponse.json(
          { error: 'Forbidden', message: 'You do not have permission to perform this action' },
          { status: 403 }
        ),
      };
    }
  }

  return {
    ok: true,
    userId: userId as string,
    tenantId: tenantId as string,
    role: normalizedRole,
    email: email as string | undefined,
  };
}

// ── Convenience: auth-only (no role check) ─────────────────────────────────────

/**
 * Verify authentication only (no role/feature check).
 * Any authenticated user passes.
 */
export function verifyAuthOnly(request: NextRequest): AuthResult {
  return verifyRouteAuth(request);
}

// ── Audit logging (fire-and-forget) ────────────────────────────────────────────

function extractIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function logAccessDenied(request: NextRequest, role: string, resource: string, userId: string): void {
  // Fire-and-forget — don't block the response
  (async () => {
    try {
      const { db } = await import('@/core/database/db');
      const ip = extractIp(request);
      const path = request.nextUrl.pathname;

      await db.auditLog.create({
        data: {
          tenantId: '__system__',
          userId,
          action: 'ACCESS_DENIED',
          entity: 'RBAC',
          entityId: path,
          newValue: JSON.stringify({ role, resource, ip, path, timestamp: new Date().toISOString() }),
        },
      });
    } catch {
      // Silently fail — audit logging should never break the response
    }
  })();
}

// ── Re-export for convenience ─────────────────────────────────────────────────

export { canPerformAction, FEATURE_PERMISSIONS, ACTION_PERMISSIONS } from '@/core/permissions/rbac/permissions-matrix';